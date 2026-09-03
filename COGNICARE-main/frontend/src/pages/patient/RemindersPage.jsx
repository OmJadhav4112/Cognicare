import React, { useState, useEffect, useCallback } from 'react';
import {
  getReminders, acknowledgeReminder,
  createReminder, updateReminder, deleteReminder,
} from '../../services/patientService';
import { useLanguage } from '../../context/LanguageContext';
import PageHeader  from '../../components/common/PageHeader';
import EmptyState  from '../../components/common/EmptyState';
import Spinner     from '../../components/common/Spinner';
import Modal       from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';

const TYPES = ['medicine', 'meal', 'appointment', 'water', 'exercise', 'activity', 'other'];
const ICONS = {
  medicine: 'ðŸ’Š', meal: 'ðŸ½ï¸', appointment: 'ðŸ“…',
  water: 'ðŸ’§', exercise: 'ðŸƒ', activity: 'ðŸ§©', other: 'ðŸ“Œ',
};
const TYPE_KEYS = {
  medicine: 'type_medicine', meal: 'type_meal', appointment: 'type_appointment',
  water: 'type_water', exercise: 'type_exercise', activity: 'type_activity', other: 'type_other',
};
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_KEYS = {
  monday: 'day_mon', tuesday: 'day_tue', wednesday: 'day_wed',
  thursday: 'day_thu', friday: 'day_fri', saturday: 'day_sat', sunday: 'day_sun',
};

const TODAY    = new Date().toISOString().split('T')[0];
const DAY_NAME = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

const EMPTY_FORM = {
  type: 'medicine', title: '', description: '', time: '08:00',
  days: [...DAYS], isRecurring: true,
};

