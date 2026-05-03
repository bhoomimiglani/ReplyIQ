const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const Conversation = require('../models/Conversation');
const Ticket = require('../models/Ticket');
const Tenant = require('../models/Tenant');
const { protect, requireBusiness, widgetAuth } = require('../middleware/auth');
const { generateResponse, classifyQuery } = require('../services/aiService');
const logger = require('../utils/logger');

// @route   POST /api/chat/message
// @desc    Send a message and get AI response (widget/API)
router.post('/message', async (req, res) => {
  try {
    // Support both widget API key auth and JWT auth
    let tenant = null;
    
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      const Tenant = require('../models/Tenant');
      tenant = await Tenant.findOne({ apiKey, isActive: true });
      if (!tenant) return res.status(401).json({ error: 'Invalid API key' });
    } else {
      // Try JWT auth
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        const User = require('../models/User');
        try {
          const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
          const user = await User.findById(decoded.id);
          if (user && user.tenantId) {
            tenant = await Tenant.findById(user.tenantId);
          }
        } catch (e) {}
      }
    }
    
    if (!tenant) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { message, sessionId, customerName, customerEmail, customerId } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const sid = sessionId || uuidv4();
    
    // Find or create conversation
    let conversation = await Conversation.findOne({
      sessionId: sid,
      tenantId: tenant._id,
      status: { $in: ['active'] }
    });
    
    if (!conversation) {
      conversation = new Conversation({
        tenantId: tenant._id,
        sessionId: sid,
        customer: {
          name: customerName || 'Anonymous',
          email: customerEmail,
          userId: customerId
        },
        channel: apiKey ? 'widget' : 'dashboard',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }
    
    // Add user message
    conversation.messages.push({
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    });
    conversation.totalMessages += 1;
    conversation.lastMessageAt = new Date();
    
    // Generate AI response
    const aiResult = await generateResponse({
      tenantId: tenant._id,
      query: message.trim(),
      conversationHistory: conversation.messages.slice(-10),
      tenantSettings: tenant.settings,
      sessionId: sid
    });
    
    // Add assistant message
    const assistantMessage = {
      role: 'assistant',
      content: aiResult.response,
      timestamp: new Date(),
      confidence: aiResult.confidence,
      sources: aiResult.sources,
      tokensUsed: aiResult.tokensUsed,
      responseTime: aiResult.responseTime
    };
    
    conversation.messages.push(assistantMessage);
    conversation.totalMessages += 1;
    
    // Update avg confidence
    const confidenceMessages = conversation.messages.filter(m => m.confidence != null);
    if (confidenceMessages.length > 0) {
      conversation.avgConfidence = confidenceMessages.reduce((sum, m) => sum + m.confidence, 0) / confidenceMessages.length;
    }
    
    // Handle escalation
    let ticket = null;
    if (aiResult.shouldEscalate && tenant.settings.autoEscalate && !conversation.escalated) {
      conversation.escalated = true;
      conversation.status = 'escalated';
      conversation.escalationReason = `Low AI confidence: ${(aiResult.confidence * 100).toFixed(0)}%`;
      
      // Create ticket
      const category = await classifyQuery(message);
      ticket = new Ticket({
        tenantId: tenant._id,
        title: `Support request: ${message.substring(0, 100)}`,
        description: `Customer query: ${message}\n\nAI Response: ${aiResult.response}\n\nEscalation reason: Low confidence (${(aiResult.confidence * 100).toFixed(0)}%)`,
        status: 'open',
        priority: 'medium',
        category,
        customer: conversation.customer,
        conversationId: conversation._id,
        escalationReason: conversation.escalationReason,
        aiConfidence: aiResult.confidence
      });
      
      await ticket.save();
      conversation.ticketId = ticket._id;
      
      // Add system message about escalation
      conversation.messages.push({
        role: 'assistant',
        content: `I've created a support ticket (#${ticket.ticketNumber}) for your request. A human agent will follow up with you shortly.`,
        timestamp: new Date()
      });
    }
    
    await conversation.save();
    
    // Update tenant usage
    await Tenant.findByIdAndUpdate(tenant._id, {
      $inc: {
        'usage.totalMessages': 2,
        'usage.totalConversations': conversation.messages.length === 2 ? 1 : 0
      }
    });
    
    res.json({
      success: true,
      sessionId: sid,
      conversationId: conversation._id,
      message: {
        role: 'assistant',
        content: aiResult.response,
        confidence: aiResult.confidence,
        sources: aiResult.sources,
        timestamp: new Date()
      },
      escalated: aiResult.shouldEscalate,
      ticket: ticket ? { id: ticket._id, number: ticket.ticketNumber } : null
    });
    
  } catch (error) {
    logger.error(`Chat error: ${error.message}`);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// @route   GET /api/chat/conversations
// @desc    Get all conversations for tenant (dashboard)
router.get('/conversations', protect, requireBusiness, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const tenantId = req.tenant._id;
    
    const query = { tenantId };
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    const total = await Conversation.countDocuments(query);
    const conversations = await Conversation.find(query)
      .select('-messages')
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    res.json({
      conversations,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// @route   GET /api/chat/conversations/:id
// @desc    Get single conversation with messages
router.get('/conversations/:id', protect, requireBusiness, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id
    }).populate('ticketId', 'ticketNumber status priority');
    
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    
    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// @route   POST /api/chat/conversations/:id/feedback
// @desc    Submit feedback for a message
router.post('/conversations/:id/feedback', async (req, res) => {
  try {
    const { messageIndex, rating, comment } = req.body;
    
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    
    if (conversation.messages[messageIndex]) {
      conversation.messages[messageIndex].feedback = { rating, comment };
      await conversation.save();
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// @route   PUT /api/chat/conversations/:id/resolve
// @desc    Mark conversation as resolved
router.put('/conversations/:id/resolve', protect, requireBusiness, async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id },
      { status: 'resolved', resolved: true, resolvedAt: new Date() },
      { new: true }
    );
    
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve conversation' });
  }
});

module.exports = router;
