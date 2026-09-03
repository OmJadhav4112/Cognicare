import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { ThemeToggle } from '../../context/ThemeContext';
import Spinner from '../../components/common/Spinner';

const LANGUAGES = [
  { value: 'english',   label: 'English' },
  { value: 'assamese',  label: 'অসমীয়া (Assamese)' },
  { value: 'bengali',   label: 'বাংলা (Bengali)' },
  { value: 'bodo',      label: 'बड़ो (Bodo)' },
  { value: 'manipuri',  label: 'মৈতৈলোন্ (Manipuri)' },
  { value: 'nagamese',  label: 'Nagamese' },
  { value: 'mizo',      label: 'Mizo ṭawng' },
  { value: 'khasi',     label: 'Khasi' },
];

const STEPS = ['Role', 'Account', 'Preferences'];

/* ── Step sub-components ── defined outside parent so React never remounts ── */

function RoleStep({ role, onSelect }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-center mb-1" style={{ color: 'var(--text-secondary)' }}>
        Who will be using this account?
      </p>
      {[
        { role: 'patient',   icon: '👴', label: 'Patient',   desc: 'I have memory or cognitive difficulties' },
        { role: 'caregiver', icon: '👩‍⚕️', label: 'Caregiver', desc: 'I support someone with memory difficulties' },
      ].map(({ role: r, icon, label, desc }) => (
        <button
          key={r}
          type="button"
          onClick={() => onSelect(r)}
          className="flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all"
          style={{
            borderColor: role === r ? 'var(--c-primary-500)' : 'var(--surface-border)',
            backgroundColor: role === r ? 'var(--c-primary-100)' : 'var(--surface-raised)',
          }}
        >
          <span className="text-3xl shrink-0" aria-hidden="true">{icon}</span>
          <div>
            <div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{label}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function AccountStep({ form, onChange }) {
  const pw = form.password;
  const checks = [
    { ok: pw.length >= 8,                             label: '8+ characters' },
    { ok: /[A-Z]/.test(pw),                           label: 'Uppercase letter' },
    { ok: /[0-9]/.test(pw),                           label: 'Number' },
    { ok: /[!@#$%^&*(),.?":{}|<>]/.test(pw),         label: 'Special character (!@#$…)' },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="name" className="field-label">Full Name</label>
        <input id="name" name="name" type="text" autoComplete="name"
          value={form.name} onChange={onChange}
          className="field-input" placeholder="Your full name" required />
      </div>
      <div>
        <label htmlFor="reg-email" className="field-label">Email address</label>
        <input id="reg-email" name="email" type="email" autoComplete="email"
          value={form.email} onChange={onChange}
          className="field-input" placeholder="you@example.com" required />
      </div>
      <div>
        <label htmlFor="phone" className="field-label">
          Phone <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
        </label>
        <input id="phone" name="phone" type="tel" autoComplete="tel"
          value={form.phone} onChange={onChange}
          className="field-input" placeholder="+91 XXXXX XXXXX" />
      </div>
      <div>
        <label htmlFor="reg-password" className="field-label">Password</label>
        <input id="reg-password" name="password" type="password" autoComplete="new-password"
          value={form.password} onChange={onChange}
          className="field-input" placeholder="e.g. Hello@123" required />
        {pw.length > 0 && (
          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
            {checks.map(c => (
              <span
                key={c.label}
                className="text-xs flex items-center gap-1"
                style={{ color: c.ok ? 'var(--c-primary-600)' : 'var(--text-muted)' }}
              >
                {c.ok ? '✅' : '○'} {c.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div>
        <label htmlFor="confirmPassword" className="field-label">Confirm Password</label>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password"
          value={form.confirmPassword} onChange={onChange}
          className="field-input" placeholder="Repeat your password" required />
        {form.confirmPassword.length > 0 && form.password !== form.confirmPassword && (
          <p className="text-xs mt-1" style={{ color: 'var(--c-danger-500)' }}>
            Passwords do not match
          </p>
        )}
      </div>
    </div>
  );
}

function PreferencesStep({ form, onChange }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="lang" className="field-label">Preferred Language</label>
        <select id="lang" name="preferredLanguage"
          value={form.preferredLanguage} onChange={onChange} className="field-input">
          {LANGUAGES.map(l => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Activities will use culturally familiar NER content.
        </p>
      </div>
      {form.role === 'patient' && (
        <div>
          <label htmlFor="caregiverCode" className="field-label">
            Caregiver ID{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
          </label>
          <input id="caregiverCode" name="caregiverCode" type="text"
            value={form.caregiverCode} onChange={onChange}
            className="field-input" placeholder="Paste your caregiver's User ID" />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Ask your caregiver to share their User ID to link accounts.
          </p>
        </div>
      )}
      <div className="alert alert-info text-sm">
        🌿 DementiaCare+ is a supportive activity platform. It is not a medical diagnosis tool.
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────────── */

export default function RegisterPage() {
  const { register } = useAuth();
  const toast        = useToast();
  const navigate     = useNavigate();

  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const [form, setForm] = useState({
    role: '', name: '', email: '', password: '', confirmPassword: '',
    phone: '', preferredLanguage: 'english', caregiverCode: '',
  });

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const validateStep = () => {
    if (step === 0 && !form.role) { setError('Please select a role.'); return false; }
    if (step === 1) {
      if (!form.name.trim())  { setError('Name is required.');  return false; }
      if (!form.email.trim()) { setError('Email is required.'); return false; }
      if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return false; }
      if (!/[A-Z]/.test(form.password)) { setError('Password must contain an uppercase letter.'); return false; }
      if (!/[0-9]/.test(form.password)) { setError('Password must contain a number.'); return false; }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) { setError('Password must contain a special character.'); return false; }
      if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return false; }
    }
    return true;
  };

  const handleNext = () => { setError(''); if (!validateStep()) return; setStep(s => s + 1); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateStep()) return;
    setLoading(true);
    try {
      const user = await register(
        form.name.trim(), form.email.trim(), form.password, form.role,
        form.phone.trim() || '', form.preferredLanguage,
        form.caregiverCode.trim() || null,
      );
      toast('Account created! Welcome to DementiaCare+ 🎉', 'success');
      navigate(user.role === 'patient' ? '/patient' : '/caregiver', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-3 py-8 sm:py-12"
      style={{ backgroundColor: 'var(--surface-base)' }}
    >
      {/* Theme toggle */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Logo */}
      <div className="text-center mb-4 animate-fade-in">
        <div className="text-5xl mb-1" aria-hidden="true">🧠</div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--c-primary-600)' }}>
          DementiaCare+
        </h1>
      </div>

      {/* Card */}
      <div className="card w-full max-w-sm px-5 py-5 animate-fade-in">

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-0.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{
                    backgroundColor:
                      i < step  ? 'var(--c-primary-600)' :
                      i === step ? 'var(--c-primary-100)' :
                                   'var(--c-warm-200)',
                    color:
                      i < step  ? '#ffffff' :
                      i === step ? 'var(--c-primary-700)' :
                                   'var(--text-muted)',
                    border: i === step ? '2px solid var(--c-primary-500)' : 'none',
                  }}
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: i === step ? 'var(--c-primary-700)' : 'var(--text-muted)' }}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-1.5 mb-4"
                  style={{ backgroundColor: i < step ? 'var(--c-primary-500)' : 'var(--surface-border)' }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          {step === 0 ? 'Choose your role' : step === 1 ? 'Create your account' : 'Set your preferences'}
        </h2>

        {error && (
          <div className="alert alert-danger mb-3 text-sm" role="alert">{error}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {step === 0 && (
            <RoleStep
              role={form.role}
              onSelect={(r) => { setForm(prev => ({ ...prev, role: r })); setStep(1); }}
            />
          )}
          {step === 1 && <AccountStep form={form} onChange={handleChange} />}
          {step === 2 && <PreferencesStep form={form} onChange={handleChange} />}

          <div className="flex gap-3 mt-5">
            {step > 0 && (
              <button type="button" onClick={() => setStep(s => s - 1)} className="btn-outline flex-1">
                ← Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={handleNext} className="btn-primary flex-1">Next →</button>
            ) : (
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? <><Spinner size="sm" /> Creating…</> : '✅ Create Account'}
              </button>
            )}
          </div>
        </form>

        <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold hover:underline"
            style={{ color: 'var(--c-primary-600)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
