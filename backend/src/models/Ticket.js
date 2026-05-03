const mongoose = require('mongoose');

const ticketCommentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  authorName: { type: String },
  content: { type: String, required: true },
  isInternal: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const ticketSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  ticketNumber: {
    type: String,
    unique: true
  },
  title: {
    type: String,
    required: [true, 'Ticket title is required'],
    trim: true,
    maxlength: [500, 'Title cannot exceed 500 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['technical', 'billing', 'general', 'feature_request', 'bug', 'other'],
    default: 'general'
  },
  // Customer info
  customer: {
    name: { type: String },
    email: { type: String },
    userId: { type: String }
  },
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Linked conversation
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  // Escalation context
  escalationReason: { type: String },
  aiConfidence: { type: Number },
  
  // Comments/replies
  comments: [ticketCommentSchema],
  
  // Resolution
  resolvedAt: { type: Date },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolution: { type: String },
  
  // SLA
  firstResponseAt: { type: Date },
  dueDate: { type: Date },
  
  tags: [{ type: String }]
}, {
  timestamps: true
});

// Auto-generate ticket number
ticketSchema.pre('save', async function(next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model('Ticket').countDocuments({ tenantId: this.tenantId });
    const prefix = 'TKT';
    this.ticketNumber = `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

ticketSchema.index({ tenantId: 1, status: 1 });
ticketSchema.index({ tenantId: 1, createdAt: -1 });
ticketSchema.index({ tenantId: 1, assignedTo: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
