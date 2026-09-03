const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { endpointLimiters } = require('../services/rateLimitService');
const {
  getRecommendations,
  getRecommendationsForPatient,
  getPerformanceSummary,
  applyDifficulty,
  getMetrics
} = require('../controllers/aiController');

router.use(protect);

// Patient: get their own recommendations (strict limit: 5 per hour)
router.get('/recommendations', restrictTo('patient'), endpointLimiters.aiRecommendations, getRecommendations);

// Patient: get their own performance summary
router.get('/summary', restrictTo('patient'), getPerformanceSummary);

// Patient: get detailed per-game metrics
router.get('/metrics', restrictTo('patient'), getMetrics);

// Patient or Caregiver: apply AI-suggested difficulty
router.post('/apply-difficulty', applyDifficulty);

// Caregiver: get recommendations for a specific patient (strict limit: 5 per hour)
router.get('/recommendations/:patientId', restrictTo('caregiver'), endpointLimiters.aiRecommendations, getRecommendationsForPatient);

module.exports = router;
