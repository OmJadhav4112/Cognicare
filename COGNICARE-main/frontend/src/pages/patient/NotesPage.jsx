import React, { useState, useEffect } from 'react';
import { getNotes, createNote, updateNote, deleteNote } from '../../services/patientService';
import { useLanguage } from '../../context/LanguageContext';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import { useToast } from '../../components/common/Toast';

const NOTE_COLORS = [
  { bg: '#FFF9C4', label: 'Yellow' }, { bg: '#C8E6C9', label: 'Green' },
  { bg: '#BBDEFB', label: 'Blue'   }, { bg: '#F8BBD0', label: 'Pink'  },
  { bg: '#FFE0B2', label: 'Orange' }, { bg: '#E1BEE7', label: 'Purple' },
];

const EMPTY_FORM = { title: '', content: '', isTask: false, color: '#FFF9C4', taskCompleted: false };

export default function NotesPage() {
  const toast = useToast();
  const { t } = useLanguage();

  const [notes,    setNotes]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [modal,    setModal]   = useState(false);
  const [editing,  setEditing] = useState(null);
  const [form,     setForm]    = useState(EMPTY_FORM);
  const [saving,   setSaving]  = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    try {
      const res = await getNotes();
      setNotes(res.data?.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true); };
  const openEdit = (note) => {
    setEditing(note);
    setForm({ title: note.title, content: note.content, isTask: note.isTask,
              color: note.color, taskCompleted: note.taskCompleted });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast(t('add_title'), 'warning'); return; }
    setSaving(true);
    try {
      if (editing) {
        const res = await updateNote(editing._id, form);
        setNotes(prev => prev.map(n => n._id === editing._id ? res.data.data : n));
        toast(t('note_updated'), 'success');
      } else {
        const res = await createNote(form);
        setNotes(prev => [res.data.data, ...prev]);
        toast(t('note_saved'), 'success');
      }
      setModal(false);
    } catch { toast('Could not save note.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteNote(id);
      setNotes(prev => prev.filter(n => n._id !== id));
      toast(t('note_deleted'), 'info');
    } catch { toast('Could not delete note.', 'error'); }
    finally { setDeleting(null); }
  };

  const togglePin = async (note) => {
    try {
      const res = await updateNote(note._id, { ...note, isPinned: !note.isPinned });
      setNotes(prev => prev.map(n => n._id === note._id ? res.data.data : n));
    } catch { toast('Could not update note.', 'error'); }
  };

  const toggleTask = async (note) => {
    try {
      const res = await updateNote(note._id, { ...note, taskCompleted: !note.taskCompleted });
      setNotes(prev => prev.map(n => n._id === note._id ? res.data.data : n));
    } catch {}
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>
  );

  const pinned = notes.filter(n => n.isPinned);
  const rest   = notes.filter(n => !n.isPinned);

  return (
    <div className="page-wrapper animate-fade-in">
      <PageHeader title={t('notes_tasks')} emoji="📝" backTo="/patient"
        actions={<button onClick={openNew} className="btn-primary btn-sm">{t('new_note')}</button>} />

      {notes.length === 0 ? (
        <EmptyState emoji="📝" title={t('no_notes')} message={t('no_notes_msg')}
          action={<button onClick={openNew} className="btn-primary">{t('create_note')}</button>} />
      ) : (
        <>
          {pinned.length > 0 && (
            <section className="mb-5">
              <h2 className="text-base font-bold text-warm-500 uppercase tracking-wide mb-2">{t('pinned')}</h2>
              <div className="grid grid-cols-2 gap-3">
                {pinned.map(n => <NoteCard key={n._id} note={n} t={t}
                  onEdit={openEdit} onDelete={handleDelete} onPin={togglePin}
                  onToggleTask={toggleTask} deleting={deleting} />)}
              </div>
            </section>
          )}
          <div className="grid grid-cols-2 gap-3">
            {rest.map(n => <NoteCard key={n._id} note={n} t={t}
              onEdit={openEdit} onDelete={handleDelete} onPin={togglePin}
              onToggleTask={toggleTask} deleting={deleting} />)}
          </div>
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? t('edit_note') : t('new_note').replace('+ ', '')}
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn-ghost">{t('cancel')}</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Spinner size="sm" /> : editing ? `💾 ${t('save')}` : `✅ ${t('create')}`}
            </button>
          </>
        }>
        <div className="flex flex-col gap-4">
          <div>
            <label className="field-label">{t('note_title')}</label>
            <input type="text" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="field-input" placeholder={t('note_title_ph')} maxLength={200} />
          </div>
          <div>
            <label className="field-label">
              {t('note_content')} <span className="text-warm-400 font-normal">{t('optional')}</span>
            </label>
            <textarea value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              className="field-input resize-none" rows={4}
              placeholder={t('note_content_ph')} maxLength={2000} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setForm(f => ({ ...f, isTask: !f.isTask }))}
              className={`w-12 h-6 rounded-full transition-colors ${form.isTask ? 'bg-primary-500' : 'bg-warm-300'} relative`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform
                ${form.isTask ? 'left-6' : 'left-0.5'}`} />
            </div>
            <span className="text-base font-medium text-warm-700">{t('mark_as_task')}</span>
          </label>
          <div>
            <label className="field-label">{t('colour')}</label>
            <div className="flex gap-2">
              {NOTE_COLORS.map(c => (
                <button key={c.bg} onClick={() => setForm(f => ({ ...f, color: c.bg }))}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${form.color === c.bg ? 'border-warm-700 scale-125' : 'border-warm-300'}`}
                  style={{ backgroundColor: c.bg }} aria-label={c.label} />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function NoteCard({ note, t, onEdit, onDelete, onPin, onToggleTask, deleting }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2 shadow-soft relative"
      style={{
        backgroundColor: note.color || '#FFF9C4',
        border: '1px solid var(--surface-border)',
        // In dark mode keep user-chosen note colours but darken them slightly
        filter: 'var(--note-filter, none)',
      }}>
      <button onClick={() => onPin(note)}
        className="absolute top-2 right-2 text-lg opacity-60 hover:opacity-100"
        aria-label={note.isPinned ? 'Unpin' : 'Pin'}>
        {note.isPinned ? '📌' : '🔲'}
      </button>

      {note.isTask && (
        <button onClick={() => onToggleTask(note)} className="flex items-center gap-2 text-base font-medium"
          aria-label={note.taskCompleted ? 'Mark incomplete' : 'Mark complete'}>
          <span className="text-2xl">{note.taskCompleted ? '✅' : '⬜'}</span>
        </button>
      )}

      <div className={`font-bold text-warm-800 text-base pr-6 ${note.taskCompleted ? 'line-through opacity-60' : ''}`}>
        {note.title}
      </div>

      {note.content && <p className="text-sm text-warm-600 line-clamp-3">{note.content}</p>}

      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-xs text-warm-400">
          {new Date(note.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </span>
        <div className="flex gap-1">
          <button onClick={() => onEdit(note)} className="text-primary-600 text-sm font-medium hover:underline">
            {t('edit')}
          </button>
          <span className="text-warm-300">·</span>
          <button onClick={() => onDelete(note._id)} disabled={deleting === note._id}
            className="text-danger-500 text-sm font-medium hover:underline">
            {deleting === note._id ? '…' : t('delete').slice(0, 3)}
          </button>
        </div>
      </div>
    </div>
  );
}
