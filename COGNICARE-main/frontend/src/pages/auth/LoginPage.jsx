import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { ThemeToggle } from '../../context/ThemeContext';
import Spinner from '../../components/common/Spinner';

export default function LoginPage() {
  const { login }  = useAuth();
  const toast      = useToast();
  const navigate   = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleEmail    = useCallback((e) => setEmail(e.target.value),    []);
  const handlePassword = useCallback((e) => setPassword(e.target.value), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      toast('Welcome back! 👋', 'success');
      navigate(user?.role === 'patient' ? '/patient' : '/caregiver', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--surface-base)' }}
    >
      {/* Theme toggle — top right corner */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Logo */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="text-7xl mb-3" aria-hidden="true">🧠</div>
        <h1
          className="text-4xl font-bold"
          style={{ color: 'var(--c-primary-600)' }}
        >
          DementiaCare+
        </h1>
        <p className="text-lg mt-2" style={{ color: 'var(--text-muted)' }}>
          Your cognitive companion
        </p>
      </div>

      {/* Card */}
      <div className="card w-full max-w-md animate-fade-in">
        <h2
          className="text-2xl font-bold mb-6 text-center"
          style={{ color: 'var(--text-primary)' }}
        >
          Sign In
        </h2>

        {error && (
          <div className="alert alert-danger mb-5" role="alert">{error}</div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div>
            <label htmlFor="email" className="field-label">Email address</label>
            <input
              id="email" type="email" autoComplete="email"
              value={email} onChange={handleEmail}
              className="field-input" placeholder="you@example.com"
              required aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="password" className="field-label">Password</label>
            <input
              id="password" type="password" autoComplete="current-password"
              value={password} onChange={handlePassword}
              className="field-input" placeholder="Your password"
              required aria-required="true"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary btn-lg w-full mt-2">
            {loading ? <><Spinner size="sm" /> Signing in…</> : '🔐 Sign In'}
          </button>
        </form>

        <p className="text-center text-base mt-6" style={{ color: 'var(--text-muted)' }}>
          New to DementiaCare+?{' '}
          <Link
            to="/register"
            className="font-semibold hover:underline"
            style={{ color: 'var(--c-primary-600)' }}
          >
            Create an account
          </Link>
        </p>
      </div>

      <p className="text-sm text-center mt-8 max-w-xs" style={{ color: 'var(--text-muted)' }}>
        Supporting memory and cognitive wellness for elderly people in North East India 🌿
      </p>
    </div>
  );
}
