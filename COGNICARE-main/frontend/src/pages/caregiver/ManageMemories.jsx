import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMemories, addMemory, updateMemory, deleteMemory } from '../../services/caregiverService';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import { useToast } from '../../components/common/Toast';

const TYPES = [
  { key: 'person', icon: '👤', label: 'Person' },
  { key: 'place',  icon: '📍', label: 'Place'  },
  { key: 'event',  icon: '🎉', label: 'Event'  },
  { key: 'photo',  icon: '📸', label: 'Photo'  },
];

const EMPTY_FORM = {
  type: 'person', title: '', personName: '', relationship: '',
  description: '', photo: null, memoryHints: '', memoryDate: '',
  isFavorite: false, usedInGames: true
};

export default function ManageMemories() {
  const { patientId } = useParams();
  const toast = useToast();
  const [memories,  setMemories]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');
  const [modal,     setModal]     = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(null);

  const load = async () => {
    try {
      const res = await getMemories(patientId);
      setMemories(res.data?.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [patientId]);

  const openNew  = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true); };
  const openEdit = (m) => {
    setEditing(m);
    setForm({ type: m.type, title: m.title, personName: m.personName || '',
              relationship: m.relationship || '', description: m.description || '',
              photo: m.photo || null, memoryHints: (m.memoryHints || []).join(', '),
              memoryDate: m.memoryDate || '', isFavorite: m.isFavorite, usedInGames: m.usedInGames });
    setModal(true);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Photo must be under 2MB.', 'warning'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setForm(f => ({ ...f, photo: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast('Title is required.', 'warning'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        memoryHints: form.memoryHints.split(',').map(s => s.trim()).filter(Boolean)
      };
      if (editing) {
        const res = await updateMemory(patientId, editing._id, payload);
        setMemories(prev => prev.map(m => m._id === editing._id ? res.data.data : m));
        toast('Memory updated!', 'success');
      } else {
        const res = await addMemory(patientId, payload);
        setMemories(prev => [res.data.data, ...prev]);
        toast('Memory added to vault! 💝', 'success');
      }
      setModal(false);
    } catch { toast('Could not save memory.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteMemory(patientId, id);
      setMemories(prev => prev.filter(m => m._id !== id));
      toast('Memory removed.', 'info');
    } catch { toast('Could not delete.', 'error'); }
    finally { setDeleting(null); }
  };

  const filtered = filter === 'all' ? memories : memories.filter(m => m.type === filter);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-28 pt-6 animate-fade-in">
      <PageHeader title="Memory Vault" emoji="📸" backTo={`/caregiver/patient/${patientId}`}
        subtitle="Add photos, family members, and special memories"
        actions={<button onClick={openNew} className="btn-primary btn-sm">+ Add</button>} />

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {[{ key: 'all', icon: '🏠', label: 'All' }, ...TYPES].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`shrink-0 flex items-center gap-1 px-4 py-2 rounded-2xl font-semibold text-base transition-colors
              ${filter === t.key ? 'bg-primary-600 text-white' : 'bg-warm-100 text-warm-700 border-2 border-warm-300 hover:border-primary-300'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState emoji="💝" title="No memories yet"
          message="Add family members, favourite places, and special moments for your patient."
          action={<button onClick={openNew} className="btn-primary">+ Add Memory</button>} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(m => (
            <div key={m._id} className="card flex flex-col items-center gap-2 text-center p-4 relative">
              {m.isFavorite && <span className="absolute top-2 right-2 text-yellow-500">⭐</span>}

              {m.photo
                ? <img src={m.photo} alt={m.title} className="w-20 h-20 rounded-2xl object-cover border-2 border-warm-100" />
                : <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center text-5xl">
                    {TYPES.find(t => t.key === m.type)?.icon || '📸'}
                  </div>}

              <div className="font-bold text-warm-900 text-base line-clamp-1 w-full">{m.title}</div>
              {m.relationship && <div className="text-xs text-primary-600">{m.relationship}</div>}
              {m.memoryDate   && <div className="text-xs text-warm-400">{m.memoryDate}</div>}

              <div className="flex gap-2 mt-auto w-full">
                <button onClick={() => openEdit(m)} className="btn-ghost btn-sm flex-1">Edit</button>
                <button onClick={() => handleDelete(m._id)} disabled={deleting === m._id}
                  className="btn-sm text-danger-500 hover:bg-danger-50 rounded-xl px-3 flex-1">
                  {deleting === m._id ? <Spinner size="sm" /> : '🗑'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Edit Memory' : 'Add Memory'}
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Spinner size="sm" /> : editing ? '💾 Save' : '💝 Add'}
            </button>
          </>
        }>
        <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* Type selector */}
          <div>
            <label className="field-label">Memory Type</label>
            <div className="grid grid-cols-4 gap-2">
              {TYPES.map(t => (
                <button key={t.key} type="button" onClick={() => setForm(f => ({ ...f, type: t.key }))}
                  className={`flex flex-col items-center p-2 rounded-xl border-2 text-sm font-medium transition-all
                    ${form.type === t.key ? 'border-primary-500 bg-primary-50' : 'border-warm-200 hover:border-primary-300'}`}>
                  <span className="text-2xl">{t.icon}</span>
                  <span className="text-xs">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Title / Label</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="field-input" placeholder="e.g. Grandma Lakhi" required />
          </div>

          {form.type === 'person' && (
            <>
              <div>
                <label className="field-label">Full Name</label>
                <input type="text" value={form.personName} onChange={e => setForm(f => ({ ...f, personName: e.target.value }))}
                  className="field-input" placeholder="Person's full name" />
              </div>
              <div>
                <label className="field-label">Relationship</label>
                <input type="text" value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}
                  className="field-input" placeholder="e.g. Daughter, Son, Grandchild…" />
              </div>
            </>
          )}

          <div>
            <label className="field-label">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="field-input resize-none" rows={3}
              placeholder="A short description or story about this memory…" />
          </div>

          <div>
            <label className="field-label">Memory Date <span className="text-warm-400 font-normal">(optional)</span></label>
            <input type="text" value={form.memoryDate} onChange={e => setForm(f => ({ ...f, memoryDate: e.target.value }))}
              className="field-input" placeholder="e.g. Summer 1985, Christmas 2005" />
          </div>

          <div>
            <label className="field-label">Memory Hints <span className="text-warm-400 font-normal">(comma separated)</span></label>
            <input type="text" value={form.memoryHints} onChange={e => setForm(f => ({ ...f, memoryHints: e.target.value }))}
              className="field-input" placeholder="e.g. Red saree, kitchen garden, favourite song" />
          </div>

          <div>
            <label className="field-label">Photo <span className="text-warm-400 font-normal">(max 2MB)</span></label>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="field-input text-sm" />
            {form.photo && (
              <div className="mt-2">
                <img src={form.photo} alt="Preview" className="w-24 h-24 rounded-2xl object-cover border-2 border-warm-200" />
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => setForm(f => ({ ...f, isFavorite: !f.isFavorite }))}
                className={`w-10 h-5 rounded-full transition-colors relative ${form.isFavorite ? 'bg-yellow-400' : 'bg-warm-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
                  ${form.isFavorite ? 'left-5' : 'left-0.5'}`} />
              </div>
              <span className="text-sm font-medium text-warm-700">⭐ Favourite</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => setForm(f => ({ ...f, usedInGames: !f.usedInGames }))}
                className={`w-10 h-5 rounded-full transition-colors relative ${form.usedInGames ? 'bg-primary-500' : 'bg-warm-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
                  ${form.usedInGames ? 'left-5' : 'left-0.5'}`} />
              </div>
              <span className="text-sm font-medium text-warm-700">🎮 Use in games</span>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}

