const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const healthCheckService = require('../services/healthCheckService');
const moderationService = require('../services/moderationService');
const ModerationFlag = require('../models/ModerationFlag');
const FamilyMemory = require('../models/FamilyMemory');

const router = express.Router();

/**
 * Admin-only endpoints for system monitoring and maintenance
 */

/**
 * GET /api/admin/health-check/status
 * Get the current status of the health check service
 */
router.get('/health-check/status', protect, restrictTo('admin'), (req, res) => {
  try {
    const status = healthCheckService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * POST /api/admin/health-check/trigger
 * Manually trigger a health check (for testing/debugging)
 */
router.post('/health-check/trigger', protect, restrictTo('admin'), async (req, res) => {
  try {
    console.log(`[Admin] Manual health check triggered by ${req.user.email}`);
    const results = await healthCheckService.manualHealthCheck();
    
    res.json({
      success: true,
      message: 'Health check completed',
      data: results
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * ─────────────────────────────────────────────────────────
 * CONTENT MODERATION ENDPOINTS
 * ─────────────────────────────────────────────────────────
 */

/**
 * GET /api/admin/moderation/flags
 * Get all flagged content pending review
 * Query params: severity, limit, offset, status
 */
router.get('/moderation/flags', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { severity = null, limit = 20, offset = 0, status = 'flagged' } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const flags = await ModerationFlag.find(filter)
      .populate('patient', 'email firstName lastName')
      .populate('flaggedBy', 'email')
      .populate('reviewedBy', 'email')
      .sort({ severity: -1, createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await ModerationFlag.countDocuments(filter);

    res.json({
      success: true,
      data: flags,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * GET /api/admin/moderation/stats
 * Get moderation statistics
 */
router.get('/moderation/stats', protect, restrictTo('admin'), async (req, res) => {
  try {
    const stats = await moderationService.getStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * GET /api/admin/moderation/flags/:flagId
 * Get details of a specific moderation flag
 */
router.get('/moderation/flags/:flagId', protect, restrictTo('admin'), async (req, res) => {
  try {
    const flag = await ModerationFlag.findById(req.params.flagId)
      .populate('patient')
      .populate('flaggedBy')
      .populate('reviewedBy')
      .populate('resourceId');

    if (!flag) {
      return res.status(404).json({ success: false, message: 'Flag not found' });
    }

    res.json({
      success: true,
      data: flag
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * POST /api/admin/moderation/flags/:flagId/approve
 * Approve a flagged memory with optional action
 * Body: { action: 'blur'|'hide'|'delete'|'none', notes: '' }
 */
router.post('/moderation/flags/:flagId/approve', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { action = 'none', notes = '' } = req.body;

    const flag = await moderationService.resolveFlag(
      req.params.flagId,
      req.user._id,
      action,
      notes
    );

    // If delete action, delete the memory
    if (action === 'delete') {
      await FamilyMemory.findByIdAndDelete(flag.resourceId);
      console.log(`[Admin] Memory ${flag.resourceId} deleted by ${req.user.email}`);
    }

    res.json({
      success: true,
      message: 'Flag approved and resolved',
      data: flag
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * POST /api/admin/moderation/flags/:flagId/reject
 * Reject a flag (content is acceptable)
 * Body: { notes: '' }
 */
router.post('/moderation/flags/:flagId/reject', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { notes = '' } = req.body;

    const flag = await moderationService.rejectFlag(
      req.params.flagId,
      req.user._id,
      notes
    );

    res.json({
      success: true,
      message: 'Flag rejected - content approved',
      data: flag
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * POST /api/admin/moderation/memories/:memoryId/blur
 * Blur a sensitive memory image
 * Body: { blurIntensity: 50 }
 */
router.post('/moderation/memories/:memoryId/blur', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { blurIntensity = 80 } = req.body;

    const memory = await FamilyMemory.findById(req.params.memoryId);
    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }

    // Apply blur to moderation metadata
    memory.moderation.isBlurred = true;
    memory.moderation.blurIntensity = blurIntensity;
    await memory.save();

    res.json({
      success: true,
      message: 'Memory marked for blurring',
      data: memory
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * DELETE /api/admin/moderation/memories/:memoryId
 * Delete a memory and its associated flag
 */
router.delete('/moderation/memories/:memoryId', protect, restrictTo('admin'), async (req, res) => {
  try {
    const memory = await FamilyMemory.findByIdAndDelete(req.params.memoryId);
    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }

    // Clean up associated flag if exists
    if (memory.moderation?.moderationFlag) {
      await ModerationFlag.findByIdAndUpdate(
        memory.moderation.moderationFlag,
        { status: 'resolved', action: 'delete' }
      );
    }

    console.log(`[Admin] Memory ${req.params.memoryId} deleted by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Memory deleted'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;