export default function RemindersPage() {
  const toast   = useToast();
  const { t }   = useLanguage();

  const [reminders, setReminders] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [ackingId,  setAckingId]  = useState(null);
  const [deleting,  setDeleting]  = useState(null);

  const [modal,     setModal]    = useState(false);
  const [editing,   setEditing]  = useState(null);
  const [form,      setForm]     = useState(EMPTY_FORM);
  const [saving,    setSaving]   = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await getReminders();
      setReminders(res.data?.data || []);
    } catch {
      setError('Could not load reminders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isAcknowledged = (r) => r.acknowledgedDates?.includes(TODAY);
  const todayRems    = reminders.filter(r => r.isActive && (r.days?.includes(DAY_NAME) || !r.days?.length));
  const otherRems    = reminders.filter(r => r.isActive && r.days?.length > 0 && !r.days.includes(DAY_NAME));
  const inactiveRems = reminders.filter(r => !r.isActive);

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(''); setModal(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ type: r.type, title: r.title, description: r.description || '',
              time: r.time, days: r.days?.length ? r.days : [...DAYS],
              isRecurring: r.isRecurring !== false });
    setFormError('');
    setModal(true);
  };
  const closeModal = () => { setModal(false); setFormError(''); };

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }, []);

  const toggleDay = (d) => setForm(f => ({
    ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d],
  }));

  const handleSave = async () => {
    setFormError('');
    if (!form.title.trim())    { setFormError(t('err_title_req')); return; }
    if (!form.time)            { setFormError(t('err_time_req'));  return; }
    if (form.days.length === 0){ setFormError(t('err_day_req'));   return; }

    setSaving(true);
    try {
      if (editing) {
        const res = await updateReminder(editing._id, form);
        setReminders(prev => prev.map(r => r._id === editing._id ? res.data.data : r));
        toast(t('reminder_updated'), 'success');
      } else {
        const res = await createReminder(form);
        setReminders(prev => [...prev, res.data.data]);
        toast(t('reminder_added'), 'success');
      }
      closeModal();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not save reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAcknowledge = async (id) => {
    setAckingId(id);
    try {
      await acknowledgeReminder(id);
      setReminders(prev => prev.map(r =>
        r._id === id ? { ...r, acknowledgedDates: [...(r.acknowledgedDates || []), TODAY] } : r
      ));
      toast(t('reminder_done'), 'success');
    } catch {
      toast('Could not update reminder.', 'error');
    } finally {
      setAckingId(null);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteReminder(id);
      setReminders(prev => prev.filter(r => r._id !== id));
      toast(t('reminder_deleted'), 'info');
    } catch {
      toast('Could not delete reminder.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const ReminderItem = ({ r }) => {
    const acked = isAcknowledged(r);
    return (
      <div className={acked ? 'reminder-item-done' : 'reminder-item'}>
        <span className="text-3xl shrink-0">{r.icon || ICONS[r.type] || 'ðŸ“Œ'}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-warm-800 text-lg truncate">{r.title}</div>
          {r.description && <div className="text-sm text-warm-500">{r.description}</div>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm font-medium text-primary-600">ðŸ• {r.time}</span>
            <span className="badge badge-grey">{t(TYPE_KEYS[r.type] || 'type_other')}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {acked ? (
            <span className="badge badge-green">{t('done')} âœ“</span>
          ) : (
            <button onClick={() => handleAcknowledge(r._id)} disabled={ackingId === r._id}
              className="btn-primary btn-sm">
              {ackingId === r._id ? <Spinner size="sm" /> : `âœ“ ${t('done')}`}
            </button>
          )}
          <div className="flex gap-1">
            <button onClick={() => openEdit(r)} className="btn-ghost btn-sm text-sm px-2">{t('edit')}</button>
            <button onClick={() => handleDelete(r._id)} disabled={deleting === r._id}
              className="btn-sm text-danger-500 hover:bg-danger-50 rounded-xl px-2 text-sm">
              {deleting === r._id ? <Spinner size="sm" /> : 'ðŸ—‘'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>
  );

  return (
    <div className="page-wrapper animate-fade-in">
      <PageHeader
        title={t('my_reminders')}
        emoji="ðŸ””"
        backTo="/patient"
        subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        actions={<button onClick={openNew} className="btn-primary btn-sm">ï¼‹ {t('add')}</button>}
      />

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      {reminders.length === 0 ? (
        <EmptyState
          emoji="ðŸ””"
          title={t('no_reminders_yet')}
          message={t('no_reminders_msg')}
          action={<button onClick={openNew} className="btn-primary">ðŸ”” {t('add_reminder')}</button>}
        />
      ) : (
        <>
          {todayRems.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-bold text-warm-800 mb-3">ðŸ“… {t('today')}</h2>
              <div className="flex flex-col gap-3">
                {[...todayRems].sort((a, b) => a.time.localeCompare(b.time)).map(r => (
                  <ReminderItem key={r._id} r={r} />
                ))}
              </div>
              <div className="alert alert-success mt-3">
                âœ… {todayRems.filter(r => isAcknowledged(r)).length} / {todayRems.length} {t('done_today')}
              </div>
            </section>
          )}

          {otherRems.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-bold text-warm-800 mb-3">ðŸ“‹ {t('reminder_other_days')}</h2>
              <div className="flex flex-col gap-3">
                {otherRems.map(r => <ReminderItem key={r._id} r={r} />)}
              </div>
            </section>
          )}

          {inactiveRems.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-bold text-warm-800 mb-3 opacity-60">{t('reminder_inactive')}</h2>
              <div className="flex flex-col gap-3 opacity-60">
                {inactiveRems.map(r => <ReminderItem key={r._id} r={r} />)}
              </div>
            </section>
          )}
        </>
      )}

      {/* â”€â”€ Add / Edit Modal â”€â”€
          Modal footer is sticky (shrink-0 + border-t in Modal.jsx).
          The Save/Cancel buttons are always visible regardless of scroll position.
      */}
      <Modal
        open={modal}
        onClose={closeModal}
        title={editing ? t('edit_reminder') : t('add_reminder').replace('+ ', '')}
        size="sm"
        footer={
          <div className="flex gap-3 w-full">
            <button onClick={closeModal} disabled={saving} className="btn-ghost flex-1">
              {t('cancel')}
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? <Spinner size="sm" /> : editing ? t('save_reminder') : `ðŸ”” ${t('add_reminder').replace('+ ', '')}`}
            </button>
          </div>
        }
      >
        {formError && (
          <div className="alert alert-danger mb-3 text-sm" role="alert">{formError}</div>
        )}

        <div className="flex flex-col gap-3 pb-2">

          {/* Type â€” compact icon-only row, all 7 fit on one line */}
          <div>
            <label className="field-label text-sm">{t('reminder_type')}</label>
            <div className="flex gap-1.5 flex-wrap">
              {TYPES.map(tp => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: tp }))}
                  title={t(TYPE_KEYS[tp])}
                  className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl border-2 transition-all
                    ${form.type === tp
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-warm-200 text-warm-600 hover:border-primary-300'}`}
                >
                  <span className="text-lg leading-none">{ICONS[tp]}</span>
                </button>
              ))}
              {/* Selected type label */}
              <span className="self-center text-sm text-primary-700 font-medium ml-1">
                {t(TYPE_KEYS[form.type])}
              </span>
            </div>
          </div>

          <div>
            <label className="field-label text-sm">
              {t('reminder_title')} <span className="text-danger-500">*</span>
            </label>
            <input name="title" type="text" value={form.title} onChange={handleChange}
              className="field-input" placeholder={t('reminder_title_ph')} />
          </div>

          <div>
            <label className="field-label text-sm">
              {t('reminder_desc')} <span className="text-warm-400 font-normal">{t('optional')}</span>
            </label>
            <input name="description" type="text" value={form.description} onChange={handleChange}
              className="field-input" placeholder={t('reminder_desc_ph')} />
          </div>

          <div>
            <label className="field-label text-sm">
              {t('reminder_time')} <span className="text-danger-500">*</span>
            </label>
            <input name="time" type="time" value={form.time} onChange={handleChange}
              className="field-input" />
          </div>

          <div>
            <label className="field-label text-sm">
              {t('reminder_days')} <span className="text-danger-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`px-2.5 py-1 rounded-lg text-sm font-medium border-2 transition-all
                    ${form.days.includes(d)
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-warm-200 text-warm-500 hover:border-primary-300'}`}>
                  {t(DAY_KEYS[d])}
                </button>
              ))}
            </div>
          </div>

        </div>
      </Modal>
    </div>
  );
}

