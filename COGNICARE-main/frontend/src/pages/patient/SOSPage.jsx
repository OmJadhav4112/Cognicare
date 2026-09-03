import React, { useState, useEffect } from 'react';
import { triggerSOS, getSOSHistory } from '../../services/patientService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import PageHeader from '../../components/common/PageHeader';
import Spinner from '../../components/common/Spinner';
import { useToast } from '../../components/common/Toast';

const STATUS_BADGE = {
  sent:         'badge badge-red',
  acknowledged: 'badge badge-amber',
  resolved:     'badge badge-green',
};

export default function SOSPage() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();

  const [sending,   setSending]   = useState(false);
  const [history,   setHistory]   = useState([]);
  const [loadHist,  setLoadHist]  = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [sent,      setSent]      = useState(false);

  const loadHistory = async () => {
    try {
      const res = await getSOSHistory();
      setHistory(res.data?.data || []);
    } finally { setLoadHist(false); }
  };

  useEffect(() => { loadHistory(); }, []);

  const handleSOS = async () => {
    if (!confirmed) { setConfirmed(true); return; }
    setSending(true);
    try {
      await triggerSOS('I need help! Please come quickly.');
      setSent(true);
      setConfirmed(false);
      toast(`🆘 ${t('sos_sent')}`, 'success');
      loadHistory();
    } catch {
      toast('Could not send SOS. Please call your caregiver directly.', 'error');
    } finally {
      setSending(false);
    }
  };

  const caregiver = profile?.caregiver;

  return (
    <div className="page-wrapper animate-fade-in">
      <PageHeader title={t('sos_page')} emoji="🆘" backTo="/patient" />

      {caregiver ? (
        <div className="card mb-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700 shrink-0">
            {caregiver.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-base text-warm-500">{t('sos_caregiver')}</div>
            <div className="text-xl font-bold text-warm-900">{caregiver.name}</div>
            {caregiver.phone && <div className="text-base text-warm-600">📞 {caregiver.phone}</div>}
          </div>
        </div>
      ) : (
        <div className="alert alert-warning mb-5">{t('no_caregiver')}</div>
      )}

      <div className="card mb-5 text-center">
        {sent ? (
          <div className="py-6">
            <div className="text-6xl mb-3">✅</div>
            <h2 className="text-2xl font-bold text-green-700">{t('sos_sent')}</h2>
            <p className="text-base text-warm-500 mt-2">{t('sos_sent_msg')}</p>
            <button onClick={() => setSent(false)} className="btn-outline mt-5 w-full">
              {t('send_another')}
            </button>
          </div>
        ) : confirmed ? (
          <div className="py-4">
            <div className="text-5xl mb-3" aria-hidden="true">⚠️</div>
            <h2 className="text-xl font-bold text-danger-700 mb-2">{t('are_you_sure')}</h2>
            <p className="text-base text-warm-600 mb-5">
              {t('sos_confirm_msg')} {caregiver?.name || t('sos_caregiver')}.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmed(false)} className="btn-outline flex-1">
                {t('cancel')}
              </button>
              <button onClick={handleSOS} disabled={sending}
                className="btn-danger flex-1 text-xl py-5">
                {sending ? <Spinner size="sm" /> : t('yes_send')}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-base text-warm-600 mb-5">{t('sos_use_emergency')}</p>
            <button onClick={handleSOS} disabled={sending}
              className="sos-btn animate-sos-ring" aria-label={t('send_sos')}>
              {t('send_sos')}
            </button>
          </div>
        )}
      </div>

      <section>
        <h2 className="text-lg font-bold text-warm-800 mb-3">{t('prev_alerts')}</h2>
        {loadHist ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : history.length === 0 ? (
          <div className="card text-center py-6 text-warm-400">{t('no_prev_alerts')}</div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map(alert => (
              <div key={alert._id} className="card flex items-start gap-3">
                <span className="text-3xl shrink-0">🆘</span>
                <div className="flex-1">
                  <div className="font-semibold text-warm-800">{alert.message}</div>
                  <div className="text-sm text-warm-500 mt-1">
                    {new Date(alert.createdAt).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                  {alert.caregiverNote && (
                    <div className="text-sm text-primary-700 mt-1 italic">
                      "{alert.caregiverNote}"
                    </div>
                  )}
                </div>
                <span className={STATUS_BADGE[alert.status] || 'badge badge-grey'}>
                  {alert.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
