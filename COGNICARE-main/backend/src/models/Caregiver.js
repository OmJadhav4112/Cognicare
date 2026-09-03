const mongoose = require('mongoose');

const caregiverSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  patients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  relationship: {
    type: String,
    enum: ['family', 'professional', 'friend', 'other'],
    default: 'family'
  },
  organization: {
    type: String,
    default: ''
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Caregiver', caregiverSchema);
