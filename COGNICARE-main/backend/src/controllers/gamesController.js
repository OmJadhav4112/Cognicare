const Performance = require('../models/Performance');
const Patient = require('../models/Patient');

// ─────────────────────────────────────────
//  SUBMIT GAME RESULT
// ─────────────────────────────────────────

// @desc  Submit a completed game session result
// @route POST /api/games/submit
// @access Private (patient)
const submitGameResult = async (req, res) => {
  try {
    const {
      gameType,
      difficulty,
      score,
      accuracy,
      completionTimeSeconds,
      totalQuestions,
      correctAnswers,
      mistakes,
      hintsUsed,
      completed,
      culturalTheme
    } = req.body;

    const validGameTypes = ['memoryMatching', 'pictureRecall', 'sequenceMemory', 'patternAttention'];
    if (!validGameTypes.includes(gameType)) {
      return res.status(400).json({ success: false, message: 'Invalid game type.' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Save performance record
    const performance = await Performance.create({
      patient: req.user._id,
      gameType,
      difficulty,
      score: Math.min(100, Math.max(0, score)),
      accuracy: Math.min(100, Math.max(0, accuracy)),
      completionTimeSeconds,
      totalQuestions: totalQuestions || 0,
      correctAnswers: correctAnswers || 0,
      mistakes: mistakes || 0,
      hintsUsed: hintsUsed || 0,
      completed: completed !== false,
      culturalTheme: culturalTheme || 'general',
      sessionDate: today
    });

    // Update patient stats and streak
    const patient = await Patient.findOne({ user: req.user._id });
    if (patient) {
      patient.totalActivitiesCompleted += 1;

      // Streak logic
      const lastDate = patient.lastActivityDate
        ? new Date(patient.lastActivityDate).toISOString().split('T')[0]
        : null;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastDate === yesterdayStr) {
        patient.streakDays += 1;
      } else if (lastDate !== today) {
        patient.streakDays = 1;
      }

      patient.lastActivityDate = new Date();
      await patient.save();
    }

    // Trigger AI difficulty adaptation (async, non-blocking)
    setImmediate(() => {
      adaptDifficultyForPatient(req.user._id, gameType).catch(console.error);
    });

    res.status(201).json({
      success: true,
      data: performance,
      message: 'Game result saved successfully.'
    });
  } catch (err) {
    console.error('submitGameResult error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────
//  GET GAME HISTORY
// ─────────────────────────────────────────

// @desc  Get performance history for the patient
// @route GET /api/games/history
// @access Private (patient)
const getGameHistory = async (req, res) => {
  try {
    const { gameType, limit = 20, page = 1 } = req.query;
    const filter = { patient: req.user._id };
    if (gameType) filter.gameType = gameType;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [performances, total] = await Promise.all([
      Performance.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
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
//  GET STATS (per game type)
// ─────────────────────────────────────────

// @desc  Get aggregated stats for a game type
// @route GET /api/games/stats
// @access Private (patient)
const getGameStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const performances = await Performance.find({
      patient: req.user._id,
      createdAt: { $gte: since }
    }).sort({ createdAt: 1 });

    // Group by game type
    const statsByGame = {};
    const gameTypes = ['memoryMatching', 'pictureRecall', 'sequenceMemory', 'patternAttention'];

    gameTypes.forEach(g => {
      const records = performances.filter(p => p.gameType === g);
      if (records.length === 0) {
        statsByGame[g] = { sessions: 0, avgScore: 0, avgAccuracy: 0, trend: [] };
        return;
      }

      const avgScore = Math.round(records.reduce((s, r) => s + r.score, 0) / records.length);
      const avgAccuracy = Math.round(records.reduce((s, r) => s + r.accuracy, 0) / records.length);

      // Daily trend: last 7 sessions
      const trend = records.slice(-7).map(r => ({
        date: r.sessionDate,
        score: r.score,
        accuracy: r.accuracy,
        difficulty: r.difficulty
      }));

      statsByGame[g] = { sessions: records.length, avgScore, avgAccuracy, trend };
    });

    // Overall daily activity for streak chart
    const dailyActivity = {};
    performances.forEach(p => {
      if (!dailyActivity[p.sessionDate]) {
        dailyActivity[p.sessionDate] = 0;
      }
      dailyActivity[p.sessionDate] += 1;
    });

    res.json({
      success: true,
      data: {
        statsByGame,
        dailyActivity,
        totalSessions: performances.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────
//  GET CURRENT DIFFICULTY
// ─────────────────────────────────────────

// @desc  Get current difficulty settings for a patient
// @route GET /api/games/difficulty
// @access Private (patient)
const getDifficulty = async (req, res) => {
  try {
    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    res.json({
      success: true,
      data: {
        gameDifficulty: patient.gameDifficulty,
        cognitiveProfile: patient.cognitiveProfile
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────
//  INTERNAL: Adaptive difficulty engine
// ─────────────────────────────────────────

/**
 * Analyses the last N sessions for a specific game and adjusts difficulty.
 * Called non-blocking after each game submission.
 *
 * Rules:
 *   - Look at the last 5 sessions for this game type
 *   - Average accuracy >= 85% AND avg score >= 80  → level up (if not already 'hard')
 *   - Average accuracy <= 50% OR avg score <= 40   → level down (if not already 'easy')
 *   - Otherwise: keep current
 */
const adaptDifficultyForPatient = async (userId, gameType) => {
  try {
    const last5 = await Performance.find({ patient: userId, gameType })
      .sort({ createdAt: -1 })
      .limit(5);

    if (last5.length < 3) return; // Not enough data yet

    const avgAccuracy = last5.reduce((s, r) => s + r.accuracy, 0) / last5.length;
    const avgScore = last5.reduce((s, r) => s + r.score, 0) / last5.length;

    const patient = await Patient.findOne({ user: userId });
    if (!patient) return;

    const levels = ['easy', 'medium', 'hard'];
    const current = patient.gameDifficulty[gameType] || 'easy';
    const currentIdx = levels.indexOf(current);

    let newLevel = current;

    if (avgAccuracy >= 85 && avgScore >= 80 && currentIdx < 2) {
      newLevel = levels[currentIdx + 1];
    } else if ((avgAccuracy <= 50 || avgScore <= 40) && currentIdx > 0) {
      newLevel = levels[currentIdx - 1];
    }

    if (newLevel !== current) {
      patient.gameDifficulty[gameType] = newLevel;
      patient.markModified('gameDifficulty');

      // Update cognitive profile scores
      const scoreMap = { easy: 30, medium: 60, hard: 90 };
      const profileMap = {
        memoryMatching: 'memoryScore',
        pictureRecall: 'memoryScore',
        sequenceMemory: 'attentionScore',
        patternAttention: 'patternScore'
      };

      const profileKey = profileMap[gameType];
      if (profileKey) {
        patient.cognitiveProfile[profileKey] = Math.round(
          (patient.cognitiveProfile[profileKey] * 0.6) + (scoreMap[newLevel] * 0.4)
        );
      }

      // Recalculate overall level
      const scores = [
        patient.cognitiveProfile.memoryScore,
        patient.cognitiveProfile.attentionScore,
        patient.cognitiveProfile.patternScore
      ];
      const avgCognitive = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avgCognitive >= 70) patient.cognitiveProfile.overallLevel = 'advanced';
      else if (avgCognitive >= 45) patient.cognitiveProfile.overallLevel = 'intermediate';
      else patient.cognitiveProfile.overallLevel = 'beginner';

      patient.cognitiveProfile.lastUpdated = new Date();
      await patient.save();
    }
  } catch (err) {
    console.error('adaptDifficulty error:', err);
  }
};

module.exports = {
  submitGameResult,
  getGameHistory,
  getGameStats,
  getDifficulty,
  adaptDifficultyForPatient
};
