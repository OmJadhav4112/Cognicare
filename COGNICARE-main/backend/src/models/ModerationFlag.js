const mongoose = require('mongoose');

/**
 * ModerationFlag Model
 * Tracks flagged content that requires admin review
 * 
 * Stores both automated and manual flags for family memories
 */
const moderationFlagSchema = new mongoose.Schema({
  // The content being flagged
  resourceType: {
    type: String,
    enum: ['FamilyMemory', 'Note', 'CaregiverFeedback'],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  // Related entities
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  flaggedBy: {
    type: String,
    enum: ['system', 'caregiver', 'admin'],
    default: 'system'
  },
  
  // Moderation details
  reason: {
    type: String,
    enum: [
      'inappropriate_text',      // Harmful, offensive language detected
      'sensitive_image',          // Image contains sensitive content
      'explicit_content',         // Adult or explicit content
      'personal_info_exposed',    // PII like SSN, addresses detected
      'misinformation',           // False or misleading info
      'spam',                     // Spam or junk content
      'other'                     // Manual report
    ],
    required: true
  },
  
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Details of what triggered the flag
  details: {
    triggeredRules: [String],       // Which rules were triggered
    matchedPatterns: [String],      // Specific patterns/keywords found
    confidence: Number,             // 0-100 confidence score
    description: String             // Human-readable description
  },
  
  // Image-specific analysis (if applicable)
  imageAnalysis: {
    isBlurred: { type: Boolean, default: false },      // Whether image was automatically blurred
    blurIntensity: Number,                              // Blur strength (0-100)
    flaggedRegions: [{
      x: Number,
      y: Number,
      width: Number,
      height: Number,
      reason: String
    }],
    nsfw_probability: Number,                           // 0-1 (from external API)
    contains_faces: Boolean
  },
  
  // Review status
  status: {
    type: String,
    enum: ['flagged', 'reviewing', 'approved', 'rejected', 'resolved'],
    default: 'flagged'
  },
  
  // Admin review
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewNotes: {
    type: String,
    default: ''
  },
  
  // Resolution
  action: {
    type: String,
    enum: ['none', 'blur', 'hide', 'delete', 'warn_user'],
    default: 'none'
  },
  actionTaken: Boolean,
  actionDetails: String,
  
  // Escalation
  isEscalated: {
    type: Boolean,
    default: false
  },
  escalatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Notification status
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationSentAt: Date
}, { timestamps: true });

// Indexes for efficient querying
moderationFlagSchema.index({ patient: 1, status: 1 });
moderationFlagSchema.index({ resourceId: 1, resourceType: 1 });
moderationFlagSchema.index({ status: 1, severity: -1, createdAt: -1 });
moderationFlagSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ModerationFlag', moderationFlagSchema);
