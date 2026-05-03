const mongoose = require('mongoose');

// Daily analytics snapshot per tenant
const analyticsSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  metrics: {
    totalConversations: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    resolvedConversations: { type: Number, default: 0 },
    escalatedConversations: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 }, // ms
    avgConfidence: { type: Number, default: 0 },
    totalTickets: { type: Number, default: 0 },
    resolvedTickets: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    uniqueUsers: { type: Number, default: 0 },
    tokensUsed: { type: Number, default: 0 }
  },
  // Top queries
  topQueries: [{
    query: String,
    count: Number
  }],
  // Category breakdown
  categoryBreakdown: {
    type: Map,
    of: Number
  }
}, {
  timestamps: true
});

analyticsSchema.index({ tenantId: 1, date: -1 });
analyticsSchema.index({ tenantId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Analytics', analyticsSchema);
