const mongoose = require('mongoose');

const sosAlertSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  caregiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  message: {
    type: String,
    default: 'Patient needs immediate assistance!'
  },
  status: {
    type: String,
    enum: ['sent', 'acknowledged', 'resolved'],
    default: 'sent'
  },
  acknowledgedAt: {
    type: Date,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  caregiverNote: {
    type: String,
    default: ''
  }
}, { timestamps: true });

sosAlertSchema.index({ patient: 1, createdAt: -1 });
sosAlertSchema.index({ caregiver: 1, status: 1 });

module.exports = mongoose.model('SOSAlert', sosAlertSchema);
