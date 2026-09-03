const mongoose = require('mongoose');

const cognitiveMetricsSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String, // YYYY-MM-DD format
    required: true,
    index: true
  },
  
  // Daily aggregated scores (0-100)
  memoryScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  attentionScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  patternScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  
  // Daily statistics
  totalGamesPlayed: {
    type: Number,
    default: 0
  },
  avgAccuracy: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  avgCompletionTime: {
    type: Number, // seconds
    default: 0
  },
  
  // Engagement data
  engagementLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  sessionCount: {
    type: Number,
    default: 0
  },
  totalPlayTimeMinutes: {
    type: Number,
    default: 0
  },
  
  // Trend indicators
  trend: {
    memoryTrend: {
      type: String,
      enum: ['improving', 'stable', 'declining'],
      default: 'stable'
    },
    attentionTrend: {
      type: String,
      enum: ['improving', 'stable', 'declining'],
      default: 'stable'
    },
    patternTrend: {
      type: String,
      enum: ['improving', 'stable', 'declining'],
      default: 'stable'
    }
  },
  
  // Per-game daily metrics
  gameMetrics: [{
    gameType: String, // memoryMatching, pictureRecall, etc.
    timesPlayed: Number,
    avgScore: Number,
    avgAccuracy: Number,
    difficultyDistribution: {
      easy: Number,
      medium: Number,
      hard: Number
    }
  }],
  
  // Calculated weekly/monthly trends (computed from daily data)
  weeklyMetrics: {
    avgMemoryScore: Number,
    avgAttentionScore: Number,
    avgPatternScore: Number,
    totalSessionsThisWeek: Number,
    weekTrend: String
  },
  
  monthlyMetrics: {
    avgMemoryScore: Number,
    avgAttentionScore: Number,
    avgPatternScore: Number,
    totalSessionsThisMonth: Number,
    monthTrend: String
  },
  
  // Milestone tracking
  milestones: [{
    type: String,
    enum: [
      '7dayStreak',
      '30dayStreak',
      'levelUpMemory',
      'levelUpAttention',
      'levelUpPattern',
      '1000GamesPlayed',
      'consistentHighScore'
    ]
  }],
  
  // Quality flags for anomaly detection
  anomalies: [{
    type: String,
    default: null
  }],
  
  // Notes from caregiver or system
  notes: {
    type: String
  }
}, { timestamps: true });

// Compound index for patient + date queries
cognitiveMetricsSchema.index({ patient: 1, date: -1 });
cognitiveMetricsSchema.index({ patient: 1, 'trend.memoryTrend': 1 });
cognitiveMetricsSchema.index({ date: 1 }); // For bulk operations

// Static method: Get metrics for a date range
cognitiveMetricsSchema.statics.getMetricsRange = function (patientId, startDate, endDate) {
  return this.find({
    patient: patientId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });
};

// Static method: Get last N days of metrics
cognitiveMetricsSchema.statics.getRecentMetrics = function (patientId, days = 30) {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return this.getMetricsRange(patientId, startDate, endDate);
};

// Instance method: Calculate weekly average from daily data
cognitiveMetricsSchema.methods.calculateWeeklyMetrics = function () {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // This would be called after fetching related documents
  return {
    avgMemoryScore: this.memoryScore,
    avgAttentionScore: this.attentionScore,
    avgPatternScore: this.patternScore
  };
};

module.exports = mongoose.model('CognitiveMetrics', cognitiveMetricsSchema);
