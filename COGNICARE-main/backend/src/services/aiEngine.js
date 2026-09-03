/**
 * DementiaCare+ AI Personalization Engine
 *
 * This service analyses a patient's performance history, caregiver feedback,
 * and cognitive profile to produce:
 *   1. Ranked activity recommendations with plain-language explanations
 *   2. Per-game difficulty adjustments
 *   3. A short overall performance summary
 *
 * IMPORTANT: This engine supports cognitive engagement activities only.
 * It does NOT diagnose, assess, or make any medical claims.
 */

const Performance = require('../models/Performance');
const Patient = require('../models/Patient');
const CaregiverFeedback = require('../models/CaregiverFeedback');

// ─────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────

const GAME_META = {
  memoryMatching: {
    label: 'Memory Matching',
    icon: '🃏',
    cognitiveArea: 'Short-term memory & visual recognition',
    description: 'Match pairs of culturally familiar images from NER.'
  },
  pictureRecall: {
    label: 'Picture Recall',
    icon: '🖼️',
    cognitiveArea: 'Visual memory & recall',
    description: 'Study a set of pictures, then recall which ones you saw.'
  },
  sequenceMemory: {
    label: 'Sequence Memory',
    icon: '🔢',
    cognitiveArea: 'Working memory & attention span',
    description: 'Remember and repeat sequences of numbers, colours, or symbols.'
  },
  patternAttention: {
    label: 'Pattern Attention',
    icon: '🔷',
    cognitiveArea: 'Visual attention & pattern recognition',
    description: 'Identify the odd one out or complete a pattern.'
  }
};

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

// ─────────────────────────────────────────
//  CORE: compute per-game performance metrics
// ─────────────────────────────────────────

/**
 * Returns aggregated metrics for every game type over the last N sessions.
 */
const computeGameMetrics = async (userId, sessionsPerGame = 5) => {
  const metrics = {};

  for (const gameType of Object.keys(GAME_META)) {
    const records = await Performance.find({ patient: userId, gameType })
      .sort({ createdAt: -1 })
      .limit(sessionsPerGame);

    if (records.length === 0) {
      metrics[gameType] = {
        sessions: 0,
        avgScore: null,
        avgAccuracy: null,
        avgTime: null,
        avgMistakes: null,
        recentTrend: 'no_data',
        currentDifficulty: 'easy'
      };
      continue;
    }

    const avgScore = records.reduce((s, r) => s + r.score, 0) / records.length;
    const avgAccuracy = records.reduce((s, r) => s + r.accuracy, 0) / records.length;
    const avgTime = records.reduce((s, r) => s + r.completionTimeSeconds, 0) / records.length;
    const avgMistakes = records.reduce((s, r) => s + r.mistakes, 0) / records.length;

    // Trend: compare first half vs second half scores
    let trend = 'stable';
    if (records.length >= 4) {
      const half = Math.floor(records.length / 2);
      // records are newest-first, so older = tail
      const recentAvg = records.slice(0, half).reduce((s, r) => s + r.score, 0) / half;
      const olderAvg = records.slice(half).reduce((s, r) => s + r.score, 0) / (records.length - half);
      if (recentAvg > olderAvg + 8) trend = 'improving';
      else if (recentAvg < olderAvg - 8) trend = 'declining';
    }

    metrics[gameType] = {
      sessions: records.length,
      avgScore: Math.round(avgScore),
      avgAccuracy: Math.round(avgAccuracy),
      avgTime: Math.round(avgTime),
      avgMistakes: Math.round(avgMistakes * 10) / 10,
      recentTrend: trend,
      currentDifficulty: records[0].difficulty
    };
  }

  return metrics;
};

// ─────────────────────────────────────────
//  CORE: recommend next activities
// ─────────────────────────────────────────

/**
 * Produces a ranked list of recommended activities with plain-language reasons.
 * Scoring factors (all rule-based, no ML model):
 *   - Games with no data get highest priority (encourage exploration)
 *   - Games with declining trend get high priority (needs practice)
 *   - Games with low accuracy get boosted
 *   - Games the patient is improving in are recommended to continue momentum
 *   - Caregiver feedback preferences are respected
 */
