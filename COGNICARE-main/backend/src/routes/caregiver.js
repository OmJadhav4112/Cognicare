const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
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
} = require('../controllers/caregiverController');

// All caregiver routes require authentication + caregiver role
router.use(protect, restrictTo('caregiver'));

// ── Caregiver profile ─────────────────────────────
router.get('/profile', getProfile);
router.post('/link-patient', linkPatient);

// ── SOS alerts (across all linked patients) ──────
router.get('/sos', getSOSAlerts);
router.patch('/sos/:alertId/acknowledge', acknowledgeSOSAlert);
router.patch('/sos/:alertId/resolve', resolveSOSAlert);

// ── Per-patient routes ────────────────────────────
// Monitoring
router.get('/patients/:patientId/overview', getPatientOverview);
router.get('/patients/:patientId/history', getPatientHistory);

// Reminders
router.get('/patients/:patientId/reminders', getReminders);
router.post('/patients/:patientId/reminders', createReminder);
router.put('/patients/:patientId/reminders/:reminderId', updateReminder);
router.delete('/patients/:patientId/reminders/:reminderId', deleteReminder);

// Family Memory Vault
router.get('/patients/:patientId/memories', getMemories);
router.post('/patients/:patientId/memories', addMemory);
router.put('/patients/:patientId/memories/:memoryId', updateMemory);
router.delete('/patients/:patientId/memories/:memoryId', deleteMemory);

// Feedback
router.get('/patients/:patientId/feedback', getFeedbackHistory);
router.post('/patients/:patientId/feedback', submitFeedback);

module.exports = router;
