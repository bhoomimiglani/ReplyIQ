const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const { getOrCreateCollection } = require('../config/vectorStore');
const { generateEmbeddingsBatch, smartChunkText } = require('./embeddingService');
const KnowledgeBase = require('../models/KnowledgeBase');
const Tenant = require('../models/Tenant');
const logger = require('../utils/logger');

/**
 * Extract text from PDF file
 */
const extractPdfText = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
};

/**
 * Extract text from plain text file
 */
const extractTextFile = (filePath) => {
  return fs.readFileSync(filePath, 'utf-8');
};

/**
 * Scrape text from URL
 */
const scrapeUrl = async (url) => {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SupportAI/1.0; +https://supportai.com/bot)'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Remove script, style, nav, footer elements
    $('script, style, nav, footer, header, .nav, .footer, .header, .sidebar, .advertisement, .ads').remove();
    
    // Get main content
    let text = '';
    const mainContent = $('main, article, .content, .main-content, #content, #main').first();
    
    if (mainContent.length > 0) {
      text = mainContent.text();
    } else {
      text = $('body').text();
    }
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
    
    const title = $('title').text() || $('h1').first().text() || url;
    
    return { text, title };
  } catch (error) {
    logger.error(`URL scraping error for ${url}: ${error.message}`);
    throw new Error(`Failed to scrape URL: ${error.message}`);
  }
};

/**
 * Process FAQ entries
 */
const processFaqs = (faqs) => {
  return faqs.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n---\n\n');
};

/**
 * Store chunks in vector database
 */
const storeChunksInVectorDB = async (tenantId, documentId, chunks, metadata = {}) => {
  const collection = await getOrCreateCollection(tenantId.toString());
  
  if (chunks.length === 0) return [];
  
  // Generate embeddings for all chunks
  const embeddings = await generateEmbeddingsBatch(chunks);
  
  const ids = chunks.map(() => uuidv4());
  const metadatas = chunks.map((chunk, idx) => ({
    documentId: documentId.toString(),
    tenantId: tenantId.toString(),
    chunkIndex: idx,
    text: chunk.substring(0, 500), // Store preview in metadata
    ...metadata
  }));
  
  await collection.add({
    ids,
    embeddings,
    documents: chunks,
    metadatas
  });
  
  return ids;
};

/**
 * Main ingestion pipeline
 */
const processDocument = async (knowledgeBaseId) => {
  const doc = await KnowledgeBase.findById(knowledgeBaseId);
  if (!doc) throw new Error('Document not found');
  
  // Update status to processing
  doc.status = 'processing';
  await doc.save();
  
  try {
    let rawText = '';
    
    // Extract text based on type
    switch (doc.type) {
      case 'pdf':
        rawText = await extractPdfText(doc.filePath);
        break;
      case 'text':
      case 'docx':
        rawText = extractTextFile(doc.filePath);
        break;
      case 'url':
        const { text, title } = await scrapeUrl(doc.sourceUrl);
        rawText = text;
        if (!doc.title || doc.title === doc.sourceUrl) {
          doc.title = title;
        }
        break;
      case 'faq':
        rawText = processFaqs(doc.faqs);
        break;
      default:
        throw new Error(`Unsupported document type: ${doc.type}`);
    }
    
    if (!rawText || rawText.trim().length < 10) {
      throw new Error('No meaningful text content extracted');
    }
    
    // Chunk the text
    const chunks = smartChunkText(rawText);
    logger.info(`Document ${knowledgeBaseId}: extracted ${chunks.length} chunks`);
    
    // Store in vector DB
    const vectorIds = await storeChunksInVectorDB(
      doc.tenantId,
      doc._id,
      chunks,
      {
        title: doc.title,
        type: doc.type,
        fileName: doc.fileName || ''
      }
    );
    
    // Update document record
    doc.rawContent = rawText.substring(0, 5000); // Store preview
    doc.chunksCount = chunks.length;
    doc.vectorIds = vectorIds;
    doc.status = 'processed';
    doc.processedAt = new Date();
    await doc.save();
    
    // Update tenant usage
    await Tenant.findByIdAndUpdate(doc.tenantId, {
      $inc: { 'usage.documentsCount': 1 }
    });
    
    logger.info(`Successfully processed document ${knowledgeBaseId}`);
    return doc;
    
  } catch (error) {
    doc.status = 'failed';
    doc.processingError = error.message;
    await doc.save();
    logger.error(`Failed to process document ${knowledgeBaseId}: ${error.message}`);
    throw error;
  }
};

/**
 * Delete document from vector DB
 */
const deleteDocumentFromVectorDB = async (tenantId, vectorIds) => {
  if (!vectorIds || vectorIds.length === 0) return;
  
  try {
    const collection = await getOrCreateCollection(tenantId.toString());
    await collection.delete({ ids: vectorIds });
    logger.info(`Deleted ${vectorIds.length} vectors for tenant ${tenantId}`);
  } catch (error) {
    logger.error(`Error deleting vectors: ${error.message}`);
  }
};

module.exports = {
  processDocument,
  deleteDocumentFromVectorDB,
  scrapeUrl,
  extractPdfText
};
