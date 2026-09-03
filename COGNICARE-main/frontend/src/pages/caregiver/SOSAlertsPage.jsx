import React, { useEffect, useState } from 'react';
import { getSOSAlerts, acknowledgeAlert, resolveAlert } from '../../services/caregiverService';
import { useLanguage } from '../../context/LanguageContext';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import { useToast } from '../../components/common/Toast';

const STATUS_COLOR = {
  sent:         'border-danger-400 bg-danger-50',
  acknowledged: 'border-yellow-400 bg-yellow-50',
  resolved:     'border-green-400 bg-green-50',
};

export default function SOSAlertsPage() {
  const toast = useToast();
  const { t } = useLanguage();

  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [actingId, setActingId] = useState(null);
  const [note,     setNote]     = useState('');
  const [noteFor,  setNoteFor]  = useState(null);

  const load = async () => {
    try {
      const res = await getSOSAlerts();
      setAlerts(res.data?.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAck = async (id) => {
    setActingId(id);
    try {
      await acknowledgeAlert(id, note);
      toast(t('acknowledge') + ' ✅', 'success');
      setNoteFor(null); setNote('');
      load();
    } catch { toast('Could not acknowledge alert.', 'error'); }
    finally { setActingId(null); }
  };

  const handleResolve = async (id) => {
    setActingId(id);
    try {
      await resolveAlert(id, note);
      toast(t('resolve') + ' ✅', 'success');
      setNoteFor(null); setNote('');
      load();
    } catch { toast('Could not resolve alert.', 'error'); }
    finally { setActingId(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>
  );

  const pending = alerts.filter(a => a.status === 'sent');
  const others  = alerts.filter(a => a.status !== 'sent');

  return (
    <div className="max-w-3xl mx-auto px-4 pb-28 pt-6 animate-fade-in">
      <PageHeader title={t('sos_alerts')} emoji="🆘" backTo="/caregiver" />

      {alerts.length === 0 ? (
        <EmptyState emoji="✅" title={t('no_sos')} message={t('all_well')} />
      ) : (
        <>
          {pending.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-bold text-danger-700 mb-3">
                {t('needs_attention')} ({pending.length})
              </h2>
              <div className="flex flex-col gap-3">
                {pending.map(alert => (
                  <AlertCard key={alert._id} alert={alert} t={t}
                    actingId={actingId} noteFor={noteFor} note={note}
                    setNote={setNote} setNoteFor={setNoteFor}
                    onAck={handleAck} onResolve={handleResolve} />
                ))}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-warm-700 mb-3">{t('history')}</h2>
              <div className="flex flex-col gap-3">
                {others.map(alert => (
                  <AlertCard key={alert._id} alert={alert} t={t}
                    actingId={actingId} noteFor={noteFor} note={note}
                    setNote={setNote} setNoteFor={setNoteFor}
                    onAck={handleAck} onResolve={handleResolve} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function AlertCard({ alert, t, actingId, noteFor, note, setNote, setNoteFor, onAck, onResolve }) {
  const isActing = actingId === alert._id;
  const showNote = noteFor === alert._id;

  return (
    <div className={`rounded-2xl border-2 p-4 ${STATUS_COLOR[alert.status] || 'bg-white border-warm-200'}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🆘</span>
          <div>
            <div className="font-bold text-warm-900 text-base">{alert.patient?.name || 'Patient'}</div>
            <div className="text-sm text-warm-500">
              {new Date(alert.createdAt).toLocaleString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </div>
          </div>
        </div>
        <span className={`badge ${alert.status === 'sent' ? 'badge-red' : alert.status === 'acknowledged' ? 'badge-amber' : 'badge-green'}`}>
          {alert.status}
        </span>
      </div>

      <p className="text-base text-warm-700 mb-3">{alert.message}</p>
      {alert.patient?.phone && <div className="text-sm text-warm-600 mb-3">📞 {alert.patient.phone}</div>}
      {alert.caregiverNote && (
        <div className="text-sm text-primary-700 bg-primary-50 rounded-xl p-2 mb-3 italic">
          "{alert.caregiverNote}"
        </div>
      )}

      {alert.status === 'sent' && (
        <div className="flex flex-col gap-2">
          {showNote ? (
            <div className="flex flex-col gap-2">
              <textarea value={note} onChange={e => setNote(e.target.value)}
                className="field-input resize-none text-sm" rows={2}
                placeholder={t('add_note_optional')} />
              <div className="flex gap-2">
                <button onClick={() => onAck(alert._id)} disabled={isActing}
                  className="btn-secondary flex-1">
                  {isActing ? <Spinner size="sm" /> : t('acknowledge')}
                </button>
                <button onClick={() => onResolve(alert._id)} disabled={isActing}
                  className="btn-primary flex-1">
                  {isActing ? <Spinner size="sm" /> : t('resolve')}
                </button>
              </div>
              <button onClick={() => setNoteFor(null)} className="btn-ghost text-sm">{t('cancel')}</button>
            </div>
          ) : (
            <button onClick={() => setNoteFor(alert._id)} className="btn-danger w-full">
              {t('respond_sos')}
            </button>
          )}
        </div>
      )}

      {alert.status === 'acknowledged' && !showNote && (
        <button onClick={() => setNoteFor(alert._id)} className="btn-outline btn-sm w-full">
          {t('mark_resolved')}
        </button>
      )}
      {showNote && alert.status === 'acknowledged' && (
        <div className="flex flex-col gap-2 mt-2">
          <textarea value={note} onChange={e => setNote(e.target.value)}
            className="field-input resize-none text-sm" rows={2}
            placeholder={t('resolution_note')} />
          <button onClick={() => onResolve(alert._id)} disabled={isActing}
            className="btn-primary w-full">
            {isActing ? <Spinner size="sm" /> : t('confirm_resolved')}
          </button>
        </div>
      )}
    </div>
  );
}
