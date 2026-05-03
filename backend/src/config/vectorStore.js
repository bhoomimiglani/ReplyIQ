const { ChromaClient } = require('chromadb');
const logger = require('../utils/logger');

let client = null;

// In-memory fallback when ChromaDB is not available
const memoryStore = new Map();

const getMockCollection = (tenantId) => {
  if (!memoryStore.has(tenantId)) {
    memoryStore.set(tenantId, { ids: [], embeddings: [], documents: [], metadatas: [] });
  }

  const store = memoryStore.get(tenantId);

  return {
    add: async ({ ids, embeddings, documents, metadatas }) => {
      store.ids.push(...ids);
      store.embeddings.push(...embeddings);
      store.documents.push(...documents);
      store.metadatas.push(...metadatas);
    },
    query: async ({ queryEmbeddings, nResults, where }) => {
      if (store.embeddings.length === 0) {
        return { documents: [[]], metadatas: [[]], distances: [[]] };
      }

      // Cosine similarity
      const queryVec = queryEmbeddings[0];
      const scores = store.embeddings.map((emb, idx) => {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < queryVec.length; i++) {
          dot += queryVec[i] * emb[i];
          normA += queryVec[i] ** 2;
          normB += emb[i] ** 2;
        }
        const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
        return { idx, score: similarity };
      });

      scores.sort((a, b) => b.score - a.score);
      const topN = scores.slice(0, nResults || 5);

      // Filter by where clause if provided
      const filtered = where
        ? topN.filter(({ idx }) => {
            const meta = store.metadatas[idx];
            return Object.entries(where).every(([k, v]) => meta[k] === v);
          })
        : topN;

      return {
        documents: [filtered.map(({ idx }) => store.documents[idx])],
        metadatas: [filtered.map(({ idx }) => store.metadatas[idx])],
        distances: [filtered.map(({ score }) => 1 - score)]
      };
    },
    delete: async ({ ids }) => {
      ids.forEach(id => {
        const i = store.ids.indexOf(id);
        if (i !== -1) {
          store.ids.splice(i, 1);
          store.embeddings.splice(i, 1);
          store.documents.splice(i, 1);
          store.metadatas.splice(i, 1);
        }
      });
    }
  };
};

const getChromaClient = () => {
  if (!client) {
    client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000',
    });
  }
  return client;
};

const getOrCreateCollection = async (tenantId) => {
  try {
    const chroma = getChromaClient();
    const collectionName = `tenant_${tenantId}`;
    const collection = await chroma.getOrCreateCollection({
      name: collectionName,
      metadata: { 'hnsw:space': 'cosine' },
    });
    return collection;
  } catch (error) {
    logger.warn(`ChromaDB unavailable, using in-memory store: ${error.message}`);
    return getMockCollection(tenantId.toString());
  }
};

const deleteCollection = async (tenantId) => {
  // Remove from memory store
  memoryStore.delete(tenantId.toString());

  try {
    const chroma = getChromaClient();
    const collectionName = `tenant_${tenantId}`;
    await chroma.deleteCollection({ name: collectionName });
  } catch (error) {
    logger.warn(`Could not delete ChromaDB collection: ${error.message}`);
  }
};

module.exports = { getChromaClient, getOrCreateCollection, deleteCollection };
