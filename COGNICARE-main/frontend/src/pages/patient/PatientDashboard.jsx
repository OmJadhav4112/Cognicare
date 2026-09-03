import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, LanguageSelector } from '../../context/LanguageContext';
import { getProgressSummary } from '../../services/patientService';
import Spinner   from '../../components/common/Spinner';
import ScoreCard from '../../components/common/ScoreCard';

const GREETING_KEY = () => {
  const h = new Date().getHours();
  if (h < 12) return 'greeting_morning';
  if (h < 17) return 'greeting_afternoon';
  return 'greeting_evening';
};

export default function PatientDashboard() {
  const { user }  = useAuth();
  const { t }     = useLanguage();
  const navigate  = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProgressSummary()
      .then(res => setSummary(res.data?.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>
  );

  return (
    <div className="page-wrapper animate-fade-in">

      {/* Greeting + Language */}
      <section className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-warm-900">
            {t(GREETING_KEY())}, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-base text-warm-500 mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="shrink-0 mt-1">
          <LanguageSelector className="text-sm" />
        </div>
      </section>

      {/* SOS */}
      <section className="mb-6">
        <button
          onClick={() => navigate('/patient/sos')}
          className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl
            bg-danger-500 text-white font-bold text-xl
            hover:bg-danger-600 active:scale-[0.98] transition-all shadow-md"
          aria-label={t('sos_alert')}
        >
          <span className="text-3xl animate-sos-ring">🆘</span>
          {t('sos_alert')}
        </button>
      </section>

      {/* Analytics */}
      {summary ? (
        <section className="mb-6">
          <h2 className="text-xl font-bold text-warm-800 mb-3">📊 {t('my_progress')}</h2>
          <div className="grid grid-cols-3 gap-3">
            <ScoreCard icon="🔥" label={t('streak')}    value={summary.streakDays}    color="amber" />
            <ScoreCard icon="🎮" label={t('this_week')} value={summary.sessionCount}  unit={t('games')} color="primary" />
            <ScoreCard icon="⭐" label={t('avg_score')} value={summary.avgScore ?? 0} unit="%" color="green" />
          </div>
          <button
            onClick={() => navigate('/patient/progress')}
            className="mt-3 w-full text-center text-primary-600 font-semibold text-sm py-2 hover:text-primary-700 transition-colors"
          >
            {t('see_all')} →
          </button>
        </section>
      ) : (
        <section className="mb-6">
          <div className="card text-center py-8 text-warm-400">
            <p className="text-4xl mb-3">🎮</p>
            <p className="text-base font-medium text-warm-600">{t('games')}</p>
            <p className="text-sm mt-1">{t('play_first_game')}</p>
            <button
              onClick={() => navigate('/patient/games')}
              className="btn-primary btn-sm mt-4"
            >
              {t('start_playing')}
            </button>
          </div>
        </section>
      )}

      <p className="text-xs text-warm-400 text-center mt-2 mb-4">
        ⚠️ {t('disclaimer')}
      </p>
    </div>
  );
}
