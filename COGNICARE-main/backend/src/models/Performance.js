const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameType: {
    type: String,
    enum: ['memoryMatching', 'pictureRecall', 'sequenceMemory', 'patternAttention'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  // Raw performance data
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  accuracy: {
    type: Number, // percentage 0-100
    required: true
  },
  completionTimeSeconds: {
    type: Number, // seconds taken to complete
    required: true
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  mistakes: {
    type: Number,
    default: 0
  },
  hintsUsed: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: true
  },
  // NER cultural theme used
  culturalTheme: {
    type: String,
    default: 'general'
  },
  // AI-generated feedback stored per session
  aiFeedback: {
    type: String,
    default: ''
  },
  // Session date (for grouping by day)
  sessionDate: {
    type: String // YYYY-MM-DD
  },
  
  // Enhanced: Difficulty progression tracking
  difficultyProgression: {
    previousDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard']
    },
    recommendedNextDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard']
    },
    difficultyChangedAt: Date,
    reason: String // e.g., "consistent high scores", "struggling with current level"
  },
  
  // Enhanced: Performance metrics for trend analysis
  performanceMetrics: {
    reactionTimeMs: Number,           // Average reaction time in milliseconds
    consistencyScore: Number,         // 0-100: how consistent was performance
    engagementLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    focusIndicator: Number,          // 0-100: estimated focus level
    learningTrend: {
      type: String,
      enum: ['improving', 'stable', 'declining'],
      default: 'stable'
    }
  },
  
  // Caregiver feedback on this session (if provided)
  caregiverFeedback: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CaregiverFeedback'
  },
  
  // Session quality indicators
  sessionQuality: {
    isOptimal: Boolean,               // Met engagement targets
    hasEngagementDip: Boolean,        // Did user disengage mid-session
    requiresReview: Boolean           // Flagged for caregiver review
  }
}, { timestamps: true });

// Index for fast queries by patient and date
performanceSchema.index({ patient: 1, createdAt: -1 });
performanceSchema.index({ patient: 1, gameType: 1 });
performanceSchema.index({ patient: 1, sessionDate: 1 });
performanceSchema.index({ patient: 1, 'performanceMetrics.learningTrend': 1 });

module.exports = mongoose.model('Performance', performanceSchema);
