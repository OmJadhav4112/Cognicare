const mongoose = require('mongoose');

const engagementMetricsSchema = new mongoose.Schema({
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
  
  // Game engagement
  gamesPlayedToday: {
    type: Number,
    default: 0,
    min: 0
  },
  totalGameMinutesToday: {
    type: Number,
    default: 0,
    min: 0
  },
  avgGameDuration: {
    type: Number, // minutes
    default: 0
  },
  
  // Game completion rates
  gamesCompleted: {
    type: Number,
    default: 0
  },
  gamesAbandoned: {
    type: Number,
    default: 0
  },
  completionRate: {
    type: Number, // percentage
    min: 0,
    max: 100,
    default: 0
  },
  
  // Reminder engagement
  remindersTotal: {
    type: Number,
    default: 0
  },
  remindersAcknowledged: {
    type: Number,
    default: 0
  },
  remindersIgnored: {
    type: Number,
    default: 0
  },
  reminderCompletionRate: {
    type: Number, // percentage
    min: 0,
    max: 100,
    default: 0
  },
  
  // Session data
  sessionsToday: {
    type: Number,
    default: 0
  },
  avgSessionDuration: {
    type: Number, // minutes
    default: 0
  },
  longestSessionDuration: {
    type: Number, // minutes
    default: 0
  },
  
  // Streak tracking
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  
  // Last activity
  lastActiveTime: {
    type: Date,
    default: Date.now
  },
  lastGamePlayedType: {
    type: String,
    enum: ['memoryMatching', 'pictureRecall', 'sequenceMemory', 'patternAttention']
  },
  
  // Engagement score (0-100)
  engagementScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  
  // Engagement status
  engagementStatus: {
    type: String,
    enum: ['highly-engaged', 'engaged', 'moderately-engaged', 'low-engagement', 'inactive'],
    default: 'moderately-engaged'
  },
  
  // Trend indicators
  engagementTrend: {
    type: String,
    enum: ['improving', 'stable', 'declining'],
    default: 'stable'
  },
  
  // Behavioral patterns
  preferencedGameType: String,       // Most played game
  preferencedGameDifficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard']
  },
  
  // Weekly/monthly aggregate data
  weeklyEngagementScore: {
    type: Number,
    min: 0,
    max: 100
  },
  monthlyEngagementScore: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Alerts and flags
  alertFlags: [{
    type: String,
    enum: [
      'noActivityToday',
      'remindersMissed',
      'gameAbandonment',
      'lowEngagementTrend',
      'unusualActivityPattern'
    ]
  }],
  
  // Caregiver notes
  caregiverNotes: {
    type: String
  }
}, { timestamps: true });

// Indexes
engagementMetricsSchema.index({ patient: 1, date: -1 });
engagementMetricsSchema.index({ patient: 1, engagementStatus: 1 });
engagementMetricsSchema.index({ engagementStatus: 1 }); // For alerts
engagementMetricsSchema.index({ date: 1 }); // For bulk updates

// Static method: Get engagement over time range
engagementMetricsSchema.statics.getEngagementRange = function (patientId, startDate, endDate) {
  return this.find({
    patient: patientId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: -1 });
};

// Static method: Get patients with low engagement (for alerts)
engagementMetricsSchema.statics.getLowEngagementPatients = function (threshold = 30) {
  const today = new Date().toISOString().split('T')[0];
  return this.find({
    date: today,
    engagementScore: { $lt: threshold }
  }).populate('patient', 'name email');
};

// Instance method: Calculate engagement score
engagementMetricsSchema.methods.calculateEngagementScore = function () {
  let score = 0;
  
  // Games played weight (max 40 points)
  const gamesWeight = Math.min(this.gamesPlayedToday * 8, 40);
  
  // Reminder completion weight (max 30 points)
  const reminderWeight = this.reminderCompletionRate * 0.3;
  
  // Session consistency weight (max 30 points)
  const sessionWeight = Math.min(this.sessionsToday * 10, 30);
  
  score = gamesWeight + reminderWeight + sessionWeight;
  return Math.min(Math.round(score), 100);
};

// Instance method: Determine engagement status
engagementMetricsSchema.methods.determineEngagementStatus = function () {
  const score = this.engagementScore;
  
  if (score >= 75) return 'highly-engaged';
  if (score >= 60) return 'engaged';
  if (score >= 40) return 'moderately-engaged';
  if (score >= 20) return 'low-engagement';
  return 'inactive';
};

module.exports = mongoose.model('EngagementMetrics', engagementMetricsSchema);
