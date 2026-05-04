const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['free', 'starter', 'pro', 'enterprise'],
    default: 'free'
  },
  settings: {
    // Chatbot customization
    botName: { type: String, default: 'Support Assistant' },
    botAvatar: { type: String, default: null },
    welcomeMessage: { type: String, default: 'Hello! How can I help you today?' },
    tone: {
      type: String,
      enum: ['formal', 'friendly', 'professional', 'casual'],
      default: 'professional'
    },
    language: { type: String, default: 'en' },
    // Escalation settings
    confidenceThreshold: { type: Number, default: 0.6, min: 0, max: 1 },
    autoEscalate: { type: Boolean, default: true },
    // Widget customization
    primaryColor: { type: String, default: '#6366f1' },
    widgetPosition: { type: String, enum: ['bottom-right', 'bottom-left'], default: 'bottom-right' },
    // Business hours
    businessHours: {
      enabled: { type: Boolean, default: false },
      timezone: { type: String, default: 'UTC' },
      schedule: { type: Object, default: {} }
    }
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Usage stats
  usage: {
    totalConversations: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    totalTickets: { type: Number, default: 0 },
    documentsCount: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 } // bytes
  },
  // Plan limits
  limits: {
    maxDocuments: { type: Number, default: 10 },
    maxConversationsPerMonth: { type: Number, default: 100 },
    maxAgents: { type: Number, default: 1 }
  }
}, {
  timestamps: true
});

// Generate slug from name
tenantSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    // Add random suffix to ensure uniqueness
    this.slug = `${baseSlug}-${Date.now().toString(36)}`;
  }
  next();
});

module.exports = mongoose.model('Tenant', tenantSchema);
