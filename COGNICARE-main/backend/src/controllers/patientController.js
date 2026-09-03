const User = require('../models/User');
const Patient = require('../models/Patient');
const Reminder = require('../models/Reminder');
const Note = require('../models/Note');
const SOSAlert = require('../models/SOSAlert');

// ─────────────────────────────────────────
//  PROFILE
// ─────────────────────────────────────────

// @desc  Get patient profile
// @route GET /api/patient/profile
// @access Private (patient)
const getProfile = async (req, res) => {
  try {
    const patient = await Patient.findOne({ user: req.user._id })
      .populate('user', 'name email phone preferredLanguage lastLogin')
      .populate('caregiver', 'name email phone');

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    res.json({ success: true, data: patient });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Update patient profile
// @route PUT /api/patient/profile
// @access Private (patient)
const updateProfile = async (req, res) => {
  try {
    const { name, phone, dateOfBirth, gender, address, profilePhoto } = req.body;

    // Update User document
    if (name || phone) {
      await User.findByIdAndUpdate(req.user._id, {
        ...(name && { name }),
        ...(phone && { phone })
      });
    }

    // Update Patient document
    const updateData = {};
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
    if (gender) updateData.gender = gender;
    if (address) updateData.address = address;
    if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto;

    const patient = await Patient.findOneAndUpdate(
      { user: req.user._id },
      updateData,
      { new: true }
    ).populate('user', 'name email phone preferredLanguage');

    res.json({ success: true, data: patient, message: 'Profile updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────
//  REMINDERS
// ─────────────────────────────────────────

// @desc  Get all reminders for patient
// @route GET /api/patient/reminders
// @access Private (patient)
const getReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({
      patient: req.user._id,
      isActive: true
    }).sort({ time: 1 });

    res.json({ success: true, count: reminders.length, data: reminders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Acknowledge a reminder for today
// @route PATCH /api/patient/reminders/:id/acknowledge
// @access Private (patient)
const acknowledgeReminder = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      patient: req.user._id
    });

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found.' });
    }

    if (!reminder.acknowledgedDates.includes(today)) {
      reminder.acknowledgedDates.push(today);
      await reminder.save();
    }

    res.json({ success: true, message: 'Reminder acknowledged.', data: reminder });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Create a reminder (patient creates their own)
// @route POST /api/patient/reminders
// @access Private (patient)
const createReminder = async (req, res) => {
  try {
    const { type, title, description, time, days, isRecurring, icon } = req.body;
    if (!type || !title || !time) {
      return res.status(400).json({ success: false, message: 'type, title, and time are required.' });
    }
    const iconMap = {
      medicine: '💊', meal: '🍽️', appointment: '📅',
      water: '💧', exercise: '🏃', activity: '🧩', other: '📌'
    };
    const reminder = await Reminder.create({
      patient: req.user._id,
      createdBy: req.user._id,
      type,
      title,
      description: description || '',
      time,
      days: days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      isRecurring: isRecurring !== false,
      icon: icon || iconMap[type] || '📌',
    });
    res.status(201).json({ success: true, data: reminder, message: 'Reminder created.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Update a reminder (patient)
// @route PUT /api/patient/reminders/:id
// @access Private (patient)
const updateReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, patient: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found.' });
    res.json({ success: true, data: reminder });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Delete a reminder (patient)
// @route DELETE /api/patient/reminders/:id
// @access Private (patient)
const deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, patient: req.user._id });
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found.' });
    res.json({ success: true, message: 'Reminder deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────
//  NOTES
// ─────────────────────────────────────────

// @desc  Get all notes
// @route GET /api/patient/notes
// @access Private (patient)
const getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ patient: req.user._id })
      .sort({ isPinned: -1, createdAt: -1 });

    res.json({ success: true, count: notes.length, data: notes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Create a note
// @route POST /api/patient/notes
// @access Private (patient)
const createNote = async (req, res) => {
  try {
    const { title, content, isTask, color } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    const note = await Note.create({
      patient: req.user._id,
      title,
      content: content || '',
      isTask: isTask || false,
      color: color || '#FFF9C4'
    });

    res.status(201).json({ success: true, data: note, message: 'Note created.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Update a note
// @route PUT /api/patient/notes/:id
// @access Private (patient)
const updateNote = async (req, res) => {
  try {
    const { title, content, isPinned, color, taskCompleted } = req.body;

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, patient: req.user._id },
      { title, content, isPinned, color, taskCompleted },
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    res.json({ success: true, data: note, message: 'Note updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Delete a note
// @route DELETE /api/patient/notes/:id
// @access Private (patient)
const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      patient: req.user._id
    });

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    res.json({ success: true, message: 'Note deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────
//  SOS ALERTS
// ─────────────────────────────────────────

// @desc  Trigger SOS alert
// @route POST /api/patient/sos
// @access Private (patient)
const triggerSOS = async (req, res) => {
  try {
    const { message } = req.body;

    // Find linked caregiver
    const patientProfile = await Patient.findOne({ user: req.user._id });

    const alert = await SOSAlert.create({
      patient: req.user._id,
      caregiver: patientProfile?.caregiver || null,
      message: message || 'Patient needs immediate assistance!',
      status: 'sent'
    });

    // Populate for response
    await alert.populate('patient', 'name phone');

    res.status(201).json({
      success: true,
      data: alert,
      message: 'SOS alert sent to your caregiver.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Get SOS history for patient
// @route GET /api/patient/sos
// @access Private (patient)
const getSOSHistory = async (req, res) => {
  try {
    const alerts = await SOSAlert.find({ patient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────
//  PROGRESS SUMMARY
// ─────────────────────────────────────────

// @desc  Get patient progress summary (for patient dashboard)
// @route GET /api/patient/progress
// @access Private (patient)
const getProgressSummary = async (req, res) => {
  try {
    const Performance = require('../models/Performance');

    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    // Last 7 days of performances
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentPerformances = await Performance.find({
      patient: req.user._id,
      createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: -1 });

    // Average scores by game type
    const gameStats = {};
    recentPerformances.forEach(p => {
      if (!gameStats[p.gameType]) {
        gameStats[p.gameType] = { totalScore: 0, count: 0, avgAccuracy: 0 };
      }
      gameStats[p.gameType].totalScore += p.score;
      gameStats[p.gameType].avgAccuracy += p.accuracy;
      gameStats[p.gameType].count += 1;
    });

    Object.keys(gameStats).forEach(k => {
      gameStats[k].avgScore = Math.round(gameStats[k].totalScore / gameStats[k].count);
      gameStats[k].avgAccuracy = Math.round(gameStats[k].avgAccuracy / gameStats[k].count);
    });

    res.json({
      success: true,
      data: {
        cognitiveProfile: patient.cognitiveProfile,
        gameDifficulty: patient.gameDifficulty,
        totalActivitiesCompleted: patient.totalActivitiesCompleted,
        streakDays: patient.streakDays,
        lastActivityDate: patient.lastActivityDate,
        recentPerformances: recentPerformances.slice(0, 10),
        gameStats
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
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
};
