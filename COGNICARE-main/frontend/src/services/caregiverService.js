import api from './api';

// ── Caregiver profile ──────────────────────────
export const getCaregiverProfile = ()                     => api.get('/caregiver/profile');
export const linkPatient         = (patientUserId)        => api.post('/caregiver/link-patient', { patientUserId });
export const linkPatientByEmail  = (patientEmail)         => api.post('/caregiver/link-patient', { patientEmail });

// ── Patient monitoring ─────────────────────────
export const getPatientOverview  = (pid)           => api.get(`/caregiver/patients/${pid}/overview`);
export const getPatientHistory   = (pid, params)   => api.get(`/caregiver/patients/${pid}/history`, { params });

// ── SOS ────────────────────────────────────────
export const getSOSAlerts        = ()              => api.get('/caregiver/sos');
export const acknowledgeAlert    = (id, note)      => api.patch(`/caregiver/sos/${id}/acknowledge`, { caregiverNote: note });
export const resolveAlert        = (id, note)      => api.patch(`/caregiver/sos/${id}/resolve`, { caregiverNote: note });

// ── Reminders ──────────────────────────────────
export const getReminders        = (pid)           => api.get(`/caregiver/patients/${pid}/reminders`);
export const createReminder      = (pid, data)     => api.post(`/caregiver/patients/${pid}/reminders`, data);
export const updateReminder      = (pid, rid, data)=> api.put(`/caregiver/patients/${pid}/reminders/${rid}`, data);
export const deleteReminder      = (pid, rid)      => api.delete(`/caregiver/patients/${pid}/reminders/${rid}`);

// ── Family Memory Vault ────────────────────────
export const getMemories         = (pid, type)     => api.get(`/caregiver/patients/${pid}/memories`, { params: type ? { type } : {} });
export const addMemory           = (pid, data)     => api.post(`/caregiver/patients/${pid}/memories`, data);
export const updateMemory        = (pid, mid, data)=> api.put(`/caregiver/patients/${pid}/memories/${mid}`, data);
export const deleteMemory        = (pid, mid)      => api.delete(`/caregiver/patients/${pid}/memories/${mid}`);

// ── Feedback ───────────────────────────────────
export const submitFeedback      = (pid, data)     => api.post(`/caregiver/patients/${pid}/feedback`, data);
export const getFeedbackHistory  = (pid)           => api.get(`/caregiver/patients/${pid}/feedback`);
