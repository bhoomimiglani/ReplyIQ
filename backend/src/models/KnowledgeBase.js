const mongoose = require('mongoose');

const knowledgeBaseSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [500, 'Title cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['pdf', 'text', 'url', 'faq', 'docx'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'processed', 'failed'],
    default: 'pending'
  },
  // Source info
  sourceUrl: { type: String },
  filePath: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  mimeType: { type: String },
  
  // Processed content
  rawContent: { type: String },
  chunksCount: { type: Number, default: 0 },
  
  // Vector IDs stored in ChromaDB
  vectorIds: [{ type: String }],
  
  // FAQ specific
  faqs: [{
    question: { type: String },
    answer: { type: String }
  }],
  
  // Metadata
  tags: [{ type: String }],
  description: { type: String },
  
  // Processing info
  processingError: { type: String },
  processedAt: { type: Date },
  
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

knowledgeBaseSchema.index({ tenantId: 1, status: 1 });
knowledgeBaseSchema.index({ tenantId: 1, type: 1 });

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);
