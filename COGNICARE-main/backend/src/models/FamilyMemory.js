const mongoose = require('mongoose');

const familyMemorySchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['person', 'place', 'event', 'photo'],
    required: true
  },
  // Person fields
  personName: {
    type: String,
    default: ''
  },
  relationship: {
    type: String,
    default: '' // e.g. "daughter", "son", "grandchild"
  },
  // General fields
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    default: '',
    maxlength: 1000
  },
  // Photo stored as base64 string or URL
  photo: {
    type: String,
    default: null
  },
  // Additional memory hints for recall games
  memoryHints: [{
    type: String
  }],
  // Date of memory (when it happened)
  memoryDate: {
    type: String, // Free text e.g. "Summer 1990"
    default: ''
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  // Used in recall games
  usedInGames: {
    type: Boolean,
    default: true
  },
  
  // Content moderation fields
  moderation: {
    isFlagged: {
      type: Boolean,
      default: false
    },
    flagReason: String,                 // Primary reason if flagged
    flagSeverity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    isBlurred: {
      type: Boolean,
      default: false                    // Photo is blurred due to sensitive content
    },
    blurIntensity: Number,              // Blur strength (0-100)
    reviewStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none'
    },
    moderationNotes: String,
    moderationFlag: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ModerationFlag',
      default: null
    }
  }
}, { timestamps: true });

familyMemorySchema.index({ patient: 1, type: 1 });
familyMemorySchema.index({ 'moderation.isFlagged': 1, 'moderation.reviewStatus': 1 });

module.exports = mongoose.model('FamilyMemory', familyMemorySchema);
