const { ChromaClient } = require('chromadb');
const logger = require('../utils/logger');

let client = null;

const getChromaClient = () => {
  if (!client) {
    client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000',
    });
  }
  return client;
};

const getOrCreateCollection = async (tenantId) => {
  const chroma = getChromaClient();
  const collectionName = `tenant_${tenantId}`;
  
  try {
    const collection = await chroma.getOrCreateCollection({
      name: collectionName,
      metadata: { 'hnsw:space': 'cosine' },
    });
    return collection;
  } catch (error) {
    logger.error(`Error getting/creating collection for tenant ${tenantId}: ${error.message}`);
    throw error;
  }
};

const deleteCollection = async (tenantId) => {
  const chroma = getChromaClient();
  const collectionName = `tenant_${tenantId}`;
  try {
    await chroma.deleteCollection({ name: collectionName });
    logger.info(`Deleted collection for tenant ${tenantId}`);
  } catch (error) {
    logger.warn(`Could not delete collection ${collectionName}: ${error.message}`);
  }
};

module.exports = { getChromaClient, getOrCreateCollection, deleteCollection };
