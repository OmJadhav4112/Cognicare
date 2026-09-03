import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import api from '../services/api';

const AuthContext = createContext(null);

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Attach a bearer token to every axios request */
const setApiToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('dc_token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('dc_token');
  }
};

// ─── Provider ───────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user,        setUser]        = useState(null);   // backend User doc
  const [profile,     setProfile]     = useState(null);   // Patient | Caregiver doc
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [useMockAuth, setUseMockAuth] = useState(false);

  // ── Restore persisted JWT on page load (dev/mock mode) ──────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem('dc_token');
    if (savedToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
  }, []);

  // ── Firebase onAuthStateChanged ──────────────────────────────────────────
  useEffect(() => {
    if (useMockAuth) {
      setLoading(false);
      return;
    }

    let unsubscribe;
    try {
      unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        try {
          setFirebaseUser(fbUser);
          if (fbUser) {
            const idToken = await fbUser.getIdToken();
            setApiToken(idToken);
            await fetchMe();
          } else {
            // No Firebase session — check for a persisted JWT (dev mode)
            const savedToken = localStorage.getItem('dc_token');
            if (savedToken) {
              api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
              await fetchMe();
            } else {
              setApiToken(null);
              setUser(null);
              setProfile(null);
            }
          }
        } catch (err) {
          console.error('[Auth] onAuthStateChanged handler error:', err);
          if (err.message?.includes('identitytoolkit') || err.message?.includes('auth/')) {
            console.warn('[Auth] Firebase unavailable, switching to mock auth');
            setUseMockAuth(true);
          }
        } finally {
          setLoading(false);
        }
      });
    } catch (err) {
      console.warn('[Auth] Firebase init failed:', err.message);
      setUseMockAuth(true);
      setLoading(false);
    }

    return () => unsubscribe?.();
  }, [useMockAuth]);

  // ── fetchMe ─────────────────────────────────────────────────────────────
  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setProfile(data.profile);
      setError(null);
      return data;
    } catch (err) {
      console.error('[Auth] fetchMe error:', err);
      // 401 means token is invalid — clear it
      if (err.response?.status === 401) {
        setApiToken(null);
        setUser(null);
        setProfile(null);
      }
      setError(err.response?.data?.message || err.message);
      throw err;
    }
  }, []);

  // ── register ─────────────────────────────────────────────────────────────
  const register = async (name, email, password, role, phone = '', preferredLanguage = 'english', caregiverCode = null) => {
    setError(null);
    try {
      // 1. Try Firebase registration first
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateFirebaseProfile(credential.user, { displayName: name });
        const idToken = await credential.user.getIdToken();
        setApiToken(idToken);

        // Register user record in backend
        await api.post('/auth/register', { name, email, role, phone, preferredLanguage, caregiverCode });
        const data = await fetchMe();
        return data?.user;
      } catch (fbErr) {
        console.warn('[Auth] Firebase register failed, trying dev endpoint:', fbErr.message);
      }

      // 2. Dev fallback — backend register-dev
      const { data } = await api.post('/auth/register-dev', {
        name, email, password, role, phone, preferredLanguage, caregiverCode,
      });
      if (data.token) {
        setApiToken(data.token);
      }
      setUseMockAuth(true);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // ── login ────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setError(null);
    try {
      // 1. Try Firebase login
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await credential.user.getIdToken();
        setApiToken(idToken);
        const data = await fetchMe();
        return data?.user;
      } catch (fbErr) {
        console.warn('[Auth] Firebase login failed, trying dev endpoint:', fbErr.message);
      }

      // 2. Dev fallback — backend login-dev
      const { data } = await api.post('/auth/login-dev', { email, password });
      if (data.token) {
        setApiToken(data.token);
      }
      setUseMockAuth(true);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // ── logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      if (!useMockAuth) {
        await signOut(auth);
      }
    } catch (err) {
      console.warn('[Auth] signOut error:', err);
    } finally {
      setApiToken(null);
      setUser(null);
      setProfile(null);
      setFirebaseUser(null);
      setUseMockAuth(false);
      setError(null);
    }
  }, [useMockAuth]);

  // ── updateLanguage ───────────────────────────────────────────────────────
  const updateLanguage = async (language) => {
    try {
      setError(null);
      await api.patch('/auth/language', { preferredLanguage: language });
      if (user) setUser({ ...user, preferredLanguage: language });
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setError(msg);
      throw new Error(msg);
    }
  };

  // ── updateEmail ──────────────────────────────────────────────────────────
  const updateEmail = async (newEmail) => {
    try {
      setError(null);
      const { data } = await api.patch('/auth/email', { newEmail });
      await fetchMe();
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setError(msg);
      throw new Error(msg);
    }
  };

  // ── deleteAccount ────────────────────────────────────────────────────────
  const deleteAccount = async () => {
    try {
      setError(null);
      await api.delete('/auth/account').catch(() => {});
      if (firebaseUser && !useMockAuth) {
        await firebaseUser.delete().catch(() => {});
      }
      setApiToken(null);
      setUser(null);
      setProfile(null);
      setFirebaseUser(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setError(msg);
      throw new Error(msg);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      error,
      firebaseUser,
      useMockAuth,
      login,
      register,
      logout,
      refreshProfile: fetchMe,
      updateEmail,
      updateLanguage,
      deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
