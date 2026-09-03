import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, LanguageSelector } from '../../context/LanguageContext';
import { getCaregiverProfile, getSOSAlerts, linkPatientByEmail } from '../../services/caregiverService';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';

export default function CaregiverDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const toast     = useToast();
  const { t }     = useLanguage();

  const [profile,   setProfile]   = useState(null);
  const [alerts,    setAlerts]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [linkModal, setLinkModal] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [linking,   setLinking]   = useState(false);
  const [linkError, setLinkError] = useState('');

  const load = () =>
    Promise.allSettled([getCaregiverProfile(), getSOSAlerts()]).then(([pRes, aRes]) => {
      if (pRes.status === 'fulfilled') setProfile(pRes.value.data?.data);
      if (aRes.status === 'fulfilled') setAlerts(aRes.value.data?.data || []);
      setLoading(false);
    });

  useEffect(() => { load(); }, []);

  const handleLinkPatient = async () => {
    setLinkError('');
    if (!linkEmail.trim()) { setLinkError(`${t('patient_email')} is required.`); return; }
    setLinking(true);
    try {
      const res = await linkPatientByEmail(linkEmail.trim());
      toast(res.data?.message || 'Patient linked!', 'success');
      setLinkModal(false);
      setLinkEmail('');
      setLoading(true);
      load();
    } catch (err) {
      setLinkError(err.response?.data?.message || 'Could not link patient. Check the email and try again.');
    } finally {
      setLinking(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>
  );

  const patients   = profile?.patients || [];
  const pendingSOS = alerts.filter(a => a.status === 'sent');

  return (
    <div className="max-w-3xl mx-auto px-4 pb-28 pt-6 animate-fade-in">

      {/* Greeting */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t(new Date().getHours() < 12 ? 'greeting_morning'
               : new Date().getHours() < 17 ? 'greeting_afternoon'
               : 'greeting_evening')}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-base mt-1" style={{ color: 'var(--text-muted)' }}>{t('caregiver_dashboard')}</p>
        </div>
        <div className="shrink-0 mt-1">
          <LanguageSelector className="text-sm" />
        </div>
      </div>

      {/* Pending SOS banner */}
      {pendingSOS.length > 0 && (
        <button onClick={() => navigate('/caregiver/sos')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-danger-50 border-2 border-danger-400
            text-danger-700 font-bold text-lg mb-5 hover:bg-danger-100 transition-colors animate-sos-ring">
          <span className="text-3xl">🆘</span>
          <div className="text-left">
            <div>{pendingSOS.length} {pendingSOS.length > 1 ? t('unack_sos_plural') : t('unack_sos')}!</div>
            <div className="text-sm font-normal">{t('tap_to_view')}</div>
          </div>
          <span className="ml-auto text-2xl">→</span>
        </button>
      )}

      {/* Caregiver ID */}
      <div className="card mb-5">
        <h2 className="text-base font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('caregiver_id_card')}</h2>
        <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>{t('caregiver_id_share')}</p>
        <div className="rounded-xl px-4 py-3 font-mono text-sm break-all select-all"
          style={{ backgroundColor: 'var(--surface-input)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)' }}>
          {profile?.user?._id || user?.id || user?._id || '—'}
        </div>
      </div>

      {/* Patients list */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>👴 {t('my_patients')} ({patients.length})</h2>
          <button onClick={() => { setLinkError(''); setLinkEmail(''); setLinkModal(true); }}
            className="btn-primary btn-sm">
            + {t('add_patient')}
          </button>
        </div>

        {patients.length === 0 ? (
          <EmptyState emoji="👴" title={t('no_patients')} message={t('no_patients_msg')}
            action={
              <button onClick={() => { setLinkError(''); setLinkEmail(''); setLinkModal(true); }}
                className="btn-primary">
                + {t('add_patient')}
              </button>
            } />
        ) : (
          <div className="flex flex-col gap-3">
            {patients.map(p => (
              <button key={p._id} onClick={() => navigate(`/caregiver/patient/${p._id}`)}
                className="card flex items-center gap-4 text-left hover:shadow-glow hover:-translate-y-0.5 transition-all w-full">
                <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700 shrink-0">
                  {p.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{p.name}</div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{p.email}</div>
                  {p.lastLogin && (
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {t('last_active')}: {new Date(p.lastLogin).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {pendingSOS.some(a => a.patient?._id === p._id || a.patient === p._id) && (
                    <span className="badge badge-red">🆘 {t('sos')}</span>
                  )}
                  <span className="text-2xl text-primary-400">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{t('quick_actions')}</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/caregiver/sos')}
            className="card flex flex-col items-center gap-2 text-center bg-danger-50 border-2 border-danger-200 text-danger-700 hover:shadow-card transition-all">
            <span className="text-4xl">🆘</span>
            <span className="font-semibold text-base">{t('sos_alerts')}</span>
            {pendingSOS.length > 0 && <span className="badge badge-red">{pendingSOS.length} pending</span>}
          </button>

          {patients[0] ? (
            <>
              <button onClick={() => navigate(`/caregiver/patient/${patients[0]._id}/memories`)}
                className="card flex flex-col items-center gap-2 text-center hover:shadow-card transition-all">
                <span className="text-4xl">📸</span>
                <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{t('manage_memories')}</span>
              </button>
              <button onClick={() => navigate(`/caregiver/patient/${patients[0]._id}/reminders`)}
                className="card flex flex-col items-center gap-2 text-center hover:shadow-card transition-all">
                <span className="text-4xl">🔔</span>
                <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{t('reminders')}</span>
              </button>
              <button onClick={() => navigate(`/caregiver/patient/${patients[0]._id}/insights`)}
                className="card flex flex-col items-center gap-2 text-center hover:shadow-card transition-all">
                <span className="text-4xl">🤖</span>
                <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{t('ai_insights')}</span>
              </button>
            </>
          ) : (
            <button onClick={() => { setLinkError(''); setLinkEmail(''); setLinkModal(true); }}
              className="card flex flex-col items-center gap-2 text-center hover:shadow-card transition-all">
              <span className="text-4xl">➕</span>
              <span className="font-semibold text-base">{t('add_patient')}</span>
            </button>
          )}
        </div>
      </section>

      {/* Link Patient Modal */}
      <Modal open={linkModal} onClose={() => setLinkModal(false)} title={t('add_patient')}
        footer={
          <>
            <button onClick={() => setLinkModal(false)} className="btn-ghost">{t('cancel')}</button>
            <button onClick={handleLinkPatient} disabled={linking} className="btn-primary">
              {linking ? <Spinner size="sm" /> : t('link_patient')}
            </button>
          </>
        }>
        <div className="flex flex-col gap-4">
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Enter the <strong>registered email address</strong> of the patient you want to link.
          </p>
          <div>
            <label className="field-label">{t('patient_email')}</label>
            <input type="email" value={linkEmail}
              onChange={e => { setLinkEmail(e.target.value); setLinkError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLinkPatient()}
              className="field-input" placeholder="patient@example.com" autoFocus />
          </div>
          {linkError && <div className="alert alert-danger text-sm">{linkError}</div>}
        </div>
      </Modal>
    </div>
  );
}

