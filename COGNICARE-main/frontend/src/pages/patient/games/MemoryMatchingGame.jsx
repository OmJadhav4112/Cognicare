import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDifficulty, submitGameResult } from '../../../services/gamesService';
import { getMatchingPairs, GAME_CONFIG } from '../../../data/nerContent';
import { useLanguage } from '../../../context/LanguageContext';
import PageHeader      from '../../../components/common/PageHeader';
import GameResult      from '../../../components/games/GameResult';
import GameTimer       from '../../../components/games/GameTimer';
import DifficultyBadge from '../../../components/common/DifficultyBadge';
import Spinner         from '../../../components/common/Spinner';
import { useToast }    from '../../../components/common/Toast';

const PHASES = { setup: 'setup', playing: 'playing', result: 'result' };

export default function MemoryMatchingGame() {
  const navigate = useNavigate();
  const toast    = useToast();
  const { t }    = useLanguage();

  const [phase,       setPhase]       = useState(PHASES.setup);
  const [difficulty,  setDifficulty]  = useState('easy');
  const [cards,       setCards]       = useState([]);
  const [flipped,     setFlipped]     = useState([]);
  const [matched,     setMatched]     = useState(new Set());
  const [mistakes,    setMistakes]    = useState(0);
  const [timerSecs,   setTimerSecs]   = useState(0);
  const [result,      setResult]      = useState(null);
  const [loadingDiff, setLoadingDiff] = useState(true);
  const [saving,      setSaving]      = useState(false);

  const lockRef       = useRef(false);
  const timerRef      = useRef(0);
  const diffRef       = useRef('easy');
  const mistakesRef   = useRef(0);
  const matchedRef    = useRef(new Set());
  const totalPairsRef = useRef(0);

  useEffect(() => { timerRef.current    = timerSecs;   }, [timerSecs]);
  useEffect(() => { diffRef.current     = difficulty;  }, [difficulty]);
  useEffect(() => { mistakesRef.current = mistakes;    }, [mistakes]);
  useEffect(() => { matchedRef.current  = matched;     }, [matched]);

  useEffect(() => {
    getDifficulty()
      .then(res => {
        const d = res.data?.data?.gameDifficulty?.memoryMatching || 'easy';
        setDifficulty(d);
        diffRef.current = d;
      })
      .catch(() => {})
      .finally(() => setLoadingDiff(false));
  }, []);

  const initGame = useCallback((diff) => {
    const pairCount = GAME_CONFIG.memoryMatching[diff];
    const newCards  = getMatchingPairs(pairCount, diff);
    setCards(newCards);
    setFlipped([]);
    setMatched(new Set());
    setMistakes(0);
    setTimerSecs(0);
    setResult(null);
    lockRef.current       = false;
    timerRef.current      = 0;
    diffRef.current       = diff;
    mistakesRef.current   = 0;
    matchedRef.current    = new Set();
    totalPairsRef.current = pairCount;
    setPhase(PHASES.playing);
  }, []);

  const finishGame = useCallback(async (finalMatched, finalMistakes, finalTime, diff) => {
    const total     = totalPairsRef.current;
    const accuracy  = total > 0 ? Math.round((finalMatched / total) * 100) : 0;
    const timeBonus = Math.max(0, 100 - Math.floor(finalTime / 3));
    const score     = Math.round((accuracy * 0.7) + (timeBonus * 0.3));

    setResult({ score, accuracy, timeTaken: finalTime, correctAnswers: finalMatched,
                totalQuestions: total, mistakes: finalMistakes, gameLabel: t('memory_matching') });
    setPhase(PHASES.result);

    setSaving(true);
    try {
      await submitGameResult({ gameType: 'memoryMatching', difficulty: diff, score, accuracy,
        completionTimeSeconds: finalTime, totalQuestions: total, correctAnswers: finalMatched,
        mistakes: finalMistakes, completed: true, culturalTheme: 'ner' });
    } catch {
      toast(t('encourage_low'), 'warning');
    } finally {
      setSaving(false);
    }
  }, [toast, t]);

  const handleFlip = useCallback((idx) => {
    if (lockRef.current) return;
    setFlipped(prev => {
      if (prev.includes(idx)) return prev;
      const newFlipped = [...prev, idx];
      if (newFlipped.length < 2) return newFlipped;
      lockRef.current = true;
      setCards(currentCards => {
        const [a, b] = newFlipped;
        const cardA  = currentCards[a];
        const cardB  = currentCards[b];
        if (!cardA || !cardB) { lockRef.current = false; return currentCards; }
        if (cardA.id === cardB.id) {
          const newMatched = new Set(matchedRef.current);
          newMatched.add(cardA.id);
          matchedRef.current = newMatched;
          setMatched(newMatched);
          setFlipped([]);
          lockRef.current = false;
          const total = totalPairsRef.current;
          if (newMatched.size >= total && total > 0) {
            setTimeout(() => finishGame(newMatched.size, mistakesRef.current,
                                        timerRef.current, diffRef.current), 500);
          }
        } else {
          mistakesRef.current += 1;
          setMistakes(m => m + 1);
          setTimeout(() => { setFlipped([]); lockRef.current = false; }, 900);
        }
        return currentCards;
      });
      return newFlipped;
    });
  }, [finishGame]);

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (phase === PHASES.setup || loadingDiff) {
    if (loadingDiff) return (
      <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>
    );
    return (
      <div className="page-wrapper animate-fade-in">
        <PageHeader title={t('memory_matching')} emoji="🃏" backTo="/patient/games" />
        <div className="card mb-5 text-center">
          <p className="text-xl text-warm-700 mb-2">{t('match_instruction')}</p>
          <p className="text-base text-warm-500">{t('match_sub')}</p>
        </div>
        <div className="card mb-5">
          <h3 className="text-lg font-bold text-warm-800 mb-3">{t('choose_difficulty')}</h3>
          <div className="flex flex-col gap-3">
            {(['easy', 'medium', 'hard']).map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all
                  ${difficulty === d ? 'border-primary-500 bg-primary-50' : 'border-warm-200 hover:border-primary-300'}`}>
                <div className="flex items-center gap-3">
                  <DifficultyBadge level={d} />
                  <span className="text-base text-warm-600">
                    {d === 'easy' ? t('difficulty_easy') : d === 'medium' ? t('difficulty_medium') : t('difficulty_hard')}
                  </span>
                </div>
                {difficulty === d && <span className="text-primary-600 font-bold">✓</span>}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => initGame(difficulty)} className="btn-primary btn-lg w-full">
          {t('start_game')}
        </button>
      </div>
    );
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (phase === PHASES.result && result) {
    return <GameResult result={result} onPlayAgain={() => initGame(difficulty)} backTo="/patient/games" />;
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  const pairCount  = GAME_CONFIG.memoryMatching[difficulty];
  const cols       = pairCount <= 6 ? 3 : 4;
  const totalPairs = totalPairsRef.current || pairCount;
  const foundPairs = matched.size;

  return (
    <div className="page-wrapper animate-fade-in">
      <PageHeader title={t('memory_matching')} emoji="🃏" backTo="/patient/games" />

      <div className="card flex items-center justify-between px-4 py-3 mb-4">
        <GameTimer running={phase === PHASES.playing}
          onTick={(s) => { setTimerSecs(s); timerRef.current = s; }} />
        <div className="flex items-center gap-1 text-base font-semibold text-primary-700">
          <span>🃏</span><span>{foundPairs}/{totalPairs} {t('pairs')}</span>
        </div>
        <div className="flex items-center gap-1 text-base font-semibold text-danger-600">
          <span>❌</span><span>{mistakes} {t('mistakes')}</span>
        </div>
      </div>

      <div className="progress-track mb-5">
        <div className="progress-fill"
          style={{ width: `${totalPairs > 0 ? (foundPairs / totalPairs) * 100 : 0}%` }} />
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        aria-label="Memory matching card grid">
        {cards.map((card, idx) => {
          const isFlippedNow = flipped.includes(idx);
          const isMatched    = matched.has(card.id);
          const isVisible    = isFlippedNow || isMatched;
          return (
            <button
              key={card.cardId}
              onClick={() => !isMatched && !isFlippedNow && handleFlip(idx)}
              disabled={isMatched}
              aria-label={isVisible ? card.label : 'Hidden card'}
              className={`aspect-square rounded-2xl border-4 flex items-center justify-center
                transition-all duration-300 select-none
                ${isMatched
                  ? 'border-green-400 bg-green-50 scale-95 cursor-default'
                  : isFlippedNow
                  ? 'border-primary-400 bg-primary-50 shadow-glow'
                  : 'border-warm-200 bg-warm-100 hover:border-primary-300 hover:bg-primary-50 cursor-pointer active:scale-95'}`}
            >
              {isVisible ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-4xl" aria-hidden="true">{card.emoji}</span>
                  <span className="text-xs font-medium text-warm-600 leading-tight text-center px-1 hidden sm:block">
                    {card.label}
                  </span>
                </div>
              ) : (
                <span className="text-3xl" aria-hidden="true">🌿</span>
              )}
            </button>
          );
        })}
      </div>

      {foundPairs > 0 && foundPairs >= totalPairs && (
        <div className="alert alert-success mt-5 text-center text-lg font-semibold animate-fade-in">
          {t('all_matched')}
        </div>
      )}
      {saving && (
        <div className="flex items-center justify-center gap-2 mt-4 text-warm-500">
          <Spinner size="sm" /> {t('saving_result')}
        </div>
      )}
    </div>
  );
}

