const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { endpointLimiters } = require('../services/rateLimitService');
const { sensitiveOperationRateLimit } = require('../middleware/rateLimit');
const {
  exportPatientDataJSON,
  exportPerformanceCSV,
  generatePatientReportPDF,
  deletePatientData,
  createBackupSnapshot,
  archiveOldData
} = require('../services/backupService');
const User = require('../models/User');

/**
 * @route   GET /api/backup/export-data
 * @desc    Export all patient data as JSON
 * @access  Private (Patient)
 */
router.get('/export-data', protect, restrictTo('patient'), endpointLimiters.dataExport, async (req, res) => {
  try {
    const result = await exportPatientDataJSON(req.user._id);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    // Send as JSON file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=patient-data-${new Date().toISOString().split('T')[0]}.json`
    );
    res.send(JSON.stringify(result.data, null, 2));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/backup/export-performance-csv
 * @desc    Export game performance as CSV
 * @access  Private (Patient)
 */
router.get('/export-performance-csv', protect, restrictTo('patient'), endpointLimiters.dataExport, async (req, res) => {
  try {
    const result = await exportPerformanceCSV(req.user._id);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${result.filename}`
    );
    res.send(result.data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/backup/generate-report-pdf
 * @desc    Generate patient report as PDF
 * @access  Private (Patient/Caregiver)
 */
router.get('/generate-report-pdf', protect, endpointLimiters.complianceReport, async (req, res) => {
  try {
    // Patient can download their own, caregiver can request patient's
    let patientId = req.user._id;

    if (req.user.role === 'caregiver' && req.query.patientId) {
      // Verify caregiver has access to this patient
      const Caregiver = require('../models/Caregiver');
      const caregiver = await Caregiver.findOne({ user: req.user._id });
      const hasAccess = caregiver?.patients?.includes(req.query.patientId);

      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      patientId = req.query.patientId;
    }

    const result = await generatePatientReportPDF(patientId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${result.filename}`
    );
    res.send(result.data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/backup/create-snapshot
 * @desc    Create manual backup snapshot
 * @access  Private (Patient)
 */
router.post('/create-snapshot', protect, restrictTo('patient'), endpointLimiters.dataExport, async (req, res) => {
  try {
    const result = await createBackupSnapshot(req.user._id);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: 'Backup snapshot created',
      data: {
        backupId: result.snapshot.backupId,
        timestamp: result.snapshot.timestamp,
        dataSize: result.snapshot.dataSize,
        expiresAt: result.snapshot.expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/backup/delete-account
 * @desc    Delete all patient data (GDPR right to be forgotten)
 * @access  Private (Patient)
 */
router.delete('/delete-account', protect, restrictTo('patient'), sensitiveOperationRateLimit, async (req, res) => {
  try {
    const { confirmPassword } = req.body;

    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required'
      });
    }

    // Additional confirmation check
    if (confirmPassword !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        success: false,
        message: 'Invalid confirmation. Type DELETE_MY_ACCOUNT to confirm.'
      });
    }

    const result = await deletePatientData(req.user._id);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/backup/archive-old-data
 * @desc    Archive/delete data older than specified days (Admin only)
 * @access  Private (Admin - can be restricted further)
 */
router.post('/archive-old-data', protect, async (req, res) => {
  try {
    // Restrict to admin or system user
    if (req.user.role !== 'admin' && !process.env.ADMIN_API_KEY) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { daysOld = 365 } = req.body;

    if (daysOld < 30) {
      return res.status(400).json({
        success: false,
        message: 'Cannot archive data younger than 30 days'
      });
    }

    const result = await archiveOldData(daysOld);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: `Data older than ${daysOld} days archived`,
      results: result.results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
