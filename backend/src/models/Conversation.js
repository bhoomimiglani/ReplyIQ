const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // AI metadata
  confidence: { type: Number, min: 0, max: 1 },
  sources: [{ 
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeBase' },
    title: String,
    excerpt: String,
    score: Number
  }],
  tokensUsed: { type: Number },
  responseTime: { type: Number }, // ms
  // Feedback
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String }
  }
});

const conversationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  // Customer info (anonymous or identified)
  customer: {
    name: { type: String, default: 'Anonymous' },
    email: { type: String },
    userId: { type: String }, // external user ID
    metadata: { type: Object, default: {} }
  },
  messages: [messageSchema],
  status: {
    type: String,
    enum: ['active', 'resolved', 'escalated', 'abandoned'],
    default: 'active'
  },
  // Escalation info
  escalated: {
    type: Boolean,
    default: false
  },
  escalationReason: { type: String },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  },
  // Analytics
  totalMessages: { type: Number, default: 0 },
  avgConfidence: { type: Number, default: 0 },
  resolved: { type: Boolean, default: false },
  resolvedAt: { type: Date },
  
  // Channel
  channel: {
    type: String,
    enum: ['widget', 'api', 'dashboard'],
    default: 'widget'
  },
  
  // IP and user agent for analytics
  ipAddress: { type: String },
  userAgent: { type: String },
  
  lastMessageAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

conversationSchema.index({ tenantId: 1, status: 1 });
conversationSchema.index({ tenantId: 1, createdAt: -1 });
conversationSchema.index({ sessionId: 1, tenantId: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
