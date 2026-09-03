import React, { useState, useEffect, useCallback } from 'react';
import { getDifficulty, submitGameResult } from '../../../services/gamesService';
import { getPictureRecallSet, GAME_CONFIG } from '../../../data/nerContent';
import PageHeader from '../../../components/common/PageHeader';
import GameResult from '../../../components/games/GameResult';
import GameTimer from '../../../components/games/GameTimer';
import DifficultyBadge from '../../../components/common/DifficultyBadge';
import Spinner from '../../../components/common/Spinner';
import { useToast } from '../../../components/common/Toast';

const PHASES = { setup: 'setup', study: 'study', recall: 'recall', result: 'result' };
// Study time per difficulty (seconds)
const STUDY_TIME = { easy: 12, medium: 10, hard: 8 };

export default function PictureRecallGame() {
  const toast = useToast();

  const [phase,       setPhase]      = useState(PHASES.setup);
  const [difficulty,  setDifficulty] = useState('easy');
  const [studyItems,  setStudyItems] = useState([]);
  const [recallItems, setRecallItems]= useState([]);  // shuffled study + distractors
  const [selected,    setSelected]   = useState(new Set());
  const [countdown,   setCountdown]  = useState(0);
  const [timerSecs,   setTimerSecs]  = useState(0);
  const [result,      setResult]     = useState(null);
  const [loadingDiff, setLoadingDiff]= useState(true);
  const [saving,      setSaving]     = useState(false);

  useEffect(() => {
    getDifficulty().then(res => {
      setDifficulty(res.data?.data?.gameDifficulty?.pictureRecall || 'easy');
    }).catch(() => {}).finally(() => setLoadingDiff(false));
  }, []);

  const initGame = useCallback((diff) => {
    const studyCount = GAME_CONFIG.pictureRecall[diff];
    const { studyItems: si, distractors } = getPictureRecallSet(studyCount, diff);

    // Shuffle study items + distractors together for the recall phase
    const allRecall = [...si, ...distractors].sort(() => Math.random() - 0.5);

    setStudyItems(si);
    setRecallItems(allRecall);
    setSelected(new Set());
    setTimerSecs(0);
    setResult(null);
    setCountdown(STUDY_TIME[diff]);
    setPhase(PHASES.study);
  }, []);

  // Countdown timer for study phase
  useEffect(() => {
    if (phase !== PHASES.study) return;
    if (countdown <= 0) { setPhase(PHASES.recall); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submitRecall = async () => {
    const studyIds    = new Set(studyItems.map(i => i.id));
    let correct = 0, wrong = 0;

    selected.forEach(id => {
      if (studyIds.has(id)) correct++; else wrong++;
    });
    // Missed items (in study but not selected)
    studyIds.forEach(id => { if (!selected.has(id)) wrong++; });

    const total    = studyItems.length;
    const accuracy = Math.round((correct / total) * 100);
    const timeBonus= Math.max(0, 100 - Math.floor(timerSecs / 4));
    const score    = Math.round((accuracy * 0.75) + (timeBonus * 0.25));

    const resultData = {
      score,
      accuracy,
      timeTaken: timerSecs,
      correctAnswers: correct,
      totalQuestions: total,
      mistakes: wrong,
      gameLabel: 'Picture Recall'
    };
    setResult(resultData);
    setPhase(PHASES.result);

    setSaving(true);
    try {
      await submitGameResult({
        gameType: 'pictureRecall',
        difficulty,
        score,
        accuracy,
        completionTimeSeconds: timerSecs,
        totalQuestions: total,
        correctAnswers: correct,
        mistakes: wrong,
        completed: true,
        culturalTheme: 'ner'
      });
    } catch { toast('Could not save result.', 'warning'); }
    finally { setSaving(false); }
  };

  if (phase === PHASES.setup || loadingDiff) {
    if (loadingDiff) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;
    return (
      <div className="page-wrapper animate-fade-in">
        <PageHeader title="Picture Recall" emoji="🖼️" backTo="/patient/games" />
        <div className="card mb-5 text-center">
          <p className="text-xl text-warm-700 mb-2">Study the pictures, then remember which ones you saw!</p>
          <p className="text-base text-warm-500">You'll have a few seconds to memorise — then select the ones you remember.</p>
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
                    {d === 'easy' ? `4 pictures, ${STUDY_TIME.easy}s to study` :
                     d === 'medium' ? `6 pictures, ${STUDY_TIME.medium}s to study` :
                     `9 pictures, ${STUDY_TIME.hard}s to study`}
                  </span>
                </div>
                {difficulty === d && <span className="text-primary-600 font-bold">✓</span>}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => initGame(difficulty)} className="btn-primary btn-lg w-full">🖼️ Start Game</button>
      </div>
    );
  }

  if (phase === PHASES.result) {
    return <GameResult result={result} onPlayAgain={() => initGame(difficulty)} />;
  }

  // ── Study phase ───────────────────────────
  if (phase === PHASES.study) {
    return (
      <div className="page-wrapper animate-fade-in">
        <PageHeader title="Picture Recall — Study" emoji="🖼️" backTo="/patient/games" />
        <div className="alert alert-warning mb-4 text-lg font-semibold text-center">
          📸 Remember these pictures! Time remaining: <span className="text-2xl">{countdown}s</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {studyItems.map(item => (
            <div key={item.id} className="card flex flex-col items-center gap-2 text-center">
              <span className="text-6xl" aria-hidden="true">{item.emoji}</span>
              <span className="font-bold text-warm-800 text-base">{item.label}</span>
              <span className="text-xs text-warm-500 italic">{item.nativeLabel}</span>
            </div>
          ))}
        </div>
        <div className="progress-track mt-5">
          <div className="progress-fill bg-secondary-500" style={{ width: `${(countdown / STUDY_TIME[difficulty]) * 100}%` }} />
        </div>
      </div>
    );
  }

  // ── Recall phase ──────────────────────────
  return (
    <div className="page-wrapper animate-fade-in">
      <PageHeader title="Picture Recall — Select" emoji="🖼️" backTo="/patient/games" />
      <div className="card flex items-center justify-between px-4 py-3 mb-4">
        <p className="text-base font-semibold text-warm-700">
          Tap the pictures you studied ({selected.size} selected)
        </p>
        <GameTimer running onTick={setTimerSecs} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {recallItems.map(item => {
          const isSelected = selected.has(item.id);
          return (
            <button key={item.id} onClick={() => toggleSelect(item.id)}
              className={`card flex flex-col items-center gap-2 text-center transition-all
                ${isSelected ? 'border-4 border-primary-500 bg-primary-50 shadow-glow' : 'hover:border-primary-300'}`}
              aria-pressed={isSelected}>
              <span className="text-5xl" aria-hidden="true">{item.emoji}</span>
              <span className="font-semibold text-warm-800 text-base">{item.label}</span>
              <span className="text-xs text-warm-500 italic">{item.nativeLabel}</span>
              {isSelected && <span className="badge badge-green mt-1">✓ Selected</span>}
            </button>
          );
        })}
      </div>

      <button onClick={submitRecall} className="btn-primary btn-lg w-full">
        ✅ Submit My Choices
      </button>
      {saving && <div className="flex justify-center mt-3 gap-2 text-warm-500"><Spinner size="sm" />Saving…</div>}
    </div>
  );
}

