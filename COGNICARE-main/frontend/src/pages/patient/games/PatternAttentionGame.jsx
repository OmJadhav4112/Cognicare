import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getDifficulty, submitGameResult } from '../../../services/gamesService';
import { getRandomItems, GAME_CONFIG } from '../../../data/nerContent';
import PageHeader      from '../../../components/common/PageHeader';
import GameResult      from '../../../components/games/GameResult';
import DifficultyBadge from '../../../components/common/DifficultyBadge';
import Spinner         from '../../../components/common/Spinner';
import { useToast }    from '../../../components/common/Toast';

/**
 * Pattern Attention Game — Find the Odd One Out
 *
 * Grid shows items from the same category EXCEPT one odd item.
 * Patient taps the odd item, then presses "Next" to advance.
 *
 * Rounds: easy=6, medium=8, hard=10
 */

const ROUNDS = { easy: 6, medium: 8, hard: 10 };
const CATEGORIES = ['food', 'festival', 'landmark', 'clothing', 'plant', 'animal', 'everyday_object', 'folk_art'];

const buildRound = (difficulty) => {
  const gridCount = GAME_CONFIG?.patternAttention?.[difficulty] || (difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 9);
  const shuffled  = [...CATEGORIES].sort(() => Math.random() - 0.5);
  const mainCat   = shuffled[0];
  const oddCat    = shuffled[1];

  const mainItems = getRandomItems(gridCount - 1, difficulty, mainCat);
  const oddItems  = getRandomItems(1, difficulty, oddCat);

  // Fallback if content is sparse
  const majority = mainItems.length >= gridCount - 1 ? mainItems : getRandomItems(gridCount - 1, null, null);
  const odd      = oddItems.length  >= 1             ? oddItems  : getRandomItems(1,           null, null);

  const allItems = [...majority, ...odd].sort(() => Math.random() - 0.5);
  const oddId    = odd[0]?.id;

  return { items: allItems, oddId, mainCategory: mainCat, oddCategory: oddCat };
};

