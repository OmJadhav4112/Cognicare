const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { gameLimiter } = require('../services/rateLimitService');
const {
  submitGameResult,
  getGameHistory,
  getGameStats,
  getDifficulty
} = require('../controllers/gamesController');

router.use(protect, restrictTo('patient'));

// Apply game-specific rate limiting to game actions
router.post('/submit', gameLimiter, submitGameResult);

// Get personal game history (paginated)
router.get('/history', getGameHistory);

// Get aggregated stats (last N days)
router.get('/stats', getGameStats);

// Get current difficulty settings
router.get('/difficulty', getDifficulty);

module.exports = router;
