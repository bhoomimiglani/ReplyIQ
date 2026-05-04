const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

const KnowledgeBase = require('../models/KnowledgeBase');
const { protect, requireBusiness } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { processDocument, deleteDocumentFromVectorDB } = require('../services/ingestionService');
const logger = require('../utils/logger');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

// All routes require auth
router.use(protect, requireBusiness);

// Middleware to ensure tenant exists
router.use((req, res, next) => {
  if (!req.tenant) {
    return res.status(400).json({ error: 'No tenant found for this account. Please contact support.' });
  }
  next();
});

// @route   GET /api/knowledge-base
// @desc    Get all documents for tenant
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, search } = req.query;
    const tenantId = req.tenant._id;
    
    const query = { tenantId, isActive: true };
    if (type) query.type = type;
    if (status) query.status = status;
    if (search) query.title = { $regex: search, $options: 'i' };
    
    const total = await KnowledgeBase.countDocuments(query);
    const docs = await KnowledgeBase.find(query)
      .select('-rawContent -vectorIds')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    res.json({
      documents: docs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// @route   POST /api/knowledge-base/upload
// @desc    Upload document file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { title, description, tags } = req.body;
    const tenantId = req.tenant._id;
    
    // Determine type from mimetype
    let type = 'text';
    if (req.file.mimetype === 'application/pdf') type = 'pdf';
    else if (req.file.mimetype.includes('word')) type = 'docx';
    
    const doc = new KnowledgeBase({
      tenantId,
      title: title || req.file.originalname,
      type,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      description,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      uploadedBy: req.user._id
    });
    
    await doc.save();
    
    // Process asynchronously
    processDocument(doc._id).catch(err => {
      logger.error(`Background processing failed for ${doc._id}: ${err.message}`);
    });
    
    res.status(201).json({
      success: true,
      document: doc,
      message: 'Document uploaded and processing started'
    });
  } catch (error) {
    logger.error(`Upload error: ${error.message}`);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// @route   POST /api/knowledge-base/url
// @desc    Add URL to knowledge base
router.post('/url', [
  body('url').isURL().withMessage('Valid URL required'),
  body('title').optional().trim()
], handleValidation, async (req, res) => {
  try {
    const { url, title, description, tags } = req.body;
    const tenantId = req.tenant._id;
    
    const doc = new KnowledgeBase({
      tenantId,
      title: title || url,
      type: 'url',
      sourceUrl: url,
      description,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      uploadedBy: req.user._id
    });
    
    await doc.save();
    
    // Process asynchronously
    processDocument(doc._id).catch(err => {
      logger.error(`URL processing failed for ${doc._id}: ${err.message}`);
    });
    
    res.status(201).json({
      success: true,
      document: doc,
      message: 'URL added and processing started'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add URL' });
  }
});

// @route   POST /api/knowledge-base/faq
// @desc    Add FAQ entries
router.post('/faq', [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('faqs').isArray({ min: 1 }).withMessage('At least one FAQ required'),
  body('faqs.*.question').notEmpty().withMessage('Question required'),
  body('faqs.*.answer').notEmpty().withMessage('Answer required')
], handleValidation, async (req, res) => {
  try {
    const { title, faqs, description, tags } = req.body;
    const tenantId = req.tenant._id;
    
    const doc = new KnowledgeBase({
      tenantId,
      title,
      type: 'faq',
      faqs,
      description,
      tags: tags || [],
      uploadedBy: req.user._id
    });
    
    await doc.save();
    
    processDocument(doc._id).catch(err => {
      logger.error(`FAQ processing failed for ${doc._id}: ${err.message}`);
    });
    
    res.status(201).json({
      success: true,
      document: doc,
      message: 'FAQs added and processing started'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add FAQs' });
  }
});

// @route   POST /api/knowledge-base/text
// @desc    Add plain text content
router.post('/text', [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('content').trim().notEmpty().withMessage('Content required').isLength({ min: 50 })
], handleValidation, async (req, res) => {
  try {
    const { title, content, description, tags } = req.body;
    const tenantId = req.tenant._id;
    
    // Save as temp file
    const tempDir = path.join(process.env.UPLOAD_PATH || './uploads', tenantId.toString());
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const fileName = `text-${Date.now()}.txt`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, content, 'utf-8');
    
    const doc = new KnowledgeBase({
      tenantId,
      title,
      type: 'text',
      filePath,
      fileName,
      fileSize: Buffer.byteLength(content, 'utf-8'),
      description,
      tags: tags || [],
      uploadedBy: req.user._id
    });
    
    await doc.save();
    
    processDocument(doc._id).catch(err => {
      logger.error(`Text processing failed for ${doc._id}: ${err.message}`);
    });
    
    res.status(201).json({
      success: true,
      document: doc,
      message: 'Text content added and processing started'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add text content' });
  }
});

// @route   GET /api/knowledge-base/:id
// @desc    Get single document
router.get('/:id', async (req, res) => {
  try {
    const doc = await KnowledgeBase.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id
    }).select('-vectorIds');
    
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    
    res.json({ document: doc });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// @route   PUT /api/knowledge-base/:id
// @desc    Update document metadata
router.put('/:id', async (req, res) => {
  try {
    const { title, description, tags, isActive } = req.body;
    
    const doc = await KnowledgeBase.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id },
      { title, description, tags, isActive },
      { new: true }
    );
    
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    
    res.json({ success: true, document: doc });
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// @route   DELETE /api/knowledge-base/:id
// @desc    Delete document
router.delete('/:id', async (req, res) => {
  try {
    const doc = await KnowledgeBase.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id
    });
    
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    
    // Delete from vector store
    await deleteDocumentFromVectorDB(req.tenant._id, doc.vectorIds);
    
    // Delete file if exists
    if (doc.filePath && fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }
    
    await doc.deleteOne();
    
    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    logger.error(`Delete error: ${error.message}`);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// @route   POST /api/knowledge-base/:id/reprocess
// @desc    Reprocess a document
router.post('/:id/reprocess', async (req, res) => {
  try {
    const doc = await KnowledgeBase.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id
    });
    
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    
    // Delete old vectors
    await deleteDocumentFromVectorDB(req.tenant._id, doc.vectorIds);
    doc.vectorIds = [];
    doc.status = 'pending';
    await doc.save();
    
    processDocument(doc._id).catch(err => {
      logger.error(`Reprocess failed for ${doc._id}: ${err.message}`);
    });
    
    res.json({ success: true, message: 'Reprocessing started' });
  } catch (error) {
    res.status(500).json({ error: 'Reprocess failed' });
  }
});

module.exports = router;