const generateRecommendations = async (userId) => {
  const [patient, metrics, feedbackList] = await Promise.all([
    Patient.findOne({ user: userId }),
    computeGameMetrics(userId, 5),
    CaregiverFeedback.find({ patient: userId, influencesAI: true })
      .sort({ createdAt: -1 })
      .limit(3)
  ]);

  if (!patient) return [];

  // Aggregate caregiver preferences
  const caregiverLiked = new Set();
  const caregiverDisliked = new Set();
  const difficultyFeedbacks = [];

  feedbackList.forEach(fb => {
    (fb.gamePreferences || []).forEach(gp => {
      if (gp.liked) caregiverLiked.add(gp.gameType);
      else caregiverDisliked.add(gp.gameType);
    });
    if (fb.difficultyFeedback) difficultyFeedbacks.push(fb.difficultyFeedback);
  });

  // Most recent caregiver difficulty opinion
  const latestDifficultyFeedback = difficultyFeedbacks[0] || null;

  const recommendations = [];

  for (const [gameType, meta] of Object.entries(GAME_META)) {
    const m = metrics[gameType];
    let priorityScore = 0;
    const reasons = [];

    // ── No data: strongly encourage ──
    if (m.sessions === 0) {
      priorityScore += 50;
      reasons.push(`You haven't tried ${meta.label} yet — give it a go!`);
    } else {
      // ── Declining trend ──
      if (m.recentTrend === 'declining') {
        priorityScore += 35;
        reasons.push(`Your recent scores in ${meta.label} have dipped — a bit more practice will help.`);
      }

      // ── Improving trend ──
      if (m.recentTrend === 'improving') {
        priorityScore += 20;
        reasons.push(`You're on a great streak in ${meta.label} — keep the momentum going!`);
      }

      // ── Low accuracy ──
      if (m.avgAccuracy !== null && m.avgAccuracy < 55) {
        priorityScore += 25;
        reasons.push(`Your accuracy in ${meta.label} is ${m.avgAccuracy}% — more practice will build confidence.`);
      }

      // ── High performance: maintenance play ──
      if (m.avgAccuracy !== null && m.avgAccuracy >= 85 && m.avgScore >= 80) {
        priorityScore += 10;
        reasons.push(`You're doing very well in ${meta.label} — play it to stay sharp.`);
      }

      // ── Few sessions ──
      if (m.sessions < 3) {
        priorityScore += 15;
        reasons.push(`You've only played ${meta.label} a couple of times — more sessions will help build the skill.`);
      }
    }

    // ── Caregiver preferences ──
    if (caregiverLiked.has(gameType)) {
      priorityScore += 20;
      reasons.push('Your caregiver noted that you enjoy this activity.');
    }
    if (caregiverDisliked.has(gameType)) {
      priorityScore -= 20;
    }

    // ── Difficulty recommendation ──
    const currentDiff = patient.gameDifficulty[gameType] || 'easy';
    let suggestedDifficulty = currentDiff;
    let difficultyReason = '';

    if (latestDifficultyFeedback === 'too_easy') {
      const idx = DIFFICULTY_LEVELS.indexOf(currentDiff);
      if (idx < 2) {
        suggestedDifficulty = DIFFICULTY_LEVELS[idx + 1];
        difficultyReason = 'Your caregiver feels the activities are a bit easy — try a harder level.';
      }
    } else if (latestDifficultyFeedback === 'too_hard') {
      const idx = DIFFICULTY_LEVELS.indexOf(currentDiff);
      if (idx > 0) {
        suggestedDifficulty = DIFFICULTY_LEVELS[idx - 1];
        difficultyReason = 'Your caregiver suggested an easier level to build confidence.';
      }
    } else if (m.avgAccuracy !== null) {
      if (m.avgAccuracy >= 88 && m.sessions >= 3) {
        const idx = DIFFICULTY_LEVELS.indexOf(currentDiff);
        if (idx < 2) {
          suggestedDifficulty = DIFFICULTY_LEVELS[idx + 1];
          difficultyReason = `Your accuracy is ${m.avgAccuracy}% — you're ready for a bigger challenge!`;
        }
      } else if (m.avgAccuracy <= 45 && m.sessions >= 3) {
        const idx = DIFFICULTY_LEVELS.indexOf(currentDiff);
        if (idx > 0) {
          suggestedDifficulty = DIFFICULTY_LEVELS[idx - 1];
          difficultyReason = `Your accuracy is ${m.avgAccuracy}% — an easier level will help build skills.`;
        }
      }
    }

    if (difficultyReason) reasons.push(difficultyReason);

    // Default reason if none generated
    if (reasons.length === 0) {
      reasons.push(`Playing ${meta.label} helps with ${meta.cognitiveArea.toLowerCase()}.`);
    }

    recommendations.push({
      gameType,
      label: meta.label,
      icon: meta.icon,
      cognitiveArea: meta.cognitiveArea,
      description: meta.description,
      priorityScore,
      suggestedDifficulty,
      currentDifficulty: currentDiff,
      difficultyChanged: suggestedDifficulty !== currentDiff,
      reasons,
      metrics: m
    });
  }

  // Sort by priority descending
  recommendations.sort((a, b) => b.priorityScore - a.priorityScore);

  return recommendations;
};

