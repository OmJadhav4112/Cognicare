import api from './api';

// These functions are now primarily handled through AuthContext
// But kept here for backward compatibility or direct API calls if needed

export const loginUser = (idToken) => api.post('/auth/login', { idToken });
export const registerUser = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const updateLanguage = (lang) => api.patch('/auth/language', { preferredLanguage: lang });
export const updateEmail = (newEmail) => api.patch('/auth/email', { newEmail });
export const updatePassword = (newPassword) => api.patch('/auth/password', { newPassword });
export const deleteAccount = () => api.delete('/auth/account');

