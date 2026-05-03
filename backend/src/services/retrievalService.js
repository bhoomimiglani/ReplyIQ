const { getOrCreateCollection } = require('../config/vectorStore');
const { generateEmbedding } = require('./embeddingService');
const KnowledgeBase = require('../models/KnowledgeBase');
const logger = require('../utils/logger');

/**
 * Retrieve relevant context for a query
 */
const retrieveContext = async (tenantId, query, options = {}) => {
  const {
    topK = 5,
    minScore = 0.3,
    documentIds = null // Filter by specific documents
  } = options;
  
  try {
    const collection = await getOrCreateCollection(tenantId.toString());
    
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    
    // Build where clause
    const whereClause = { tenantId: tenantId.toString() };
    if (documentIds && documentIds.length > 0) {
      whereClause.documentId = { '$in': documentIds.map(id => id.toString()) };
    }
    
    // Query vector store
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: Math.min(topK * 2, 20), // Get more, then filter
      where: whereClause,
      include: ['documents', 'metadatas', 'distances']
    });
    
    if (!results.documents || results.documents[0].length === 0) {
      return { chunks: [], sources: [], avgScore: 0 };
    }
    
    // Process results
    const chunks = [];
    const sourceMap = new Map();
    
    for (let i = 0; i < results.documents[0].length; i++) {
      const doc = results.documents[0][i];
      const metadata = results.metadatas[0][i];
      const distance = results.distances[0][i];
      
      // Convert cosine distance to similarity score (0-1)
      const score = 1 - distance;
      
      if (score < minScore) continue;
      
      chunks.push({
        text: doc,
        score,
        documentId: metadata.documentId,
        chunkIndex: metadata.chunkIndex,
        title: metadata.title || 'Unknown'
      });
      
      // Track unique sources
      if (!sourceMap.has(metadata.documentId)) {
        sourceMap.set(metadata.documentId, {
          documentId: metadata.documentId,
          title: metadata.title || 'Unknown',
          type: metadata.type,
          score,
          excerpt: doc.substring(0, 200)
        });
      }
    }
    
    // Sort by score and take top K
    chunks.sort((a, b) => b.score - a.score);
    const topChunks = chunks.slice(0, topK);
    
    const avgScore = topChunks.length > 0
      ? topChunks.reduce((sum, c) => sum + c.score, 0) / topChunks.length
      : 0;
    
    // Get source details from DB
    const sourceIds = [...sourceMap.keys()];
    const kbDocs = await KnowledgeBase.find({
      _id: { $in: sourceIds },
      tenantId,
      isActive: true
    }).select('title type fileName sourceUrl');
    
    const sources = kbDocs.map(kbDoc => ({
      documentId: kbDoc._id,
      title: kbDoc.title,
      type: kbDoc.type,
      fileName: kbDoc.fileName,
      sourceUrl: kbDoc.sourceUrl,
      score: sourceMap.get(kbDoc._id.toString())?.score || 0,
      excerpt: sourceMap.get(kbDoc._id.toString())?.excerpt || ''
    }));
    
    return {
      chunks: topChunks,
      sources,
      avgScore,
      contextText: topChunks.map(c => c.text).join('\n\n---\n\n')
    };
    
  } catch (error) {
    logger.error(`Retrieval error for tenant ${tenantId}: ${error.message}`);
    // Return empty context on error (don't break the chat)
    return { chunks: [], sources: [], avgScore: 0, contextText: '' };
  }
};

module.exports = { retrieveContext };
