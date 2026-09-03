const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  caregiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  profilePhoto: {
    type: String, // base64 or URL
    default: null
  },
  address: {
    type: String
  },
  // Cognitive profile — updated by AI engine
  cognitiveProfile: {
    overallLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    memoryScore: { type: Number, default: 50 },      // 0-100
    attentionScore: { type: Number, default: 50 },   // 0-100
    patternScore: { type: Number, default: 50 },     // 0-100
    lastUpdated: { type: Date, default: Date.now }
  },
  // Per-game difficulty levels
  gameDifficulty: {
    memoryMatching: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    pictureRecall: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    sequenceMemory: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    patternAttention: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' }
  },
  totalActivitiesCompleted: {
    type: Number,
    default: 0
  },
  streakDays: {
    type: Number,
    default: 0
  },
  lastActivityDate: {
    type: Date,
    default: null
  },
  medicalNotes: {
    type: String,
    default: ''
  },
  
  // New: Accessibility preferences (WCAG 2.1 AA compliant)
  accessibilitySettings: {
    // Font size preference
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large', 'x-large'],
      default: 'large'
    },
    
    // High contrast mode
    highContrast: {
      type: Boolean,
      default: false
    },
    
    // Audio descriptions for visuals
    audioDescriptions: {
      type: Boolean,
      default: false
    },
    
    // Reduce animations
    reduceAnimations: {
      type: Boolean,
      default: false
    },
    
    // Keyboard-only navigation
    keyboardNavOnly: {
      type: Boolean,
      default: false
    },
    
    // Focus indicators enhancement
    enhancedFocusIndicators: {
      type: Boolean,
      default: false
    },
    
    // Color blind mode
    colorBlindMode: {
      type: String,
      enum: ['none', 'deuteranopia', 'protanopia', 'tritanopia'],
      default: 'none'
    },
    
    // Text to speech
    textToSpeech: {
      type: Boolean,
      default: false
    },
    
    // Speech rate (if text-to-speech enabled)
    speechRate: {
      type: Number,
      min: 0.5,
      max: 2.0,
      default: 1.0
    },
    
    // Reading guide (highlight line being read)
    readingGuide: {
      type: Boolean,
      default: false
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
