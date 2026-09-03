import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

export default function GameResult({ result, onPlayAgain, backTo = '/patient/games' }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { score, accuracy, timeTaken, correctAnswers, totalQuestions, mistakes, gameLabel } = result;

  const grade =
    score >= 90 ? { emoji: '🏆', label: t('grade_excellent'), color: 'text-yellow-600' } :
    score >= 70 ? { emoji: '🌟', label: t('grade_well_done'),  color: 'text-primary-600' } :
    score >= 50 ? { emoji: '👍', label: t('grade_good_effort'),color: 'text-blue-600'    } :
                  { emoji: '💪', label: t('grade_keep_going'), color: 'text-warm-600'    };

  const encouragement =
    score >= 80 ? t('encourage_high') :
    score >= 60 ? t('encourage_mid')  :
                  t('encourage_low');

  return (
    <div className="page-wrapper flex flex-col items-center animate-fade-in">
      <div className="text-7xl mt-6 mb-2" aria-hidden="true">{grade.emoji}</div>
      <h2 className={`text-3xl font-bold mb-1 ${grade.color}`}>{grade.label}</h2>
      <p className="text-base text-warm-500 mb-6">{gameLabel} {t('game_complete')}</p>

      {/* Score card */}
      <div className="card w-full mb-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-2">
            <div className="text-5xl font-bold text-primary-600">{score}</div>
            <div className="text-sm text-warm-400 mt-1">{t('score')}</div>
          </div>
          <div className="text-center p-2">
            <div className="text-5xl font-bold text-secondary-600">{accuracy}%</div>
            <div className="text-sm text-warm-400 mt-1">{t('accuracy')}</div>
          </div>
          <div className="text-center p-2">
            <div className="text-3xl font-bold text-green-600">{correctAnswers}/{totalQuestions}</div>
            <div className="text-sm text-warm-400 mt-1">{t('correct')}</div>
          </div>
          <div className="text-center p-2">
            <div className="text-3xl font-bold text-warm-600">{timeTaken}s</div>
            <div className="text-sm text-warm-400 mt-1">{t('time')}</div>
          </div>
        </div>
      </div>

      <div className="alert alert-info w-full mb-5 text-base">
        {encouragement}
      </div>

      <div className="flex flex-col gap-3 w-full">
        <button onClick={onPlayAgain} className="btn-primary btn-lg w-full">
          {t('play_again')}
        </button>
        <button onClick={() => navigate(backTo)} className="btn-outline btn-lg w-full">
          {t('back_to_games')}
        </button>
      </div>

      <p className="text-xs text-warm-400 text-center mt-6">
        {t('game_disclaimer')}
      </p>
    </div>
  );
}
