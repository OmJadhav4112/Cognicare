const User = require('../models/User');
const Patient = require('../models/Patient');
const Caregiver = require('../models/Caregiver');
const Performance = require('../models/Performance');
const Reminder = require('../models/Reminder');
const FamilyMemory = require('../models/FamilyMemory');
const SOSAlert = require('../models/SOSAlert');
const CaregiverFeedback = require('../models/CaregiverFeedback');
const moderationService = require('../services/moderationService');

// ─────────────────────────────────────────
//  HELPER: verify caregiver owns this patient
// ─────────────────────────────────────────
const verifyPatientAccess = async (caregiverId, patientUserId) => {
  const patient = await Patient.findOne({ user: patientUserId });
  if (!patient) return null;
  if (!patient.caregiver || patient.caregiver.toString() !== caregiverId.toString()) return null;
  return patient;
};

// ─────────────────────────────────────────
//  CAREGIVER PROFILE
// ─────────────────────────────────────────

// @desc  Get caregiver profile + linked patients list
// @route GET /api/caregiver/profile
// @access Private (caregiver)
const getProfile = async (req, res) => {
  try {
    const caregiver = await Caregiver.findOne({ user: req.user._id })
      .populate('patients', 'name email phone lastLogin');

    if (!caregiver) {
      return res.status(404).json({ success: false, message: 'Caregiver profile not found.' });
    }

    res.json({ success: true, data: caregiver });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Link a patient to this caregiver using patient's user ID or email
// @route POST /api/caregiver/link-patient
// @access Private (caregiver)
const linkPatient = async (req, res) => {
  try {
    const { patientUserId, patientEmail } = req.body;

    if (!patientUserId && !patientEmail) {
      return res.status(400).json({ success: false, message: 'patientUserId or patientEmail is required.' });
    }

    // Look up patient by email or ID
    let patientUser;
    if (patientEmail) {
      patientUser = await User.findOne({ email: patientEmail.toLowerCase().trim(), role: 'patient' });
    } else {
      patientUser = await User.findOne({ _id: patientUserId, role: 'patient' });
    }

    if (!patientUser) {
      return res.status(404).json({ success: false, message: 'No patient account found with that email.' });
    }

    // Prevent self-link
    if (patientUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot link yourself as a patient.' });
    }

    // Check if already linked to this caregiver
    const caregiverDoc = await Caregiver.findOne({ user: req.user._id });
    if (caregiverDoc?.patients?.map(p => p.toString()).includes(patientUser._id.toString())) {
      return res.status(400).json({ success: false, message: `${patientUser.name} is already linked to your account.` });
    }

    // Link patient → caregiver
    await Patient.findOneAndUpdate(
      { user: patientUser._id },
      { caregiver: req.user._id }
    );

    // Add to caregiver's patient list (prevent duplicates)
    await Caregiver.findOneAndUpdate(
      { user: req.user._id },
      { $addToSet: { patients: patientUser._id } }
    );

    res.json({
      success: true,
      message: `${patientUser.name} has been linked to your account.`,
      patient: {
        _id: patientUser._id,
        name: patientUser.name,
        email: patientUser.email,
      },
    });
  } catch (err) {
    console.error('[caregiverController] linkPatient error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────
//  PATIENT MONITORING
// ─────────────────────────────────────────

// @desc  Get patient overview (profile + cognitive profile + recent activity)
// @route GET /api/caregiver/patients/:patientId/overview
// @access Private (caregiver)
const getPatientOverview = async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId);
    if (!patient) {
      return res.status(403).json({ success: false, message: 'Not authorized or patient not found.' });
    }

    const patientUser = await User.findById(req.params.patientId).select('-password');

    // Last 7 days performance
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentPerf = await Performance.find({
      patient: req.params.patientId,
      createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: -1 });

    // Unacknowledged SOS alerts
    const pendingSOS = await SOSAlert.find({
      patient: req.params.patientId,
      status: 'sent'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        user: patientUser,
        cognitiveProfile: patient.cognitiveProfile,
        gameDifficulty: patient.gameDifficulty,
        totalActivitiesCompleted: patient.totalActivitiesCompleted,
        streakDays: patient.streakDays,
        lastActivityDate: patient.lastActivityDate,
        recentPerformances: recentPerf,
        pendingSOS
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Get patient game history (all or filtered by gameType)
// @route GET /api/caregiver/patients/:patientId/history
// @access Private (caregiver)
const getPatientHistory = async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId);
    if (!patient) {
      return res.status(403).json({ success: false, message: 'Not authorized or patient not found.' });
    }

    const { gameType, limit = 30, page = 1 } = req.query;
    const filter = { patient: req.params.patientId };
    if (gameType) filter.gameType = gameType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [performances, total] = await Promise.all([
      Performance.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Performance.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: performances.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: performances
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────
//  SOS ALERTS
// ─────────────────────────────────────────

// @desc  Get all SOS alerts for caregiver's patients
// @route GET /api/caregiver/sos
// @access Private (caregiver)
const getSOSAlerts = async (req, res) => {
  try {
    const alerts = await SOSAlert.find({ caregiver: req.user._id })
      .populate('patient', 'name phone')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Acknowledge an SOS alert
// @route PATCH /api/caregiver/sos/:alertId/acknowledge
// @access Private (caregiver)
const acknowledgeSOSAlert = async (req, res) => {
  try {
    const alert = await SOSAlert.findOne({
      _id: req.params.alertId,
      caregiver: req.user._id
    });
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found.' });
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    if (req.body.caregiverNote) alert.caregiverNote = req.body.caregiverNote;
    await alert.save();

    res.json({ success: true, data: alert, message: 'SOS alert acknowledged.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Resolve an SOS alert
// @route PATCH /api/caregiver/sos/:alertId/resolve
// @access Private (caregiver)
const resolveSOSAlert = async (req, res) => {
  try {
    const alert = await SOSAlert.findOne({
      _id: req.params.alertId,
      caregiver: req.user._id
    });
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found.' });
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    if (req.body.caregiverNote) alert.caregiverNote = req.body.caregiverNote;
    await alert.save();

    res.json({ success: true, data: alert, message: 'SOS alert resolved.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────
//  REMINDERS (caregiver manages)
// ─────────────────────────────────────────

// @desc  Get all reminders for a patient
// @route GET /api/caregiver/patients/:patientId/reminders
// @access Private (caregiver)
const getReminders = async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId);
    if (!patient) return res.status(403).json({ success: false, message: 'Not authorized.' });

    const reminders = await Reminder.find({ patient: req.params.patientId }).sort({ time: 1 });
    res.json({ success: true, count: reminders.length, data: reminders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Create a reminder for a patient
// @route POST /api/caregiver/patients/:patientId/reminders
// @access Private (caregiver)
const createReminder = async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId);
    if (!patient) return res.status(403).json({ success: false, message: 'Not authorized.' });

    const { type, title, description, time, days, isRecurring, icon } = req.body;

    if (!type || !title || !time) {
      return res.status(400).json({ success: false, message: 'type, title, and time are required.' });
    }

    const iconMap = {
      medicine: '💊', meal: '🍽️', appointment: '📅',
      water: '💧', exercise: '🏃', activity: '🧩', other: '📌'
    };

    const reminder = await Reminder.create({
      patient: req.params.patientId,
      createdBy: req.user._id,
      type,
      title,
      description: description || '',
      time,
      days: days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      isRecurring: isRecurring !== false,
      icon: icon || iconMap[type] || '📌'
    });

    res.status(201).json({ success: true, data: reminder, message: 'Reminder created.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Update a reminder
// @route PUT /api/caregiver/patients/:patientId/reminders/:reminderId
// @access Private (caregiver)
const updateReminder = async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId);
    if (!patient) return res.status(403).json({ success: false, message: 'Not authorized.' });

    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.reminderId, patient: req.params.patientId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found.' });

    res.json({ success: true, data: reminder, message: 'Reminder updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Delete a reminder
// @route DELETE /api/caregiver/patients/:patientId/reminders/:reminderId
// @access Private (caregiver)
const deleteReminder = async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId);
    if (!patient) return res.status(403).json({ success: false, message: 'Not authorized.' });

    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.reminderId,
      patient: req.params.patientId
    });

    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found.' });

    res.json({ success: true, message: 'Reminder deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────
//  FAMILY MEMORY VAULT
// ─────────────────────────────────────────

// @desc  Get all family memories for a patient
// @route GET /api/caregiver/patients/:patientId/memories
// @access Private (caregiver)
const getMemories = async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId);
    if (!patient) return res.status(403).json({ success: false, message: 'Not authorized.' });

    const { type } = req.query;
    const filter = { patient: req.params.patientId };
    if (type) filter.type = type;

    const memories = await FamilyMemory.find(filter)
      .sort({ isFavorite: -1, createdAt: -1 });

    res.json({ success: true, count: memories.length, data: memories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Add a family memory
// @route POST /api/caregiver/patients/:patientId/memories
// @access Private (caregiver)
const addMemory = async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId);
    if (!patient) return res.status(403).json({ success: false, message: 'Not authorized.' });

    const {
      type, title, description, photo,
      personName, relationship, memoryHints,
      memoryDate, isFavorite, usedInGames
    } = req.body;

    if (!type || !title) {
      return res.status(400).json({ success: false, message: 'type and title are required.' });
    }

    // Create memory with default moderation state
    const memory = await FamilyMemory.create({
      patient: req.params.patientId,
      addedBy: req.user._id,
      type,
      title,
      description: description || '',
      photo: photo || null,
      personName: personName || '',
      relationship: relationship || '',
      memoryHints: memoryHints || [],
      memoryDate: memoryDate || '',
      isFavorite: isFavorite || false,
      usedInGames: usedInGames !== false,
      moderation: {
        isFlagged: false,
        reviewStatus: 'none'
      }
    });

    // Run moderation checks asynchronously
    setImmediate(async () => {
      try {
        // Check text content (title, description, personName)
        const textToCheck = [
          memory.title,
          memory.description,
          memory.personName,
          ...(memory.memoryHints || [])
        ].filter(Boolean).join(' ');

        const textAnalysis = await moderationService.moderateText(textToCheck);

        // Check image if provided
        let imageAnalysis = { isFlagged: false };
        if (memory.photo && memory.photo.startsWith('data:')) {
          try {
            const base64 = memory.photo.split(',')[1];
            const buffer = Buffer.from(base64, 'base64');
            imageAnalysis = await moderationService.moderateImage(buffer);
          } catch (imgErr) {
            console.error('[Moderation] Image analysis error:', imgErr.message);
          }
        }

        // Flag if either text or image analysis detected issues
        if (textAnalysis.isFlagged || imageAnalysis.isFlagged) {
          const reason = textAnalysis.isFlagged ? textAnalysis.reason : imageAnalysis.reason;
          const severity = textAnalysis.isFlagged ? textAnalysis.severity : imageAnalysis.severity;
          const details = {
            ...textAnalysis.details,
            imageAnalysis: imageAnalysis.imageAnalysis
          };

          await moderationService.flagMemory(
            memory._id,
            reason,
            severity,
            details,
            'system'
          );
          console.log(`[Moderation] Memory ${memory._id} auto-flagged: ${reason}`);
        }
      } catch (modErr) {
        console.error('[Moderation] Background moderation check failed:', modErr.message);
        // Don't fail the memory creation if moderation fails
      }
    });

    res.status(201).json({ success: true, data: memory, message: 'Memory added to the vault.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Update a family memory
// @route PUT /api/caregiver/patients/:patientId/memories/:memoryId
// @access Private (caregiver)
const updateMemory = async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId);
    if (!patient) return res.status(403).json({ success: false, message: 'Not authorized.' });

    const memory = await FamilyMemory.findOneAndUpdate(
      { _id: req.params.memoryId, patient: req.params.patientId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!memory) return res.status(404).json({ success: false, message: 'Memory not found.' });

    res.json({ success: true, data: memory, message: 'Memory updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Delete a family memory
// @route DELETE /api/caregiver/patients/:patientId/memories/:memoryId
// @access Private (caregiver)
const deleteMemory = async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId);
    if (!patient) return res.status(403).json({ success: false, message: 'Not authorized.' });

    const memory = await FamilyMemory.findOneAndDelete({
      _id: req.params.memoryId,
      patient: req.params.patientId
    });

    if (!memory) return res.status(404).json({ success: false, message: 'Memory not found.' });

    res.json({ success: true, message: 'Memory removed from vault.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────
//  CAREGIVER FEEDBACK
// ─────────────────────────────────────────

// @desc  Submit caregiver observation/feedback for a patient
// @route POST /api/caregiver/patients/:patientId/feedback
// @access Private (caregiver)
const submitFeedback = async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId);
    if (!patient) return res.status(403).json({ success: false, message: 'Not authorized.' });

    const {
      patientMood, observationText,
      gamePreferences, difficultyFeedback,
      suggestedActivities, influencesAI
    } = req.body;

    const feedback = await CaregiverFeedback.create({
      caregiver: req.user._id,
      patient: req.params.patientId,
      patientMood: patientMood || 'neutral',
      observationText: observationText || '',
      gamePreferences: gamePreferences || [],
      difficultyFeedback: difficultyFeedback || '',
      suggestedActivities: suggestedActivities || [],
      influencesAI: influencesAI !== false
    });

    res.status(201).json({
      success: true,
      data: feedback,
      message: 'Feedback submitted. It will influence future activity recommendations.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc  Get feedback history for a patient
// @route GET /api/caregiver/patients/:patientId/feedback
// @access Private (caregiver)
const getFeedbackHistory = async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId);
    if (!patient) return res.status(403).json({ success: false, message: 'Not authorized.' });

    const feedbacks = await CaregiverFeedback.find({
      patient: req.params.patientId,
      caregiver: req.user._id
    }).sort({ createdAt: -1 }).limit(20);

    res.json({ success: true, count: feedbacks.length, data: feedbacks });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getProfile,
  linkPatient,
  getPatientOverview,
  getPatientHistory,
  getSOSAlerts,
  acknowledgeSOSAlert,
  resolveSOSAlert,
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  getMemories,
  addMemory,
  updateMemory,
  deleteMemory,
  submitFeedback,
  getFeedbackHistory
};
