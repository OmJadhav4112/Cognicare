import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getDifficulty, submitGameResult } from '../../../services/gamesService';
import { getSequenceItems, GAME_CONFIG } from '../../../data/nerContent';
import PageHeader from '../../../components/common/PageHeader';
import GameResult from '../../../components/games/GameResult';
import DifficultyBadge from '../../../components/common/DifficultyBadge';
import Spinner from '../../../components/common/Spinner';
import { useToast } from '../../../components/common/Toast';

const PHASES = { setup: 'setup', show: 'show', input: 'input', result: 'result' };
const SHOW_MS = 900;   // how long each item is highlighted
const GAP_MS  = 400;   // gap between highlights

export default function SequenceMemoryGame() {
  const toast = useToast();
  const startTime = useRef(null);

  const [phase,       setPhase]      = useState(PHASES.setup);
  const [difficulty,  setDifficulty] = useState('easy');
  const [sequence,    setSequence]   = useState([]);
  const [highlighted, setHighlighted]= useState(null);
  const [userInput,   setUserInput]  = useState([]);
  const [mistakes,    setMistakes]   = useState(0);
  const [result,      setResult]     = useState(null);
  const [loadingDiff, setLoadingDiff]= useState(true);
  const [saving,      setSaving]     = useState(false);
  const [showingIdx,  setShowingIdx] = useState(-1);

  useEffect(() => {
    getDifficulty().then(res => {
      setDifficulty(res.data?.data?.gameDifficulty?.sequenceMemory || 'easy');
    }).catch(() => {}).finally(() => setLoadingDiff(false));
  }, []);

  const initGame = useCallback((diff) => {
    const len   = GAME_CONFIG.sequenceMemory[diff];
    const items = getSequenceItems(len, diff);
    setSequence(items);
    setUserInput([]);
    setMistakes(0);
    setResult(null);
    setShowingIdx(-1);
    setPhase(PHASES.show);
    startTime.current = null;

    // Play the sequence after a brief delay
    setTimeout(() => playSequence(items), 800);
  }, []);

  const playSequence = (items) => {
    items.forEach((_, i) => {
      setTimeout(() => setHighlighted(i),  i * (SHOW_MS + GAP_MS));
      setTimeout(() => setHighlighted(null), i * (SHOW_MS + GAP_MS) + SHOW_MS);
    });
    // Switch to input phase after all items shown
    setTimeout(() => {
      setPhase(PHASES.input);
      startTime.current = Date.now();
    }, items.length * (SHOW_MS + GAP_MS) + 500);
  };

  const handleSelect = (idx) => {
    if (phase !== PHASES.input) return;
    const expected  = sequence[userInput.length];
    const selected  = sequence[idx];
    const isCorrect = selected.id === expected.id;

    const newInput = [...userInput, { idx, correct: isCorrect }];
    setUserInput(newInput);
    if (!isCorrect) setMistakes(m => m + 1);

    if (newInput.length === sequence.length) {
      const timeTaken    = Math.round((Date.now() - startTime.current) / 1000);
      const correctCount = newInput.filter(x => x.correct).length;
      const accuracy     = Math.round((correctCount / sequence.length) * 100);
      const timeBonus    = Math.max(0, 100 - timeTaken * 3);
      const score        = Math.round((accuracy * 0.75) + (timeBonus * 0.25));

      const res = { score, accuracy, timeTaken, correctAnswers: correctCount,
        totalQuestions: sequence.length, mistakes: sequence.length - correctCount,
        gameLabel: 'Sequence Memory' };
      setResult(res);
      setPhase(PHASES.result);

      setSaving(true);
      submitGameResult({ gameType: 'sequenceMemory', difficulty, score, accuracy,
        completionTimeSeconds: timeTaken, totalQuestions: sequence.length,
        correctAnswers: correctCount, mistakes: sequence.length - correctCount,
        completed: true, culturalTheme: 'ner' })
        .catch(() => toast('Could not save result.', 'warning'))
        .finally(() => setSaving(false));
    }
  };

  if (phase === PHASES.setup || loadingDiff) {
    if (loadingDiff) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;
    return (
      <div className="page-wrapper animate-fade-in">
        <PageHeader title="Sequence Memory" emoji="🔢" backTo="/patient/games" />
        <div className="card mb-5 text-center">
          <p className="text-xl text-warm-700 mb-2">Watch the sequence, then tap the items in the same order!</p>
          <p className="text-base text-warm-500">Items will light up one by one — remember the order.</p>
        </div>
        <div className="card mb-5">
          <h3 className="text-lg font-bold text-warm-800 mb-3">Choose Difficulty</h3>
          <div className="flex flex-col gap-3">
            {['easy', 'medium', 'hard'].map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all
                  ${difficulty === d ? 'border-primary-500 bg-primary-50' : 'border-warm-200 hover:border-primary-300'}`}>
                <div className="flex items-center gap-3">
                  <DifficultyBadge level={d} />
                  <span className="text-base text-warm-600">
                    {d === 'easy' ? '3 items in sequence' :
                     d === 'medium' ? '5 items in sequence' : '7 items in sequence'}
                  </span>
                </div>
                {difficulty === d && <span className="text-primary-600 font-bold">✓</span>}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => initGame(difficulty)} className="btn-primary btn-lg w-full">🔢 Start Game</button>
      </div>
    );
  }

  if (phase === PHASES.result) {
    return <GameResult result={result} onPlayAgain={() => { setPhase(PHASES.setup); }} />;
  }

  // ── Show / Input phase grid ───────────────
  const answeredCount = userInput.length;

  return (
    <div className="page-wrapper animate-fade-in">
      <PageHeader title="Sequence Memory" emoji="🔢" backTo="/patient/games" />

      {phase === PHASES.show && (
        <div className="alert alert-warning text-xl font-bold text-center mb-4 animate-fade-in">
          👀 Watch the sequence carefully!
        </div>
      )}
      {phase === PHASES.input && (
        <div className="alert alert-info text-lg font-semibold text-center mb-4">
          Now tap them in the same order! ({answeredCount}/{sequence.length})
        </div>
      )}

      {/* Progress */}
      <div className="progress-track mb-5">
        <div className="progress-fill" style={{ width: `${(answeredCount / sequence.length) * 100}%` }} />
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-3 gap-4">
        {sequence.map((item, idx) => {
          const isHighlighted = highlighted === idx;
          const answered      = userInput[idx];
          const isAnswered    = idx < answeredCount;
          const isCorrect     = answered?.correct;

          return (
            <button
              key={item.id}
              onClick={() => phase === PHASES.input && !isAnswered && handleSelect(idx)}
              disabled={phase === PHASES.show || isAnswered}
              aria-label={phase === PHASES.show ? item.label : `Select ${item.label}`}
              className={`
                aspect-square rounded-2xl border-4 flex flex-col items-center justify-center gap-1
                text-4xl transition-all duration-200 select-none
                ${isHighlighted
                  ? 'border-secondary-400 bg-secondary-100 shadow-glow scale-105'
                  : isAnswered
                  ? isCorrect
                    ? 'border-green-400 bg-green-50 cursor-default'
                    : 'border-danger-400 bg-danger-50 cursor-default'
                  : phase === PHASES.input
                  ? 'border-warm-200 bg-white hover:border-primary-400 hover:bg-primary-50 cursor-pointer active:scale-95'
                  : 'border-warm-200 bg-warm-100 cursor-default'}
              `}
            >
              <span aria-hidden="true">{item.emoji}</span>
              <span className="text-xs font-medium text-warm-600 text-center px-1 leading-tight hidden sm:block">
                {item.label}
              </span>
              {isAnswered && (
                <span className="text-base">{isCorrect ? '✅' : '❌'}</span>
              )}
            </button>
          );
        })}
      </div>

      {saving && <div className="flex justify-center mt-4 gap-2 text-warm-500"><Spinner size="sm" />Saving…</div>}
    </div>
  );
}

