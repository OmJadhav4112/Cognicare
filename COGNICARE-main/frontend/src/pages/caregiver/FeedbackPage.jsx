import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { submitFeedback, getFeedbackHistory } from '../../services/caregiverService';
import { useLanguage } from '../../context/LanguageContext';
import PageHeader from '../../components/common/PageHeader';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';

const MOODS = [
  { value: 'very_good', emoji: '😄', label: 'Very Good' },
  { value: 'good',      emoji: '🙂', label: 'Good'      },
  { value: 'neutral',   emoji: '😐', label: 'Neutral'   },
  { value: 'poor',      emoji: '😕', label: 'Poor'      },
  { value: 'very_poor', emoji: '😢', label: 'Very Poor' },
];

const GAMES = [
  { key: 'memoryMatching',   label: '🃏 Memory Matching'   },
  { key: 'pictureRecall',    label: '🖼️ Picture Recall'    },
  { key: 'sequenceMemory',   label: '🔢 Sequence Memory'   },
  { key: 'patternAttention', label: '🔷 Pattern Attention' },
];

const DIFF_OPTIONS = [
  { value: '',          label: 'No feedback' },
  { value: 'too_easy',  label: '😴 Too easy' },
  { value: 'just_right',label: '✅ Just right' },
  { value: 'too_hard',  label: '😰 Too hard'  },
];

const EMPTY_FORM = {
  patientMood: 'neutral',
  observationText: '',
  gamePreferences: [],
  difficultyFeedback: '',
  influencesAI: true
};

export default function FeedbackPage() {
  const { patientId } = useParams();
  const toast = useToast();
  const { t } = useLanguage();

  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [history, setHistory] = useState([]);
  const [loadH,   setLoadH]   = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const loadHistory = async () => {
    try {
      const res = await getFeedbackHistory(patientId);
      setHistory(res.data?.data || []);
    } finally { setLoadH(false); }
  };

  useEffect(() => { loadHistory(); }, [patientId]);

  const toggleGamePref = (key, liked) => {
    setForm(f => {
      const prefs = f.gamePreferences.filter(g => g.gameType !== key);
      const existing = f.gamePreferences.find(g => g.gameType === key);
      if (existing?.liked === liked) return { ...f, gamePreferences: prefs };
      return { ...f, gamePreferences: [...prefs, { gameType: key, liked }] };
    });
  };

  const getGamePref = (key) => form.gamePreferences.find(g => g.gameType === key);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await submitFeedback(patientId, form);
      toast(t('feedback_saved'), 'success');
      setSubmitted(true);
      setForm(EMPTY_FORM);
      loadHistory();
    } catch { toast('Could not submit feedback.', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pb-28 pt-6 animate-fade-in">
      <PageHeader title={t('feedback_page')} emoji="💬" backTo={`/caregiver/patient/${patientId}`}
        subtitle="Your observations help personalise activities" />

      {submitted && (
        <div className="alert alert-success mb-5 text-lg font-semibold">
          ✅ Feedback submitted! AI recommendations will update shortly.
        </div>
      )}

      {/* Feedback form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Mood */}
        <div className="card">
          <h3 className="text-lg font-bold text-warm-800 mb-3">How is your patient feeling today?</h3>
          <div className="grid grid-cols-5 gap-2">
            {MOODS.map(m => (
              <button key={m.value} type="button"
                onClick={() => setForm(f => ({ ...f, patientMood: m.value }))}
                className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all
                  ${form.patientMood === m.value ? 'border-primary-500 bg-primary-50' : 'border-warm-200 hover:border-primary-300'}`}>
                <span className="text-3xl">{m.emoji}</span>
                <span className="text-xs font-medium text-warm-600 mt-1 leading-tight text-center">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Observation text */}
        <div className="card">
          <h3 className="text-lg font-bold text-warm-800 mb-3">Your observations</h3>
          <textarea value={form.observationText}
            onChange={e => setForm(f => ({ ...f, observationText: e.target.value }))}
            className="field-input resize-none" rows={4}
            placeholder="Describe anything notable — behaviour, mood, confusion, improvements, engagement…" />
        </div>

        {/* Game preferences */}
        <div className="card">
          <h3 className="text-lg font-bold text-warm-800 mb-1">Game preferences</h3>
          <p className="text-sm text-warm-500 mb-3">Which activities does your patient enjoy or struggle with?</p>
          <div className="flex flex-col gap-3">
            {GAMES.map(g => {
              const pref = getGamePref(g.key);
              return (
                <div key={g.key} className="flex items-center justify-between">
                  <span className="text-base font-medium text-warm-700">{g.label}</span>
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => toggleGamePref(g.key, true)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all
                        ${pref?.liked === true ? 'border-green-500 bg-green-50 text-green-700' : 'border-warm-200 text-warm-500 hover:border-green-300'}`}>
                      👍 Likes
                    </button>
                    <button type="button"
                      onClick={() => toggleGamePref(g.key, false)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all
                        ${pref?.liked === false ? 'border-danger-500 bg-danger-50 text-danger-700' : 'border-warm-200 text-warm-500 hover:border-danger-300'}`}>
                      👎 Dislikes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Difficulty */}
        <div className="card">
          <h3 className="text-lg font-bold text-warm-800 mb-3">Difficulty level feedback</h3>
          <div className="grid grid-cols-2 gap-2">
            {DIFF_OPTIONS.map(d => (
              <button key={d.value} type="button"
                onClick={() => setForm(f => ({ ...f, difficultyFeedback: d.value }))}
                className={`p-3 rounded-2xl border-2 text-base font-medium transition-all
                  ${form.difficultyFeedback === d.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-warm-200 text-warm-600 hover:border-primary-300'}`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI influence toggle */}
        <div className="card flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-warm-800">Use for AI recommendations</div>
            <div className="text-sm text-warm-500">Allow this feedback to influence activity personalisation</div>
          </div>
          <div onClick={() => setForm(f => ({ ...f, influencesAI: !f.influencesAI }))}
            className={`w-14 h-7 rounded-full transition-colors relative cursor-pointer shrink-0
              ${form.influencesAI ? 'bg-primary-500' : 'bg-warm-300'}`}>
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform
              ${form.influencesAI ? 'left-8' : 'left-1'}`} />
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary btn-lg w-full">
          {saving ? <Spinner size="sm" /> : t('submit_feedback')}
        </button>
      </form>

      {/* History */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-warm-800 mb-3">📋 Previous Feedback</h2>
        {loadH ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : history.length === 0 ? (
          <EmptyState emoji="💬" title={t('no_feedback')} />
        ) : (
          <div className="flex flex-col gap-3">
            {history.map(fb => {
              const mood = MOODS.find(m => m.value === fb.patientMood);
              return (
                <div key={fb._id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{mood?.emoji}</span>
                      <span className="font-semibold text-warm-800">{mood?.label}</span>
                    </div>
                    <span className="text-xs text-warm-400">
                      {new Date(fb.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {fb.observationText && (
                    <p className="text-sm text-warm-600 line-clamp-3">{fb.observationText}</p>
                  )}
                  {fb.difficultyFeedback && (
                    <span className="badge badge-grey mt-2 capitalize">{fb.difficultyFeedback.replace('_', ' ')}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
