import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, LanguageSelector, LANGUAGES } from '../../context/LanguageContext';
import { useToast } from '../../components/common/Toast';
import { updateProfile } from '../../services/patientService';
import { updateLanguage, updatePassword } from '../../services/authService';
import PageHeader from '../../components/common/PageHeader';
import Spinner from '../../components/common/Spinner';

export default function ProfilePage() {
  const { user, profile, logout, refreshProfile } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const toast    = useToast();
  const navigate = useNavigate();

  const [saving,    setSaving]    = useState(false);
  const [pwForm,    setPwForm]    = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  // Language save — syncs both LanguageContext (UI) and backend preference
  const handleLangSave = async (val) => {
    setSaving(true);
    try {
      setLanguage(val);                   // update UI immediately
      await updateLanguage(val);          // persist to backend
      await refreshProfile();
      toast(t('lang_updated'), 'success');
    } catch {
      toast('Could not update language.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { toast('Passwords do not match.', 'error'); return; }
    if (pwForm.next.length < 6) { toast('Password must be at least 6 characters.', 'error'); return; }
    setPwLoading(true);
    try {
      await updatePassword(pwForm.current, pwForm.next);
      toast('Password changed successfully!', 'success');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to change password.', 'error');
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="page-wrapper animate-fade-in">
      <PageHeader title={t('my_profile')} emoji="👤" backTo="/patient" />

      {/* Avatar + name */}
      <div className="card flex flex-col items-center gap-3 mb-5 text-center">
        <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center text-5xl font-bold text-primary-700">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-warm-900">{user?.name}</h2>
          <p className="text-base text-warm-500">{user?.email}</p>
          {user?.phone && <p className="text-sm text-warm-400 mt-1">📞 {user.phone}</p>}
        </div>
        {profile?.cognitiveProfile && (
          <div className="badge badge-green mt-1">
            {t('level')}: {profile.cognitiveProfile.overallLevel}
          </div>
        )}
      </div>

      {/* Caregiver info */}
      {profile?.caregiver && (
        <div className="card mb-5">
          <h3 className="text-lg font-bold text-warm-800 mb-3">{t('your_caregiver')}</h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-secondary-100 flex items-center justify-center text-2xl font-bold text-secondary-700">
              {profile.caregiver.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-warm-800">{profile.caregiver.name}</div>
              <div className="text-sm text-warm-500">{profile.caregiver.email}</div>
            </div>
          </div>
        </div>
      )}

      {/* Language — inline selector that also updates UI */}
      <div className="card mb-5">
        <h3 className="text-lg font-bold text-warm-800 mb-3">{t('pref_language')}</h3>
        <select
          value={language}
          onChange={e => handleLangSave(e.target.value)}
          className="field-input mb-3"
          disabled={saving}
        >
          {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        {saving && (
          <div className="flex items-center gap-2 text-warm-500 text-sm">
            <Spinner size="sm" /> {t('saving')}
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="card mb-5">
        <h3 className="text-lg font-bold text-warm-800 mb-3">{t('change_password')}</h3>
        <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
          <input type="password" placeholder={t('current_password')} value={pwForm.current}
            onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
            className="field-input" required />
          <input type="password" placeholder={t('new_password')} value={pwForm.next}
            onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
            className="field-input" required />
          <input type="password" placeholder={t('confirm_new_pw')} value={pwForm.confirm}
            onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
            className="field-input" required />
          <button type="submit" disabled={pwLoading} className="btn-outline w-full">
            {pwLoading ? <Spinner size="sm" /> : t('update_password')}
          </button>
        </form>
      </div>

      <button onClick={handleLogout} className="btn-danger w-full">
        {t('log_out')}
      </button>

      <p className="text-xs text-warm-400 text-center mt-4">
        ⚠️ {t('disclaimer')}
      </p>
    </div>
  );
}
