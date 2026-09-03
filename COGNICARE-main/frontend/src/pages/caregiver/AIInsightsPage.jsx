import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getPatientInsights, applyDifficulty } from '../../services/aiService';
import { useLanguage } from '../../context/LanguageContext';
import PageHeader from '../../components/common/PageHeader';
import DifficultyBadge from '../../components/common/DifficultyBadge';
import Spinner from '../../components/common/Spinner';
import { useToast } from '../../components/common/Toast';

export default function AIInsightsPage() {
  const { patientId } = useParams();
  const toast = useToast();
  const { t } = useLanguage();

  const GAME_LABELS = {
    memoryMatching:   `🃏 ${t('memory_matching')}`,
    pictureRecall:    `🖼️ ${t('picture_recall')}`,
    sequenceMemory:   `🔢 ${t('sequence_memory')}`,
    patternAttention: `🔷 ${t('pattern_attention')}`,
  };

  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [applying, setApplying] = useState(false);

  const load = () => {
    setLoading(true);
    getPatientInsights(patientId)
      .then(res => setData(res.data?.data))
      .catch(() => toast('Could not load insights.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [patientId]);

  const handleApply = async () => {
    setApplying(true);
    try {
      await applyDifficulty(patientId);
      toast('Difficulty updated based on AI recommendations! ✅', 'success');
      load();
    } catch { toast('Could not apply difficulty.', 'error'); }
    finally { setApplying(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;
  if (!data)   return null;

  const { recommendations, summary, metrics, cognitiveProfile, gameDifficulty } = data;

  // Chart data for avg scores
  const chartData = Object.entries(metrics || {})
    .filter(([, g]) => g.sessions > 0)
    .map(([key, g]) => ({
      name: GAME_LABELS[key]?.split(' ').slice(1).join(' ') || key,
      score: g.avgScore,
      accuracy: g.avgAccuracy
    }));

  return (
    <div className="max-w-3xl mx-auto px-4 pb-28 pt-6 animate-fade-in">
      <PageHeader title={t('ai_insights_page')} emoji="🤖" backTo={`/caregiver/patient/${patientId}`}
        subtitle={t('ai_summary')} />

      <div className="alert alert-warning mb-5 text-sm">
        {t('ai_disclaimer')}
      </div>

      {/* Summary */}
      {summary && (
        <div className="card mb-5">
          <h3 className="text-lg font-bold text-warm-800 mb-3">📊 Weekly Summary</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">{summary.sessionCount}</div>
              <div className="text-xs text-warm-400">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-secondary-600">{summary.avgScore}%</div>
              <div className="text-xs text-warm-400">Avg Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{summary.streakDays}</div>
              <div className="text-xs text-warm-400">Streak days</div>
            </div>
          </div>
          {summary.summaryLines?.filter(l => !l.includes('⚠️')).map((line, i) => (
            <div key={i} className="alert alert-info text-sm mb-2">{line}</div>
          ))}
        </div>
      )}

      {/* Score chart */}
      {chartData.length > 0 && (
        <div className="card mb-5">
          <h3 className="text-lg font-bold text-warm-800 mb-4">📈 Average Scores by Game</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => `${v}%`} />
              <Bar dataKey="score"    fill="#0d9488" radius={[4, 4, 0, 0]} name="Score" />
              <Bar dataKey="accuracy" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Accuracy" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recommendations */}
      {recommendations?.length > 0 && (
        <div className="card mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-warm-800">🎯 Activity Recommendations</h3>
            <button onClick={handleApply} disabled={applying}
              className="btn-primary btn-sm">
              {applying ? <Spinner size="sm" /> : '⚡ Apply Difficulty'}
            </button>
          </div>
          <p className="text-sm text-warm-500 mb-4">
            Based on performance trends and your caregiver feedback.
          </p>
          <div className="flex flex-col gap-3">
            {recommendations.map((rec, i) => (
              <div key={rec.gameType}
                className={`rounded-2xl p-4 border-2 ${i === 0 ? 'border-primary-300 bg-primary-50' : 'border-warm-200 bg-white'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-3xl shrink-0">{rec.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-warm-900">{rec.label}</span>
                      {i === 0 && <span className="badge badge-amber">⭐ Top Priority</span>}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-warm-500">Current:</span>
                      <DifficultyBadge level={rec.currentDifficulty} />
                      {rec.difficultyChanged && (
                        <>
                          <span className="text-warm-400">→</span>
                          <DifficultyBadge level={rec.suggestedDifficulty} />
                          <span className="text-xs text-primary-600 font-medium">(AI suggests)</span>
                        </>
                      )}
                    </div>
                    <ul className="flex flex-col gap-1">
                      {rec.reasons.map((r, j) => (
                        <li key={j} className="text-sm text-warm-600 flex gap-1">
                          <span className="text-primary-500 shrink-0">•</span>{r}
                        </li>
                      ))}
                    </ul>
                    {rec.metrics?.sessions > 0 && (
                      <div className="flex gap-3 mt-2 text-xs text-warm-400">
                        <span>Sessions: {rec.metrics.sessions}</span>
                        <span>Avg: {rec.metrics.avgScore}%</span>
                        <span className={`font-medium ${
                          rec.metrics.recentTrend === 'improving' ? 'text-green-600' :
                          rec.metrics.recentTrend === 'declining' ? 'text-danger-500' : 'text-warm-500'}`}>
                          {rec.metrics.recentTrend === 'improving' ? '📈 Improving'  :
                           rec.metrics.recentTrend === 'declining' ? '📉 Declining'  : '➡️ Stable'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-game metric cards */}
      <div className="card">
        <h3 className="text-lg font-bold text-warm-800 mb-3">🔍 Detailed Metrics</h3>
        {Object.entries(metrics || {}).map(([key, g]) => (
          <div key={key} className="border-b border-warm-100 last:border-0 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-warm-800">{GAME_LABELS[key]}</span>
              <DifficultyBadge level={gameDifficulty?.[key] || 'easy'} />
            </div>
            {g.sessions === 0 ? (
              <span className="text-sm text-warm-400">Not played yet</span>
            ) : (
              <div className="flex gap-4 text-sm text-warm-500">
                <span>Sessions: <b className="text-warm-700">{g.sessions}</b></span>
                <span>Score: <b className="text-warm-700">{g.avgScore}%</b></span>
                <span>Accuracy: <b className="text-warm-700">{g.avgAccuracy}%</b></span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
