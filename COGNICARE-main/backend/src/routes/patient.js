const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  getReminders,
  acknowledgeReminder,
  createReminder,
  updateReminder,
  deleteReminder,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  triggerSOS,
  getSOSHistory,
  getProgressSummary
} = require('../controllers/patientController');

// All patient routes require authentication
router.use(protect);

// ── Profile ──────────────────────────────
router.get('/profile', restrictTo('patient'), getProfile);
router.put('/profile', restrictTo('patient'), updateProfile);

// ── Progress summary ──────────────────────
router.get('/progress', restrictTo('patient'), getProgressSummary);

// ── Reminders (patient can also create/edit/delete their own) ──
router.get('/reminders',                   restrictTo('patient'), getReminders);
router.post('/reminders',                  restrictTo('patient'), createReminder);
router.patch('/reminders/:id/acknowledge', restrictTo('patient'), acknowledgeReminder);
router.put('/reminders/:id',               restrictTo('patient'), updateReminder);
router.delete('/reminders/:id',            restrictTo('patient'), deleteReminder);

// ── Family Vault (patient read + create/edit/delete their own) ──
router.get('/vault', restrictTo('patient'), async (req, res) => {
  try {
    const FamilyMemory = require('../models/FamilyMemory');
    const memories = await FamilyMemory.find({ patient: req.user._id })
      .sort({ isFavorite: -1, createdAt: -1 });
    res.json({ success: true, count: memories.length, data: memories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});
router.post('/vault', restrictTo('patient'), async (req, res) => {
  try {
    const FamilyMemory = require('../models/FamilyMemory');
    const { type, title, personName, relationship, description, photo, memoryHints, memoryDate, isFavorite, usedInGames } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required.' });
    const memory = await FamilyMemory.create({
      patient: req.user._id,
      addedBy: req.user._id,
      type: type || 'person',
      title,
      personName: personName || '',
      relationship: relationship || '',
      description: description || '',
      photo: photo || null,
      memoryHints: Array.isArray(memoryHints) ? memoryHints : (memoryHints || '').split(',').map(s => s.trim()).filter(Boolean),
      memoryDate: memoryDate || '',
      isFavorite: !!isFavorite,
      usedInGames: usedInGames !== false,
    });
    res.status(201).json({ success: true, data: memory });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});
router.put('/vault/:id', restrictTo('patient'), async (req, res) => {
  try {
    const FamilyMemory = require('../models/FamilyMemory');
    const memory = await FamilyMemory.findOneAndUpdate(
      { _id: req.params.id, patient: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!memory) return res.status(404).json({ success: false, message: 'Memory not found.' });
    res.json({ success: true, data: memory });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});
router.delete('/vault/:id', restrictTo('patient'), async (req, res) => {
  try {
    const FamilyMemory = require('../models/FamilyMemory');
    const memory = await FamilyMemory.findOneAndDelete({ _id: req.params.id, patient: req.user._id });
    if (!memory) return res.status(404).json({ success: false, message: 'Memory not found.' });
    res.json({ success: true, message: 'Memory deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── Notes ────────────────────────────────
router.get('/notes', restrictTo('patient'), getNotes);
router.post('/notes', restrictTo('patient'), createNote);
router.put('/notes/:id', restrictTo('patient'), updateNote);
router.delete('/notes/:id', restrictTo('patient'), deleteNote);

// ── SOS ──────────────────────────────────
router.post('/sos', restrictTo('patient'), triggerSOS);
router.get('/sos', restrictTo('patient'), getSOSHistory);

module.exports = router;
