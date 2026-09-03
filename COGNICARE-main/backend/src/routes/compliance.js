const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');
const { endpointLimiters } = require('../services/rateLimitService');
const {
  getHIPAAauditTrail,
  verifyAuditIntegrity,
  generateComplianceReport,
  getComplianceChecklist,
  logHIPAAActivity
} = require('../services/complianceService');
const Patient = require('../models/Patient');

/**
 * @route   GET /api/compliance/audit-trail
 * @desc    Get HIPAA audit trail for patient (patient can view their own, caregiver can view linked patient)
 * @access  Private (Patient/Caregiver)
 */
router.get(
  '/audit-trail',
  protect,
  [
    query('days').optional().isInt({ min: 1, max: 365 }).toInt(),
    query('patientId').optional().isMongoId()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      let patientId = req.user._id;
      const daysBack = req.query.days || 90;

      // If caregiver requesting patient audit trail
      if (req.user.role === 'caregiver' && req.query.patientId) {
        const Caregiver = require('../models/Caregiver');
        const caregiver = await Caregiver.findOne({ user: req.user._id });
        
        if (!caregiver?.patients?.includes(req.query.patientId)) {
          return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        patientId = req.query.patientId;
      }

      const result = await getHIPAAauditTrail(patientId, daysBack);

      res.json({
        success: result.success,
        data: result.logs || null,
        message: result.error || `Audit trail retrieved (${result.totalLogs} records)`
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route   POST /api/compliance/verify-integrity
 * @desc    Verify audit trail integrity for compliance (Admin)
 * @access  Private (Admin)
 */
router.post(
  '/verify-integrity',
  protect,
  restrictTo('admin'),
  [
    body('startDate').isISO8601(),
    body('endDate').isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { startDate, endDate } = req.body;
      const result = await verifyAuditIntegrity(new Date(startDate), new Date(endDate));

      res.json({
        success: result.success,
        data: result,
        message: result.success ? 'Audit trail is compliant' : `Found ${result.integrityViolations} violations`
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route   POST /api/compliance/generate-report
 * @desc    Generate HIPAA compliance report (Admin)
 * @access  Private (Admin)
 */
router.post(
  '/generate-report',
  protect,
  restrictTo('admin'),
  endpointLimiters.complianceReport,
  [
    body('startDate').isISO8601(),
    body('endDate').isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { startDate, endDate } = req.body;
      const result = await generateComplianceReport(new Date(startDate), new Date(endDate));

      res.json({
        success: result.success,
        data: result.report || null,
        message: result.error || 'Compliance report generated'
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route   GET /api/compliance/checklist
 * @desc    Get HIPAA compliance checklist (Admin)
 * @access  Private (Admin)
 */
router.get('/checklist', protect, restrictTo('admin'), (req, res) => {
  try {
    const checklist = getComplianceChecklist();
    res.json({
      success: true,
      data: checklist,
      message: 'Compliance checklist retrieved'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/compliance/log-event
 * @desc    Log compliance event (for internal use, triggered by system)
 * @access  Private (Admin/System)
 */
router.post(
  '/log-event',
  protect,
  [
    body('action').notEmpty(),
    body('resource').notEmpty(),
    body('piiAccessed').optional().isArray(),
    body('medicalDataAccessed').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { action, resource, piiAccessed = [], medicalDataAccessed = false } = req.body;

      const result = await logHIPAAActivity(
        req.user._id,
        action,
        resource,
        piiAccessed,
        medicalDataAccessed,
        { firebaseUid: req.userId }
      );

      res.json({
        success: result.success,
        message: result.error || 'Event logged'
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
