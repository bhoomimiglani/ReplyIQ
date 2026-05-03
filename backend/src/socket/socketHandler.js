const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const Conversation = require('../models/Conversation');
const Ticket = require('../models/Ticket');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const { generateResponse, classifyQuery } = require('../services/aiService');
const logger = require('../utils/logger');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Namespace for customer chat widget
  const chatNS = io.of('/chat');
  
  chatNS.on('connection', async (socket) => {
    logger.info(`Chat socket connected: ${socket.id}`);
    
    // Authenticate via API key or JWT
    const apiKey = socket.handshake.auth.apiKey;
    const token = socket.handshake.auth.token;
    let tenant = null;
    let user = null;
    
    try {
      if (apiKey) {
        tenant = await Tenant.findOne({ apiKey, isActive: true });
      } else if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await User.findById(decoded.id);
        if (user?.tenantId) {
          tenant = await Tenant.findById(user.tenantId);
        }
      }
    } catch (e) {
      logger.warn(`Socket auth failed: ${e.message}`);
    }
    
    if (!tenant) {
      socket.emit('error', { message: 'Authentication failed' });
      socket.disconnect();
      return;
    }
    
    const sessionId = socket.handshake.auth.sessionId || uuidv4();
    socket.join(`tenant:${tenant._id}`);
    socket.join(`session:${sessionId}`);
    
    socket.emit('connected', {
      sessionId,
      botName: tenant.settings.botName,
      welcomeMessage: tenant.settings.welcomeMessage
    });
    
    // Handle incoming message
    socket.on('message', async (data) => {
      const { message, customerName, customerEmail } = data;
      
      if (!message?.trim()) return;
      
      // Emit typing indicator
      socket.emit('typing', { isTyping: true });
      
      try {
        // Find or create conversation
        let conversation = await Conversation.findOne({
          sessionId,
          tenantId: tenant._id,
          status: 'active'
        });
        
        if (!conversation) {
          conversation = new Conversation({
            tenantId: tenant._id,
            sessionId,
            customer: {
              name: customerName || 'Anonymous',
              email: customerEmail
            },
            channel: 'widget',
            ipAddress: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent']
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
          sessionId
        });
        
        // Add assistant message
        conversation.messages.push({
          role: 'assistant',
          content: aiResult.response,
          timestamp: new Date(),
          confidence: aiResult.confidence,
          sources: aiResult.sources,
          tokensUsed: aiResult.tokensUsed,
          responseTime: aiResult.responseTime
        });
        conversation.totalMessages += 1;
        
        // Handle escalation
        let ticket = null;
        if (aiResult.shouldEscalate && tenant.settings.autoEscalate && !conversation.escalated) {
          conversation.escalated = true;
          conversation.status = 'escalated';
          conversation.escalationReason = `Low confidence: ${(aiResult.confidence * 100).toFixed(0)}%`;
          
          const category = await classifyQuery(message);
          ticket = new Ticket({
            tenantId: tenant._id,
            title: `Support: ${message.substring(0, 100)}`,
            description: `Customer: ${message}\n\nAI Response: ${aiResult.response}`,
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
          
          // Notify dashboard users
          io.of('/dashboard').to(`tenant:${tenant._id}`).emit('new_ticket', {
            ticket: { id: ticket._id, number: ticket.ticketNumber, title: ticket.title }
          });
        }
        
        await conversation.save();
        
        // Stop typing indicator
        socket.emit('typing', { isTyping: false });
        
        // Send response
        socket.emit('message', {
          role: 'assistant',
          content: aiResult.response,
          confidence: aiResult.confidence,
          sources: aiResult.sources,
          timestamp: new Date(),
          conversationId: conversation._id,
          escalated: aiResult.shouldEscalate,
          ticket: ticket ? { id: ticket._id, number: ticket.ticketNumber } : null
        });
        
        // Notify dashboard of new conversation activity
        io.of('/dashboard').to(`tenant:${tenant._id}`).emit('conversation_update', {
          conversationId: conversation._id,
          sessionId,
          status: conversation.status,
          lastMessage: message.substring(0, 100)
        });
        
      } catch (error) {
        logger.error(`Socket message error: ${error.message}`);
        socket.emit('typing', { isTyping: false });
        socket.emit('error', { message: 'Failed to process message. Please try again.' });
      }
    });
    
    socket.on('disconnect', () => {
      logger.info(`Chat socket disconnected: ${socket.id}`);
    });
  });

  // Namespace for dashboard (business users)
  const dashboardNS = io.of('/dashboard');
  
  dashboardNS.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (e) {
      next(new Error('Invalid token'));
    }
  });
  
  dashboardNS.on('connection', async (socket) => {
    const user = socket.user;
    if (user.tenantId) {
      socket.join(`tenant:${user.tenantId}`);
    }
    
    socket.on('disconnect', () => {});
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
