import api from './api';

// ── Profile ────────────────────────────────────────────────────
export const getProfile         = ()         => api.get('/patient/profile');
export const updateProfile      = (data)     => api.put('/patient/profile', data);
export const getProgressSummary = ()         => api.get('/patient/progress');

// ── Reminders ──────────────────────────────────────────────────
export const getReminders        = ()         => api.get('/patient/reminders');
export const createReminder      = (data)     => api.post('/patient/reminders', data);
export const updateReminder      = (id, data) => api.put(`/patient/reminders/${id}`, data);
export const deleteReminder      = (id)       => api.delete(`/patient/reminders/${id}`);
export const acknowledgeReminder = (id)       => api.patch(`/patient/reminders/${id}/acknowledge`);

// ── Family Vault ────────────────────────────────────────────────
export const getVault     = ()         => api.get('/patient/vault');
export const createMemory = (data)     => api.post('/patient/vault', data);
export const updateMemory = (id, data) => api.put(`/patient/vault/${id}`, data);
export const deleteMemory = (id)       => api.delete(`/patient/vault/${id}`);

// ── Notes ───────────────────────────────────────────────────────
export const getNotes   = ()         => api.get('/patient/notes');
export const createNote = (data)     => api.post('/patient/notes', data);
export const updateNote = (id, data) => api.put(`/patient/notes/${id}`, data);
export const deleteNote = (id)       => api.delete(`/patient/notes/${id}`);

// ── SOS ─────────────────────────────────────────────────────────
export const triggerSOS    = (msg) => api.post('/patient/sos', { message: msg });
export const getSOSHistory = ()    => api.get('/patient/sos');
