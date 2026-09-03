const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  registerFCMToken,
  unregisterFCMToken,
  sendPushNotification
} = require('../services/notificationService');
const NotificationPreference = require('../models/NotificationPreference');
const { body, validationResult } = require('express-validator');

/**
 * @route   POST /api/notifications/register-token
 * @desc    Register FCM token for push notifications
 * @access  Private
 */
router.post(
  '/register-token',
  protect,
  restrictTo('caregiver'),
  [
    body('token').notEmpty().withMessage('FCM token is required'),
    body('deviceName').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { token, deviceName } = req.body;
      const result = await registerFCMToken(req.user._id, token, deviceName);

      res.json({
        success: result.success,
        message: result.message,
        data: result.prefs
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route   POST /api/notifications/unregister-token
 * @desc    Unregister FCM token (device logout)
 * @access  Private
 */
router.post(
  '/unregister-token',
  protect,
  restrictTo('caregiver'),
  [body('token').notEmpty().withMessage('FCM token is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { token } = req.body;
      const result = await unregisterFCMToken(req.user._id, token);

      res.json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get caregiver notification preferences
 * @access  Private
 */
router.get(
  '/preferences',
  protect,
  restrictTo('caregiver'),
  async (req, res) => {
    try {
      const prefs = await NotificationPreference.findOne({ caregiver: req.user._id });

      if (!prefs) {
        // Create default preferences
        const newPrefs = await NotificationPreference.create({
          caregiver: req.user._id
        });
        return res.json({ success: true, data: newPrefs });
      }

      res.json({ success: true, data: prefs });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route   PATCH /api/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.patch(
  '/preferences',
  protect,
  restrictTo('caregiver'),
  async (req, res) => {
    try {
      const { sosAlert, lowEngagement, gameMilestone, reminders, performanceReport, quietHours, dailyDigest } = req.body;

      const updates = {};
      if (sosAlert) updates.sosAlert = sosAlert;
      if (lowEngagement) updates.lowEngagement = lowEngagement;
      if (gameMilestone) updates.gameMilestone = gameMilestone;
      if (reminders) updates.reminders = reminders;
      if (performanceReport) updates.performanceReport = performanceReport;
      if (quietHours) updates.quietHours = quietHours;
      if (dailyDigest) updates.dailyDigest = dailyDigest;

      const prefs = await NotificationPreference.findOneAndUpdate(
        { caregiver: req.user._id },
        updates,
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'Notification preferences updated',
        data: prefs
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route   PATCH /api/notifications/quiet-hours
 * @desc    Set quiet hours
 * @access  Private
 */
router.patch(
  '/quiet-hours',
  protect,
  restrictTo('caregiver'),
  [
    body('enabled').isBoolean(),
    body('startTime').optional().matches(/^\d{2}:\d{2}$/),
    body('endTime').optional().matches(/^\d{2}:\d{2}$/),
    body('timezone').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { enabled, startTime, endTime, timezone } = req.body;

      const update = {
        'quietHours.enabled': enabled
      };
      if (startTime) update['quietHours.startTime'] = startTime;
      if (endTime) update['quietHours.endTime'] = endTime;
      if (timezone) update['quietHours.timezone'] = timezone;

      const prefs = await NotificationPreference.findOneAndUpdate(
        { caregiver: req.user._id },
        update,
        { new: true }
      );

      res.json({
        success: true,
        message: 'Quiet hours updated',
        data: prefs
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route   POST /api/notifications/do-not-disturb
 * @desc    Enable do-not-disturb mode
 * @access  Private
 */
router.post(
  '/do-not-disturb',
  protect,
  restrictTo('caregiver'),
  [
    body('durationMinutes').isInt({ min: 15, max: 1440 }).withMessage('Duration must be 15-1440 minutes')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { durationMinutes } = req.body;
      const until = new Date(Date.now() + durationMinutes * 60 * 1000);

      const prefs = await NotificationPreference.findOneAndUpdate(
        { caregiver: req.user._id },
        {
          'doNotDisturb.enabled': true,
          'doNotDisturb.until': until
        },
        { new: true }
      );

      res.json({
        success: true,
        message: `Do-not-disturb enabled until ${until.toISOString()}`,
        data: prefs
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route   POST /api/notifications/do-not-disturb/disable
 * @desc    Disable do-not-disturb mode
 * @access  Private
 */
router.post(
  '/do-not-disturb/disable',
  protect,
  restrictTo('caregiver'),
  async (req, res) => {
    try {
      const prefs = await NotificationPreference.findOneAndUpdate(
        { caregiver: req.user._id },
        { 'doNotDisturb.enabled': false },
        { new: true }
      );

      res.json({
        success: true,
        message: 'Do-not-disturb disabled',
        data: prefs
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route   GET /api/notifications/active-devices
 * @desc    Get list of active registered devices
 * @access  Private
 */
router.get(
  '/active-devices',
  protect,
  restrictTo('caregiver'),
  async (req, res) => {
    try {
      const prefs = await NotificationPreference.findOne({ caregiver: req.user._id });

      if (!prefs) {
        return res.json({ success: true, data: [] });
      }

      const devices = prefs.fcmTokens.map(ft => ({
        deviceName: ft.deviceName,
        registeredAt: ft.createdAt
      }));

      res.json({ success: true, data: devices, count: devices.length });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route   POST /api/notifications/test
 * @desc    Send test notification (for debugging)
 * @access  Private
 */
router.post(
  '/test',
  protect,
  restrictTo('caregiver'),
  async (req, res) => {
    try {
      const result = await sendPushNotification(
        req.user._id,
        'Test Notification',
        'This is a test notification from DementiaCare+',
        { type: 'test' },
        'general'
      );

      res.json({
        success: result.success,
        message: result.success ? 'Test notification sent' : 'Failed to send test notification',
        details: result
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
