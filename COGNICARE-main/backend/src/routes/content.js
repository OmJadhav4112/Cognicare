const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  NER_CONTENT,
  GAME_CONFIG,
  CATEGORIES,
  STATES,
  TOTAL_ITEMS,
  getByCategory,
  getByDifficulty,
  getRandomItems,
  getMatchingPairs,
  getPictureRecallSet,
  getSequenceItems
} = require('../data/nerCulturalContent');

// All content routes require auth
router.use(protect);

// GET /api/content/all  — full content library
router.get('/all', (req, res) => {
  res.json({ success: true, total: TOTAL_ITEMS, categories: CATEGORIES, states: STATES, data: NER_CONTENT });
});

// GET /api/content/game/:gameType?difficulty=easy
// Returns a ready-to-use content set for a given game type and difficulty
router.get('/game/:gameType', (req, res) => {
  const { gameType } = req.params;
  const difficulty = req.query.difficulty || 'easy';
  const validGames = ['memoryMatching', 'pictureRecall', 'sequenceMemory', 'patternAttention'];

  if (!validGames.includes(gameType)) {
    return res.status(400).json({ success: false, message: 'Invalid game type.' });
  }

  const config = GAME_CONFIG[gameType];
  const count = config[difficulty] || config.easy;

  let contentSet;

  if (gameType === 'memoryMatching') {
    contentSet = { pairs: getMatchingPairs(count, difficulty), pairCount: count };
  } else if (gameType === 'pictureRecall') {
    contentSet = getPictureRecallSet(count, difficulty);
  } else if (gameType === 'sequenceMemory') {
    contentSet = { sequence: getSequenceItems(count, difficulty), length: count };
  } else if (gameType === 'patternAttention') {
    // Return grid items — one will be the 'odd one out' chosen by frontend
    contentSet = { items: getRandomItems(count + 3, difficulty), gridCount: count };
  }

  res.json({
    success: true,
    gameType,
    difficulty,
    config: config[difficulty],
    data: contentSet
  });
});

// GET /api/content/category/:category
router.get('/category/:category', (req, res) => {
  const items = getByCategory(req.params.category);
  res.json({ success: true, count: items.length, data: items });
});

// GET /api/content/difficulty/:level
router.get('/difficulty/:level', (req, res) => {
  const items = getByDifficulty(req.params.level);
  res.json({ success: true, count: items.length, data: items });
});

module.exports = router;
