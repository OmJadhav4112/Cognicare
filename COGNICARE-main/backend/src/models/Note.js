const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    default: '',
    maxlength: 2000
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#FFF9C4' // light yellow — easy on eyes
  },
  isTask: {
    type: Boolean,
    default: false
  },
  taskCompleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

noteSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
