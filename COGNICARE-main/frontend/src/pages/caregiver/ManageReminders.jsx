import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getReminders, createReminder, updateReminder, deleteReminder } from '../../services/caregiverService';
import { useLanguage } from '../../context/LanguageContext';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
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
const DAY_KEYS = { monday: 'day_mon', tuesday: 'day_tue', wednesday: 'day_wed', thursday: 'day_thu', friday: 'day_fri', saturday: 'day_sat', sunday: 'day_sun' };

const EMPTY_FORM = {
  type: 'medicine', title: '', description: '', time: '08:00',
  days: [...DAYS], isRecurring: true,
};

export default function ManageReminders() {
  const { patientId } = useParams();
  const toast         = useToast();
  const { t }         = useLanguage();

  const [reminders, setReminders] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(null);

  const load = async () => {
    try {
      const res = await getReminders(patientId);
      setReminders(res.data?.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [patientId]);

  const openNew  = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(''); setModal(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ type: r.type, title: r.title, description: r.description || '',
              time: r.time, days: r.days || [...DAYS], isRecurring: r.isRecurring });
    setFormError('');
    setModal(true);
  };
  const closeModal = () => { setModal(false); setFormError(''); };

  const toggleDay = (d) => setForm(f => ({
    ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d],
  }));

  const handleSave = async () => {
    setFormError('');
    if (!form.title.trim()) { setFormError(t('err_title_req')); return; }
    if (!form.time)          { setFormError(t('err_time_req'));  return; }
    if (form.days.length === 0) { setFormError(t('err_day_req')); return; }
    setSaving(true);
    try {
      if (editing) {
        const res = await updateReminder(patientId, editing._id, form);
        setReminders(prev => prev.map(r => r._id === editing._id ? res.data.data : r));
        toast(t('reminder_updated'), 'success');
      } else {
        const res = await createReminder(patientId, form);
        setReminders(prev => [...prev, res.data.data]);
        toast(t('reminder_added'), 'success');
      }
      closeModal();
    } catch { toast('Could not save reminder.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteReminder(patientId, id);
      setReminders(prev => prev.filter(r => r._id !== id));
      toast(t('reminder_deleted'), 'info');
    } catch { toast('Could not delete.', 'error'); }
    finally { setDeleting(null); }
  };

  const toggleActive = async (r) => {
    try {
      const res = await updateReminder(patientId, r._id, { isActive: !r.isActive });
      setReminders(prev => prev.map(x => x._id === r._id ? res.data.data : x));
    } catch { toast('Could not update.', 'error'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 pb-28 pt-6 animate-fade-in">
      <PageHeader title={t('manage_reminders')} emoji="ðŸ””"
        backTo={`/caregiver/patient/${patientId}`}
        actions={<button onClick={openNew} className="btn-primary btn-sm">+ {t('add')}</button>} />

      {reminders.length === 0 ? (
        <EmptyState emoji="ðŸ””" title={t('no_reminders_yet')} message={t('no_reminders_msg')}
          action={<button onClick={openNew} className="btn-primary">ðŸ”” {t('add_reminder')}</button>} />
      ) : (
        <div className="flex flex-col gap-3">
          {reminders.sort((a, b) => a.time.localeCompare(b.time)).map(r => (
            <div key={r._id}
              className={`card flex items-start gap-3 ${!r.isActive ? 'opacity-50' : ''}`}>
              <span className="text-3xl shrink-0">{r.icon || ICONS[r.type] || 'ðŸ“Œ'}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-warm-900 text-lg">{r.title}</div>
                {r.description && <div className="text-sm text-warm-500">{r.description}</div>}
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-sm font-medium text-primary-600">ðŸ• {r.time}</span>
                  <span className="badge badge-grey">{t(TYPE_KEYS[r.type] || 'type_other')}</span>
                  {!r.isActive && <span className="badge badge-grey">{t('reminder_inactive')}</span>}
                </div>
                <div className="text-xs text-warm-400 mt-1">
                  {r.days?.map(d => t(DAY_KEYS[d]) || d).join(', ')}
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => openEdit(r)} className="btn-ghost btn-sm">{t('edit')}</button>
                <button onClick={() => toggleActive(r)}
                  className={`btn-sm ${r.isActive ? 'btn-outline' : 'btn-primary'}`}>
                  {r.isActive ? t('disable') : t('enable')}
                </button>
                <button onClick={() => handleDelete(r._id)} disabled={deleting === r._id}
                  className="btn-sm text-danger-500 hover:bg-danger-50 rounded-xl px-3">
                  {deleting === r._id ? <Spinner size="sm" /> : 'ðŸ—‘'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal â€” same compact layout as patient RemindersPage */}
      <Modal open={modal} onClose={closeModal}
        title={editing ? t('edit_reminder') : t('new_reminder')}
        size="sm"
        footer={
          <div className="flex gap-3 w-full">
            <button onClick={closeModal} disabled={saving} className="btn-ghost flex-1">
              {t('cancel')}
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? <Spinner size="sm" /> : editing ? `ðŸ’¾ ${t('save')}` : `âœ… ${t('create')}`}
            </button>
          </div>
        }>

        {formError && (
          <div className="alert alert-danger mb-3 text-sm" role="alert">{formError}</div>
        )}

        <div className="flex flex-col gap-3 pb-2">

          {/* Compact icon-only type picker */}
          <div>
            <label className="field-label text-sm">{t('reminder_type')}</label>
            <div className="flex gap-1.5 flex-wrap">
              {TYPES.map(tp => (
                <button key={tp} type="button" onClick={() => setForm(f => ({ ...f, type: tp }))}
                  title={t(TYPE_KEYS[tp])}
                  className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl border-2 transition-all
                    ${form.type === tp
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-warm-200 text-warm-600 hover:border-primary-300'}`}>
                  <span className="text-lg leading-none">{ICONS[tp]}</span>
                </button>
              ))}
              <span className="self-center text-sm text-primary-700 font-medium ml-1">
                {t(TYPE_KEYS[form.type])}
              </span>
            </div>
          </div>

          <div>
            <label className="field-label text-sm">
              {t('reminder_title')} <span className="text-danger-500">*</span>
            </label>
            <input type="text" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="field-input" placeholder={t('reminder_title_ph')} required />
          </div>

          <div>
            <label className="field-label text-sm">
              {t('reminder_desc')} <span className="text-warm-400 font-normal">{t('optional')}</span>
            </label>
            <input type="text" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="field-input" placeholder={t('reminder_desc_ph')} />
          </div>

          <div>
            <label className="field-label text-sm">
              {t('reminder_time')} <span className="text-danger-500">*</span>
            </label>
            <input type="time" value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="field-input" required />
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