export default function PatternAttentionGame() {
  const { t }    = useLanguage();
  const toast    = useToast();
  const startRef = useRef(null);
  const scoresRef = useRef([]);

  const [phase,        setPhase]        = useState('setup');   // setup | playing | result
  const [difficulty,   setDifficulty]   = useState('easy');
  const [round,        setRound]        = useState(null);
  const [roundNum,     setRoundNum]     = useState(0);
  const [totalRounds,  setTotalRounds]  = useState(ROUNDS.easy);
  const [scores,       setScores]       = useState([]);
  const [selected,     setSelected]     = useState(null);      // item id the user tapped
  const [feedback,     setFeedback]     = useState(null);      // 'correct' | 'wrong' | null
  const [result,       setResult]       = useState(null);
  const [loadingDiff,  setLoadingDiff]  = useState(true);
  const [saving,       setSaving]       = useState(false);

  useEffect(() => { scoresRef.current = scores; }, [scores]);

  // Load recommended difficulty on mount
  useEffect(() => {
    getDifficulty()
      .then(res => setDifficulty(res.data?.data?.gameDifficulty?.patternAttention || 'easy'))
      .catch(() => {})
      .finally(() => setLoadingDiff(false));
  }, []);

  // ── start game ────────────────────────────────────────────────────────────
  const initGame = useCallback((diff) => {
    const total = ROUNDS[diff];
    setTotalRounds(total);
    setRoundNum(1);
    setScores([]);
    scoresRef.current = [];
    setResult(null);
    setSelected(null);
    setFeedback(null);
    setRound(buildRound(diff));
    startRef.current = Date.now();
    setPhase('playing');
  }, []);

  // ── answer selection ──────────────────────────────────────────────────────
  const handleSelect = (item) => {
    if (selected !== null) return;   // already answered this round
    const timeTaken = Math.round((Date.now() - startRef.current) / 1000);
    const isCorrect = item.id === round.oddId;
    setSelected(item.id);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    const newEntry = { correct: isCorrect, timeTaken };
    setScores(prev => {
      const updated = [...prev, newEntry];
      scoresRef.current = updated;
      return updated;
    });
  };

  // ── next question ─────────────────────────────────────────────────────────
  const handleNext = () => {
    if (roundNum >= totalRounds) {
      finishGame();
    } else {
      setRoundNum(n => n + 1);
      setRound(buildRound(difficulty));
      setSelected(null);
      setFeedback(null);
      startRef.current = Date.now();
    }
  };

  // ── finish game ───────────────────────────────────────────────────────────
  const finishGame = async () => {
    const allScores    = scoresRef.current;
    const correctCount = allScores.filter(s => s.correct).length;
    const totalTime    = allScores.reduce((t, s) => t + s.timeTaken, 0);
    const accuracy     = allScores.length ? Math.round((correctCount / allScores.length) * 100) : 0;
    const avgTime      = allScores.length ? totalTime / allScores.length : 0;
    const timeBonus    = Math.max(0, 100 - Math.floor(avgTime * 5));
    const score        = Math.round((accuracy * 0.75) + (timeBonus * 0.25));

    const res = {
      score, accuracy, timeTaken: totalTime,
      correctAnswers: correctCount,
      totalQuestions: allScores.length,
      mistakes: allScores.length - correctCount,
      gameLabel: t('pattern_attention'),
    };

    setResult(res);
    setPhase('result');

    setSaving(true);
    try {
      await submitGameResult({
        gameType: 'patternAttention', difficulty, score, accuracy,
        completionTimeSeconds: totalTime, totalQuestions: allScores.length,
        correctAnswers: correctCount, mistakes: allScores.length - correctCount,
        completed: true, culturalTheme: 'ner',
      });
    } catch {
      toast(t('encourage_low'), 'warning');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Render: loading
  // ─────────────────────────────────────────────────────────────────────────
  if (loadingDiff) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Render: setup screen
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="page-wrapper animate-fade-in">
        <PageHeader title="Pattern Attention" emoji="🔷" backTo="/patient/games" />

        <div className="card mb-5 text-center">
          <p className="text-xl text-warm-700 mb-2">Find the item that does NOT belong with the others!</p>
          <p className="text-base text-warm-500">All items come from NER — tap the one from a different category.</p>
        </div>

        <div className="card mb-5">
          <h3 className="text-lg font-bold text-warm-800 mb-3">Choose Difficulty</h3>
          <div className="flex flex-col gap-3">
            {(['easy', 'medium', 'hard']).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all
                  ${difficulty === d ? 'border-primary-500 bg-primary-50' : 'border-warm-200 hover:border-primary-300'}`}
              >
                <div className="flex items-center gap-3">
                  <DifficultyBadge level={d} />
                  <span className="text-base text-warm-600">
                    {d === 'easy' ? `4 items · ${ROUNDS.easy} rounds` :
                     d === 'medium' ? `6 items · ${ROUNDS.medium} rounds` :
                                     `9 items · ${ROUNDS.hard} rounds`}
                  </span>
                </div>
                {difficulty === d && <span className="text-primary-600 font-bold">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => initGame(difficulty)} className="btn-primary btn-lg w-full">
          🔷 Start Game
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Render: result screen
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    return <GameResult result={result} onPlayAgain={() => setPhase('setup')} />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Render: playing
  // ─────────────────────────────────────────────────────────────────────────
  const correctCount = scores.filter(s => s.correct).length;
  const cols         = (round?.items?.length || 4) <= 4 ? 2 : 3;
  const answered     = selected !== null;
  const isLastRound  = roundNum >= totalRounds;

  return (
    <div className="page-wrapper animate-fade-in">
      <PageHeader title="Pattern Attention" emoji="🔷" backTo="/patient/games" />

      {/* Score bar */}
      <div className="card flex items-center justify-between px-4 py-3 mb-4">
        <span className="text-base font-semibold text-warm-700">
          Round {roundNum} / {totalRounds}
        </span>
        <span className="text-base font-semibold text-primary-700">✅ {correctCount}</span>
        <span className="text-base font-semibold text-danger-600">❌ {scores.length - correctCount}</span>
      </div>

      {/* Progress bar */}
      <div className="progress-track mb-4">
        <div className="progress-fill" style={{ width: `${((roundNum - 1) / totalRounds) * 100}%` }} />
      </div>

      {/* Instruction */}
      <div className="alert alert-info mb-4 text-lg font-semibold text-center">
        🔍 Which one does NOT belong?
      </div>

      <p className="text-sm text-warm-400 text-center mb-4">
        Most items are from: <strong className="text-warm-600 capitalize">{round?.mainCategory?.replace('_', ' ')}</strong>
      </p>

      {/* Item grid */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {round?.items?.map(item => {
          const isSelected   = selected === item.id;
          const isOdd        = item.id === round.oddId;
          const revealResult = answered;

          let borderClass = 'border-warm-200 bg-white hover:border-primary-400 hover:bg-primary-50 cursor-pointer active:scale-95';
          if (revealResult) {
            if (isOdd) {
              borderClass = 'border-green-400 bg-green-50 scale-105 shadow-glow cursor-default';
            } else if (isSelected) {
              borderClass = 'border-danger-400 bg-danger-50 cursor-default';
            } else {
              borderClass = 'border-warm-200 bg-warm-50 opacity-50 cursor-default';
            }
          }

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              disabled={answered}
              aria-label={`Select ${item.label}`}
              className={`aspect-square rounded-2xl border-4 flex flex-col items-center justify-center gap-1
                text-4xl transition-all duration-200 select-none ${borderClass}`}
            >
              <span aria-hidden="true">{item.emoji}</span>
              <span className="text-xs font-medium text-warm-600 text-center px-1 leading-tight">
                {item.label}
              </span>
              {revealResult && isOdd && <span className="text-lg">✅</span>}
              {revealResult && isSelected && !isOdd && <span className="text-lg">❌</span>}
            </button>
          );
        })}
      </div>

      {/* Feedback message */}
      {feedback && (
        <div className={`alert text-center text-lg font-semibold animate-fade-in mb-5
          ${feedback === 'correct' ? 'alert-success' : 'alert-danger'}`}>
          {feedback === 'correct'
            ? '🎉 Correct! Great attention!'
            : `❌ The odd one was: ${round?.items?.find(i => i.id === round.oddId)?.label}`}
        </div>
      )}

      {/* Next / Finish button — only appears after answering */}
      {answered && (
        <button
          onClick={handleNext}
          className="btn-primary btn-lg w-full animate-fade-in"
          aria-label={isLastRound ? 'Finish game' : 'Next question'}
        >
          {isLastRound ? '🏁 See Results' : 'Next →'}
        </button>
      )}

      {saving && (
        <div className="flex justify-center mt-4 gap-2 text-warm-500">
          <Spinner size="sm" /> Saving…
        </div>
      )}
    </div>
  );
}

