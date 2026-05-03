const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const Ticket = require('../models/Ticket');
const { protect, requireBusiness } = require('../middleware/auth');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

router.use(protect, requireBusiness);

// @route   GET /api/tickets
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority, category, assignedTo, search } = req.query;
    const tenantId = req.tenant._id;
    
    const query = { tenantId };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (assignedTo) query.assignedTo = assignedTo;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { ticketNumber: { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    const total = await Ticket.countDocuments(query);
    const tickets = await Ticket.find(query)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    res.json({
      tickets,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// @route   POST /api/tickets
// @desc    Create ticket manually
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('description').trim().notEmpty().withMessage('Description required')
], handleValidation, async (req, res) => {
  try {
    const { title, description, priority, category, customer } = req.body;
    
    const ticket = new Ticket({
      tenantId: req.tenant._id,
      title,
      description,
      priority: priority || 'medium',
      category: category || 'general',
      customer: customer || {}
    });
    
    await ticket.save();
    res.status(201).json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// @route   GET /api/tickets/:id
router.get('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, tenantId: req.tenant._id })
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name email')
      .populate('conversationId', 'sessionId customer messages');
    
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    
    res.json({ ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// @route   PUT /api/tickets/:id
router.put('/:id', async (req, res) => {
  try {
    const { status, priority, category, assignedTo, resolution, tags } = req.body;
    const updates = {};
    
    if (status) {
      updates.status = status;
      if (status === 'resolved') {
        updates.resolvedAt = new Date();
        updates.resolvedBy = req.user._id;
        if (resolution) updates.resolution = resolution;
      }
    }
    if (priority) updates.priority = priority;
    if (category) updates.category = category;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo || null;
    if (tags) updates.tags = tags;
    
    const ticket = await Ticket.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id },
      updates,
      { new: true }
    ).populate('assignedTo', 'name email');
    
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// @route   POST /api/tickets/:id/comments
router.post('/:id/comments', [
  body('content').trim().notEmpty().withMessage('Comment content required')
], handleValidation, async (req, res) => {
  try {
    const { content, isInternal } = req.body;
    
    const ticket = await Ticket.findOne({ _id: req.params.id, tenantId: req.tenant._id });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    
    // Set first response time
    if (!ticket.firstResponseAt) {
      ticket.firstResponseAt = new Date();
    }
    
    ticket.comments.push({
      author: req.user._id,
      authorName: req.user.name,
      content,
      isInternal: isInternal || false
    });
    
    await ticket.save();
    
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// @route   DELETE /api/tickets/:id
router.delete('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant._id });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ success: true, message: 'Ticket deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
