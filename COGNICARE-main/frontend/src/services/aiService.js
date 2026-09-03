import api from './api';

// ── Patient ───────────────────────────────────
export const getRecommendations  = ()           => api.get('/ai/recommendations');
export const getPerformanceSummary = ()         => api.get('/ai/summary');
export const getMetrics          = (sessions)   => api.get('/ai/metrics', { params: { sessions } });
export const applyDifficulty     = (patientId)  =>
  api.post('/ai/apply-difficulty', patientId ? { patientId } : {});

// ── Caregiver ─────────────────────────────────
export const getPatientInsights  = (patientId)  => api.get(`/ai/recommendations/${patientId}`);
