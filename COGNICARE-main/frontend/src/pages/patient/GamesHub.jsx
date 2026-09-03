import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDifficulty } from '../../services/gamesService';
import { useLanguage } from '../../context/LanguageContext';
import PageHeader from '../../components/common/PageHeader';
import DifficultyBadge from '../../components/common/DifficultyBadge';
import Spinner from '../../components/common/Spinner';

export default function GamesHub() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [difficulty, setDifficulty] = useState({});
  const [loading,    setLoading]    = useState(true);

  const GAMES = [
    {
      key: 'memoryMatching',
      route: '/patient/games/memory',
      icon: '🃏',
      title: t('memory_matching'),
      desc: t('match_instruction'),
      cognitiveArea: 'Short-term memory & visual recognition',
    },
    {
      key: 'pictureRecall',
      route: '/patient/games/recall',
      icon: '🖼️',
      title: t('picture_recall'),
      desc: 'Study pictures, then remember what you saw.',
      cognitiveArea: 'Visual memory & recall',
    },
    {
      key: 'sequenceMemory',
      route: '/patient/games/sequence',
      icon: '🔢',
      title: t('sequence_memory'),
      desc: 'Remember and repeat sequences.',
      cognitiveArea: 'Working memory & attention',
    },
    {
      key: 'patternAttention',
      route: '/patient/games/pattern',
      icon: '🔷',
      title: t('pattern_attention'),
      desc: 'Find the odd one out in a group.',
      cognitiveArea: 'Visual attention & pattern recognition',
    },
  ];

  useEffect(() => {
    getDifficulty()
      .then(res => setDifficulty(res.data?.data?.gameDifficulty || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>
  );

  return (
    <div className="page-wrapper animate-fade-in">
      <PageHeader
        title={t('cognitive_games')}
        emoji="🧩"
        backTo="/patient"
        subtitle={t('games_subtitle')}
      />

      <div className="alert alert-info mb-6 text-sm">
        {t('games_cultural_note')}
      </div>

      <div className="flex flex-col gap-4">
        {GAMES.map(game => (
          <button
            key={game.key}
            onClick={() => navigate(game.route)}
            className="card flex items-start gap-4 text-left hover:shadow-glow hover:-translate-y-1 transition-all w-full"
          >
            <span className="text-5xl shrink-0" aria-hidden="true">{game.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-xl font-bold text-warm-900 block">{game.title}</span>
              <p className="text-base text-warm-600 mt-1">{game.desc}</p>
              <p className="text-sm text-warm-400 mt-1">🧠 {game.cognitiveArea}</p>
              <div className="mt-2">
                <DifficultyBadge level={difficulty[game.key] || 'easy'} />
              </div>
            </div>
            <span className="text-2xl text-primary-400 shrink-0 mt-2">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

