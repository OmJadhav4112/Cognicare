import api from './api';

// ── Game results ───────────────────────────────
export const submitGameResult = (data)              => api.post('/games/submit', data);
export const getGameHistory   = (params = {})       => api.get('/games/history', { params });
export const getGameStats     = (days = 30)         => api.get('/games/stats', { params: { days } });
export const getDifficulty    = ()                  => api.get('/games/difficulty');

// ── NER Content ────────────────────────────────
export const getGameContent = (gameType, difficulty) =>
  api.get(`/content/game/${gameType}`, { params: { difficulty } });
