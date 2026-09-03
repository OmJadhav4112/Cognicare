import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientOverview } from '../../services/caregiverService';
import { useLanguage } from '../../context/LanguageContext';
import PageHeader from '../../components/common/PageHeader';
import ScoreCard from '../../components/common/ScoreCard';
import DifficultyBadge from '../../components/common/DifficultyBadge';
import Spinner from '../../components/common/Spinner';

export default function PatientMonitor() {
  const { patientId } = useParams();
  const navigate      = useNavigate();
  const { t }         = useLanguage();

  const GAME_LABELS = {
    memoryMatching:   `🃏 ${t('memory_matching')}`,
    pictureRecall:    `🖼️ ${t('picture_recall')}`,
    sequenceMemory:   `🔢 ${t('sequence_memory')}`,
    patternAttention: `🔷 ${t('pattern_attention')}`,
  };

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    getPatientOverview(patientId)
      .then(res => setData(res.data?.data))
      .catch(() => setError('Could not load patient data.'))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>
  );
  if (error) return (
    <div className="page-wrapper"><div className="alert alert-danger">{error}</div></div>
  );

  const { user, cognitiveProfile, gameDifficulty, totalActivitiesCompleted,
          streakDays, lastActivityDate, recentPerformances, pendingSOS } = data;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-28 pt-6 animate-fade-in">
      <PageHeader title={user?.name} emoji="👴" backTo="/caregiver"
        subtitle={t('patient_overview')} />

      {pendingSOS?.length > 0 && (
        <button onClick={() => navigate('/caregiver/sos')}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-danger-50 border-2 border-danger-400
            text-danger-700 font-bold mb-4 hover:bg-danger-100 transition-colors animate-sos-ring">
          <span className="text-3xl">🆘</span>
          <span>{pendingSOS.length} {t('unack_sos')}{pendingSOS.length > 1 ? 's' : ''}</span>
          <span className="ml-auto">→</span>
        </button>
      )}

      <div className="grid grid-cols-3 gap-3 mb-5">
        <ScoreCard icon="🎮" label={t('activities')} value={totalActivitiesCompleted}           color="primary" />
        <ScoreCard icon="🔥" label={t('streak')}     value={streakDays}              unit="d"   color="amber" />
        <ScoreCard icon="🧠" label="Level"            value={cognitiveProfile?.overallLevel || '—'} color="green" />
      </div>

      {lastActivityDate && (
        <div className="alert alert-info mb-4 text-base">
          📅 {t('last_active')}: {new Date(lastActivityDate).toLocaleDateString('en-IN',
            { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      )}

      <div className="card mb-5">
        <h3 className="text-lg font-bold text-warm-800 mb-2">{t('cognitive_profile')}</h3>
        <p className="text-xs text-warm-400 mb-3">{t('cog_disclaimer')}</p>
        {[
          { label: t('memory_score'),    value: cognitiveProfile?.memoryScore    || 0, color: '#0d9488' },
          { label: t('attention_score'), value: cognitiveProfile?.attentionScore || 0, color: '#f59e0b' },
          { label: t('pattern_score'),   value: cognitiveProfile?.patternScore   || 0, color: '#8b5cf6' },
        ].map(({ label, value, color }) => (
          <div key={label} className="mb-3">
            <div className="flex justify-between text-sm font-medium mb-1">
              <span className="text-warm-700">{label}</span>
              <span className="text-warm-600">{value}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${value}%`, backgroundColor: color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-5">
        <h3 className="text-lg font-bold text-warm-800 mb-3">{t('difficulty_levels')}</h3>
        <div className="flex flex-col gap-2">
          {Object.entries(gameDifficulty || {}).map(([game, diff]) => (
            <div key={game} className="flex items-center justify-between py-2 border-b border-warm-100 last:border-0">
              <span className="text-base text-warm-700">{GAME_LABELS[game] || game}</span>
              <DifficultyBadge level={diff} />
            </div>
          ))}
        </div>
      </div>

      <div className="card mb-5">
        <h3 className="text-lg font-bold text-warm-800 mb-3">{t('recent_sessions')}</h3>
        {recentPerformances?.length === 0 ? (
          <p className="text-warm-400 text-center py-4">{t('no_recent')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentPerformances?.slice(0, 8).map(p => (
              <div key={p._id} className="flex items-center justify-between py-2 border-b border-warm-100 last:border-0">
                <div>
                  <div className="text-base font-semibold text-warm-800">{GAME_LABELS[p.gameType]}</div>
                  <div className="text-xs text-warm-400 mt-0.5">
                    {new Date(p.createdAt).toLocaleDateString('en-IN',
                      { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DifficultyBadge level={p.difficulty} />
                  <span className={`font-bold text-lg ${p.score >= 70 ? 'text-green-600' : p.score >= 50 ? 'text-yellow-600' : 'text-danger-500'}`}>
                    {p.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: '🤖', label: t('ai_insights'),    to: `/caregiver/patient/${patientId}/insights`  },
          { icon: '📸', label: t('manage_memories'), to: `/caregiver/patient/${patientId}/memories`  },
          { icon: '🔔', label: t('reminders'),       to: `/caregiver/patient/${patientId}/reminders` },
          { icon: '💬', label: t('add_feedback'),    to: `/caregiver/patient/${patientId}/feedback`  },
          { icon: '📍', label: t('location_safety'), to: `/caregiver/patient/${patientId}/location` },
        ].map(({ icon, label, to }) => (
          <button key={to} onClick={() => navigate(to)}
            className="card flex items-center gap-3 hover:shadow-card transition-all text-left">
            <span className="text-3xl">{icon}</span>
            <span className="font-semibold text-base text-warm-800">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

