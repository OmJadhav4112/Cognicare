const {
  generateRecommendations,
  generatePerformanceSummary,
  applyRecommendedDifficulty,
  computeGameMetrics
} = require('../services/aiEngine');
const Patient = require('../models/Patient');
const cacheService = require('../services/cacheService');

// ─────────────────────────────────────────
//  GET RECOMMENDATIONS
// ─────────────────────────────────────────

// @desc  Get AI-generated activity recommendations for the logged-in patient
// @route GET /api/ai/recommendations
// @access Private (patient)
const getRecommendations = async (req, res) => {
  try {
    // Try cache first (1-hour TTL)
    const recommendations = await cacheService.withCache(
      'ai:recommendations',
      req.user._id,
      () => generateRecommendations(req.user._id),
      3600
    );

    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations,
      disclaimer: 'These recommendations are based on your activity engagement and are not a medical assessment.'
    });
  } catch (err) {
    console.error('getRecommendations error:', err);
    res.status(500).json({ success: false, message: 'Server error generating recommendations.' });
  }
};

// ─────────────────────────────────────────
//  GET RECOMMENDATIONS FOR A PATIENT (caregiver view)
// ─────────────────────────────────────────

// @desc  Get AI recommendations for a specific patient (caregiver access)
// @route GET /api/ai/recommendations/:patientId
// @access Private (caregiver)
const getRecommendationsForPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify caregiver is linked to this patient
    const patient = await Patient.findOne({ user: patientId });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    if (
      req.user.role !== 'caregiver' ||
      (patient.caregiver && patient.caregiver.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this patient.' });
    }

    // Fetch with caching
    const [recommendations, summary, metrics] = await Promise.all([
      cacheService.withCache(
        'ai:recommendations',
        patientId,
        () => generateRecommendations(patientId),
        3600
      ),
      cacheService.withCache(
        'ai:performance-summary',
        patientId,
        () => generatePerformanceSummary(patientId),
        3600
      ),
      computeGameMetrics(patientId, 10)
    ]);

    res.json({
      success: true,
      data: {
        recommendations,
        summary,
        metrics,
        cognitiveProfile: patient.cognitiveProfile,
        gameDifficulty: patient.gameDifficulty
      },
      disclaimer: 'These insights reflect activity engagement only and are not a medical assessment.'
    });
  } catch (err) {
    console.error('getRecommendationsForPatient error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────
//  GET PERFORMANCE SUMMARY
// ─────────────────────────────────────────

// @desc  Get AI-generated performance summary for logged-in patient
// @route GET /api/ai/summary
// @access Private (patient)
const getPerformanceSummary = async (req, res) => {
  try {
    // Try cache first (1-hour TTL)
    const summary = await cacheService.withCache(
      'ai:performance-summary',
      req.user._id,
      () => generatePerformanceSummary(req.user._id),
      3600
    );

    if (!summary) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    res.json({ success: true, data: summary });
  } catch (err) {
    console.error('getPerformanceSummary error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────
//  APPLY RECOMMENDED DIFFICULTY
// ─────────────────────────────────────────

// @desc  Accept AI recommendations and apply difficulty adjustments
// @route POST /api/ai/apply-difficulty
// @access Private (patient or caregiver)
const applyDifficulty = async (req, res) => {
  try {
    const targetUserId = req.body.patientId || req.user._id;

    // Caregivers must be linked
    if (req.body.patientId && req.user.role === 'caregiver') {
      const patient = await Patient.findOne({ user: req.body.patientId });
      if (!patient || patient.caregiver?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized.' });
      }
    }

    const recommendations = await generateRecommendations(targetUserId);
    await applyRecommendedDifficulty(targetUserId, recommendations);

    // Invalidate cache for this user since data changed
    await cacheService.invalidateUser(targetUserId);

    // Return updated difficulty
    const updated = await Patient.findOne({ user: targetUserId });

    res.json({
      success: true,
      message: 'Difficulty settings updated based on AI recommendations.',
      data: {
        gameDifficulty: updated.gameDifficulty,
        cognitiveProfile: updated.cognitiveProfile
      }
    });
  } catch (err) {
    console.error('applyDifficulty error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────
//  GET GAME METRICS
// ─────────────────────────────────────────

// @desc  Get detailed per-game metrics
// @route GET /api/ai/metrics
// @access Private (patient)
const getMetrics = async (req, res) => {
  try {
    const { sessions = 10 } = req.query;
    const metrics = await computeGameMetrics(req.user._id, parseInt(sessions));

    res.json({ success: true, data: metrics });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getRecommendations,
  getRecommendationsForPatient,
  getPerformanceSummary,
  applyDifficulty,
  getMetrics
};

