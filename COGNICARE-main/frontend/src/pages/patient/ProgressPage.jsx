import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getGameStats } from '../../services/gamesService';
import { getPerformanceSummary } from '../../services/aiService';
import { useLanguage } from '../../context/LanguageContext';
import PageHeader from '../../components/common/PageHeader';
import ScoreCard from '../../components/common/ScoreCard';
import DifficultyBadge from '../../components/common/DifficultyBadge';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';

const COLORS = ['#0d9488', '#f59e0b', '#8b5cf6', '#f43f5e'];

export default function ProgressPage() {
  const { t } = useLanguage();
  const [stats,   setStats]   = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days,    setDays]    = useState(14);

  const GAME_LABELS = {
    memoryMatching:   `🃏 ${t('memory_matching')}`,
    pictureRecall:    `🖼️ ${t('picture_recall')}`,
    sequenceMemory:   `🔢 ${t('sequence_memory')}`,
    patternAttention: `🔷 ${t('pattern_attention')}`,
  };

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([getGameStats(days), getPerformanceSummary()]).then(([sRes, sumRes]) => {
      if (sRes.status === 'fulfilled')   setStats(sRes.value.data?.data);
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data?.data);
      setLoading(false);
    });
  }, [days]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>
  );

  const hasData = stats && stats.totalSessions > 0;

  const trendData = [];
  if (stats) {
    const allDates = new Set();
    Object.values(stats.statsByGame).forEach(g => g.trend?.forEach(t => allDates.add(t.date)));
    [...allDates].sort().forEach(date => {
      const point = { date };
      Object.entries(stats.statsByGame).forEach(([key, g]) => {
        const d = g.trend?.find(t => t.date === date);
        if (d) point[key] = d.score;
      });
      trendData.push(point);
    });
  }

  return (
    <div className="page-wrapper animate-fade-in">
      <PageHeader title={t('my_progress_page')} emoji="📊" backTo="/patient"
        subtitle={t('progress_subtitle')} />

      <div className="flex gap-2 mb-5">
        {[7, 14, 30].map(d => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-4 py-2 rounded-2xl font-semibold text-base transition-colors
              ${days === d ? 'bg-primary-600 text-white' : 'bg-warm-100 text-warm-700 border-2 border-warm-300 hover:border-primary-300'}`}>
            {d}d
          </button>
        ))}
      </div>

      {!hasData ? (
        <EmptyState emoji="🎮" title={t('no_activity')} message={t('no_activity_msg')} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <ScoreCard icon="🎮" label={t('sessions')}  value={stats.totalSessions}          color="primary" />
            <ScoreCard icon="⭐" label={t('avg_score')} value={summary?.avgScore || 0}  unit="%" color="green" />
            <ScoreCard icon="🔥" label={t('streak')}    value={summary?.streakDays || 0} unit="d" color="amber" />
          </div>

          {summary?.summaryLines?.map((line, i) => (
            !line.includes('⚠️') && (
              <div key={i} className="alert alert-info mb-3 text-base">{line}</div>
            )
          ))}

          {trendData.length > 1 && (
            <div className="card mb-5">
              <h3 className="text-lg font-bold text-warm-800 mb-4">{t('score_trends')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={d => d?.slice(5)} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Legend formatter={key => GAME_LABELS[key] || key} />
                  {Object.keys(GAME_LABELS).map((key, i) => (
                    <Line key={key} type="monotone" dataKey={key}
                      stroke={COLORS[i]} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <h3 className="text-lg font-bold text-warm-800 mb-3">{t('game_breakdown')}</h3>
          <div className="flex flex-col gap-3 mb-5">
            {Object.entries(stats.statsByGame).map(([key, g]) => (
              <div key={key} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{GAME_LABELS[key]?.split(' ')[0]}</span>
                    <span className="font-bold text-warm-800">
                      {GAME_LABELS[key]?.split(' ').slice(1).join(' ')}
                    </span>
                  </div>
                  {g.sessions > 0 && (
                    <span className={`badge ${
                      g.recentTrend === 'improving' ? 'badge-green' :
                      g.recentTrend === 'declining' ? 'badge-red' : 'badge-grey'
                    }`}>
                      {g.recentTrend === 'improving' ? t('improving') :
                       g.recentTrend === 'declining' ? t('needs_work') : t('stable')}
                    </span>
                  )}
                </div>

                {g.sessions === 0 ? (
                  <p className="text-warm-400 text-sm">{t('not_played')}</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary-600">{g.avgScore}%</div>
                        <div className="text-xs text-warm-400">{t('avg_score')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-secondary-600">{g.avgAccuracy}%</div>
                        <div className="text-xs text-warm-400">{t('avg_accuracy')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-warm-600">{g.sessions}</div>
                        <div className="text-xs text-warm-400">{t('sessions')}</div>
                      </div>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${g.avgAccuracy}%`,
                        backgroundColor: g.avgAccuracy >= 70 ? '#0d9488' : g.avgAccuracy >= 50 ? '#f59e0b' : '#f43f5e' }} />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="alert alert-warning text-sm">{t('activity_disclaimer')}</div>
        </>
      )}
    </div>
  );
}

