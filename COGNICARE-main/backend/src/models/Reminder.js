const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['medicine', 'meal', 'appointment', 'water', 'exercise', 'activity', 'other'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  time: {
    type: String, // HH:MM format
    required: true
  },
  days: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],
  isRecurring: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Track acknowledgements
  acknowledgedDates: [{
    type: String // YYYY-MM-DD
  }],
  icon: {
    type: String,
    default: '💊'
  }
}, { timestamps: true });

reminderSchema.index({ patient: 1, isActive: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
