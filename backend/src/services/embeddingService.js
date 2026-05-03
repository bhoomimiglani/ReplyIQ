const logger = require('../utils/logger');

const MAX_TOKENS_PER_CHUNK = 500;
const CHUNK_OVERLAP = 50;

/**
 * Simple hash-based embedding for free usage
 * Uses TF-IDF style vector representation
 */
const generateEmbedding = async (text) => {
  try {
    // Try OpenAI first if key exists and has credits
    if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-')) {
      try {
        const openai = require('../config/openai');
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text.substring(0, 8000),
        });
        return response.data[0].embedding;
      } catch (e) {
        // Fall through to local embedding
        logger.warn('OpenAI embedding failed, using local embedding');
      }
    }

    // Free local embedding using simple bag-of-words + hashing
    return localEmbedding(text);
  } catch (error) {
    logger.error(`Embedding generation error: ${error.message}`);
    return localEmbedding(text);
  }
};

/**
 * Local embedding - no API needed, completely free
 * Creates a 384-dim vector using character n-grams and word hashing
 */
const localEmbedding = (text) => {
  const dim = 384;
  const vector = new Array(dim).fill(0);

  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = cleaned.split(/\s+/).filter(w => w.length > 1);

  // Word-level hashing
  for (const word of words) {
    let hash = 5381;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) + hash) + word.charCodeAt(i);
      hash = hash & 0x7fffffff;
    }
    const idx = hash % dim;
    vector[idx] += 1;

    // Bigram hashing
    if (word.length > 3) {
      for (let i = 0; i < word.length - 2; i++) {
        const bigram = word.slice(i, i + 3);
        let bHash = 5381;
        for (let j = 0; j < bigram.length; j++) {
          bHash = ((bHash << 5) + bHash) + bigram.charCodeAt(j);
          bHash = bHash & 0x7fffffff;
        }
        vector[bHash % dim] += 0.5;
      }
    }
  }

  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map(v => v / magnitude);
};

/**
 * Generate embeddings for multiple texts in batch
 */
const generateEmbeddingsBatch = async (texts) => {
  try {
    if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-')) {
      try {
        const openai = require('../config/openai');
        const batchSize = 20;
        const allEmbeddings = [];
        for (let i = 0; i < texts.length; i += batchSize) {
          const batch = texts.slice(i, i + batchSize).map(t => t.substring(0, 8000));
          const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: batch,
          });
          allEmbeddings.push(...response.data.map(d => d.embedding));
        }
        return allEmbeddings;
      } catch (e) {
        logger.warn('OpenAI batch embedding failed, using local embeddings');
      }
    }

    // Free local embeddings
    return texts.map(t => localEmbedding(t));
  } catch (error) {
    logger.error(`Batch embedding error: ${error.message}`);
    return texts.map(t => localEmbedding(t));
  }
};

/**
 * Split text into overlapping chunks
 */
const chunkText = (text, maxTokens = MAX_TOKENS_PER_CHUNK, overlap = CHUNK_OVERLAP) => {
  const maxWords = Math.floor(maxTokens * 0.75);
  const overlapWords = Math.floor(overlap * 0.75);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const chunks = [];

  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    const chunk = words.slice(start, end).join(' ');
    if (chunk.trim().length > 20) {
      chunks.push(chunk.trim());
    }
    if (end >= words.length) break;
    start = end - overlapWords;
  }

  return chunks;
};

/**
 * Smart chunk by paragraphs
 */
const smartChunkText = (text, maxTokens = MAX_TOKENS_PER_CHUNK) => {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const chunks = [];
  let currentChunk = '';
  const maxWords = Math.floor(maxTokens * 0.75);

  for (const para of paragraphs) {
    const paraWords = para.split(/\s+/).length;
    const currentWords = currentChunk.split(/\s+/).length;

    if (currentWords + paraWords <= maxWords) {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    } else {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      if (paraWords > maxWords) {
        chunks.push(...chunkText(para, maxTokens));
        currentChunk = '';
      } else {
        currentChunk = para;
      }
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks.length > 0 ? chunks : [text.substring(0, 2000)];
};

module.exports = {
  generateEmbedding,
  generateEmbeddingsBatch,
  chunkText,
  smartChunkText
};