// ─────────────────────────────────────────
//  CORE: overall performance summary
// ─────────────────────────────────────────

/**
 * Produces a short, friendly plain-language summary of the patient's
 * cognitive engagement over the past week.
 * Makes NO medical claims.
 */
const generatePerformanceSummary = async (userId) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [patient, recentPerf, allTimeCount] = await Promise.all([
    Patient.findOne({ user: userId }),
    Performance.find({ patient: userId, createdAt: { $gte: sevenDaysAgo } }),
    Performance.countDocuments({ patient: userId })
  ]);

  if (!patient) return null;

  const sessionCount = recentPerf.length;
  const avgScore = sessionCount > 0
    ? Math.round(recentPerf.reduce((s, r) => s + r.score, 0) / sessionCount)
    : 0;
  const avgAccuracy = sessionCount > 0
    ? Math.round(recentPerf.reduce((s, r) => s + r.accuracy, 0) / sessionCount)
    : 0;

  // Best game this week
  const gameTotals = {};
  recentPerf.forEach(p => {
    if (!gameTotals[p.gameType]) gameTotals[p.gameType] = { total: 0, count: 0 };
    gameTotals[p.gameType].total += p.score;
    gameTotals[p.gameType].count += 1;
  });

  let bestGame = null;
  let bestAvg = 0;
  Object.entries(gameTotals).forEach(([g, v]) => {
    const avg = v.total / v.count;
    if (avg > bestAvg) { bestAvg = avg; bestGame = g; }
  });

  // Build summary text
  let summaryLines = [];

  if (sessionCount === 0) {
    summaryLines.push("No activities this week — let's get started today! 🌟");
  } else {
    summaryLines.push(
      `This week you completed ${sessionCount} activit${sessionCount === 1 ? 'y' : 'ies'} ` +
      `with an average score of ${avgScore} and ${avgAccuracy}% accuracy.`
    );

    if (bestGame) {
      summaryLines.push(
        `Your strongest activity was ${GAME_META[bestGame]?.label} — well done! ${GAME_META[bestGame]?.icon}`
      );
    }

    if (patient.streakDays >= 3) {
      summaryLines.push(`You're on a ${patient.streakDays}-day activity streak — fantastic consistency! 🔥`);
    }

    if (avgAccuracy >= 75) {
      summaryLines.push('Keep it up — your engagement has been great!');
    } else if (avgAccuracy < 50) {
      summaryLines.push('Take your time — steady practice leads to improvement. You\'re doing great just by showing up!');
    }
  }

  // Disclaimer — always included
  summaryLines.push(
    '⚠️ This summary reflects your activity engagement only and is not a medical assessment.'
  );

  return {
    sessionCount,
    avgScore,
    avgAccuracy,
    streakDays: patient.streakDays,
    totalActivitiesAllTime: allTimeCount,
    cognitiveProfile: patient.cognitiveProfile,
    summaryText: summaryLines.join(' '),
    summaryLines,
    bestGame: bestGame ? { gameType: bestGame, ...GAME_META[bestGame] } : null
  };
};

// ─────────────────────────────────────────
//  CORE: apply AI-suggested difficulty
// ─────────────────────────────────────────

/**
 * Applies the suggested difficulty from recommendations back to the Patient doc.
 */
const applyRecommendedDifficulty = async (userId, recommendations) => {
  const patient = await Patient.findOne({ user: userId });
  if (!patient) return;

  let changed = false;
  recommendations.forEach(rec => {
    if (rec.difficultyChanged) {
      patient.gameDifficulty[rec.gameType] = rec.suggestedDifficulty;
      changed = true;
    }
  });

  if (changed) {
    patient.markModified('gameDifficulty');
    await patient.save();
  }
};

module.exports = {
  generateRecommendations,
  generatePerformanceSummary,
  applyRecommendedDifficulty,
  computeGameMetrics,
  GAME_META
};
