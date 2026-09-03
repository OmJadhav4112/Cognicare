const mongoose = require('mongoose');

const caregiverFeedbackSchema = new mongoose.Schema({
  caregiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // General mood/behaviour observation
  patientMood: {
    type: String,
    enum: ['very_good', 'good', 'neutral', 'poor', 'very_poor'],
    default: 'neutral'
  },
  observationText: {
    type: String,
    default: '',
    maxlength: 2000
  },
  // Game-specific feedback
  gamePreferences: [{
    gameType: String,
    liked: Boolean,
    notes: String
  }],
  // Difficulty feedback
  difficultyFeedback: {
    type: String,
    enum: ['too_easy', 'just_right', 'too_hard', ''],
    default: ''
  },
  // Suggested activity types
  suggestedActivities: [{
    type: String
  }],
  // Flag to influence AI recommendations
  influencesAI: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

caregiverFeedbackSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('CaregiverFeedback', caregiverFeedbackSchema);
