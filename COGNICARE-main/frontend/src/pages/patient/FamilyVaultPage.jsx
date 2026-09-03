import React, { useState, useEffect } from 'react';
import { getVault, createMemory, updateMemory, deleteMemory } from '../../services/patientService';
import { useLanguage } from '../../context/LanguageContext';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Spinner    from '../../components/common/Spinner';
import Modal      from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';

const TYPE_ICONS = { person: '👤', place: '📍', event: '🎉', photo: '📸' };

const EMPTY_FORM = {
  type: 'person', title: '', personName: '', relationship: '',
  description: '', photo: null, memoryHints: '', memoryDate: '',
  isFavorite: false, usedInGames: true,
};

export default function FamilyVaultPage() {
  const toast   = useToast();
  const { t }   = useLanguage();

  const TYPES = [
    { key: 'person', icon: '👤', label: t('type_person') },
    { key: 'place',  icon: '📍', label: t('type_place')  },
    { key: 'event',  icon: '🎉', label: t('type_event')  },
    { key: 'photo',  icon: '📸', label: t('type_photo')  },
  ];
  const TYPE_META = Object.fromEntries(TYPES.map(tp => [tp.key, tp]));
  const FILTER_TABS = [{ key: 'all', label: t('all_memories'), icon: '🏠' }, ...TYPES];

  const [memories, setMemories] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [selected, setSelected] = useState(null);
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    try {
      const res = await getVault();
      setMemories(res.data?.data || []);
    } catch {
      toast('Could not load memories.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered  = filter === 'all' ? memories : memories.filter(m => m.type === filter);
  const favorites = memories.filter(m => m.isFavorite);

  const openNew  = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true); };
  const openEdit = (m) => {
    setEditing(m);
    setForm({ type: m.type, title: m.title, personName: m.personName || '',
              relationship: m.relationship || '', description: m.description || '',
              photo: m.photo || null, memoryHints: (m.memoryHints || []).join(', '),
              memoryDate: m.memoryDate || '', isFavorite: !!m.isFavorite,
              usedInGames: m.usedInGames !== false });
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
    if (!form.title.trim()) { toast(t('add_title'), 'warning'); return; }
    setSaving(true);
    try {
      const payload = { ...form,
        memoryHints: form.memoryHints.split(',').map(s => s.trim()).filter(Boolean) };
      if (editing) {
        const res = await updateMemory(editing._id, payload);
        setMemories(prev => prev.map(m => m._id === editing._id ? res.data.data : m));
        toast(t('memory_updated'), 'success');
      } else {
        const res = await createMemory(payload);
        setMemories(prev => [res.data.data, ...prev]);
        toast(t('memory_added'), 'success');
      }
      setModal(false);
    } catch (err) {
      toast(err.response?.data?.message || 'Could not save memory.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteMemory(id);
      setMemories(prev => prev.filter(m => m._id !== id));
      setSelected(null);
      toast(t('memory_removed'), 'info');
    } catch {
      toast('Could not delete memory.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>
  );

  return (
    <div className="page-wrapper animate-fade-in">
      <PageHeader title={t('family_vault')} emoji="📸" backTo="/patient"
        subtitle={t('vault_subtitle')}
        actions={<button onClick={openNew} className="btn-primary btn-sm">+ {t('add')}</button>} />

      {memories.length === 0 ? (
        <EmptyState emoji="💝" title={t('vault_empty')} message={t('vault_empty_msg')}
          action={<button onClick={openNew} className="btn-primary">{t('add_memory')}</button>} />
      ) : (
        <>
          {favorites.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-bold text-warm-800 mb-3">{t('favourites')}</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {favorites.map(m => (
                  <button key={m._id} onClick={() => setSelected(m)}
                    className="shrink-0 w-36 card flex flex-col items-center gap-2 text-center p-3 hover:shadow-glow transition-all">
                    {m.photo
                      ? <img src={m.photo} alt={m.title} className="w-16 h-16 rounded-full object-cover" />
                      : <span className="text-5xl">{TYPE_ICONS[m.type]}</span>}
                    <span className="text-sm font-semibold text-warm-800 line-clamp-1">{m.title}</span>
                    {m.relationship && <span className="text-xs text-warm-500">{m.relationship}</span>}
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {FILTER_TABS.map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)}
                className={`shrink-0 flex items-center gap-1 px-4 py-2 rounded-2xl font-semibold text-base transition-colors
                  ${filter === tab.key ? 'bg-primary-600 text-white' : 'bg-warm-100 text-warm-700 border-2 border-warm-300 hover:border-primary-300'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState emoji={TYPE_ICONS[filter] || '📭'} title={`No ${filter} memories yet`} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filtered.map(m => (
                <button key={m._id} onClick={() => setSelected(m)}
                  className="card flex flex-col items-center gap-3 text-center hover:shadow-glow hover:-translate-y-0.5 transition-all p-4 relative">
                  {m.isFavorite && <span className="absolute top-2 right-2 text-yellow-500">⭐</span>}
                  {m.photo ? (
                    <img src={m.photo} alt={m.title} className="w-20 h-20 rounded-2xl object-cover border-2 border-warm-200" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-primary-50 border-2 border-primary-100 flex items-center justify-center text-5xl">
                      {TYPE_ICONS[m.type]}
                    </div>
                  )}
                  <div className="w-full">
                    <div className="font-bold text-warm-900 text-base line-clamp-1">{m.title}</div>
                    {m.relationship && <div className="text-sm text-primary-600 font-medium">{m.relationship}</div>}
                    {m.memoryDate   && <div className="text-xs text-warm-400 mt-0.5">{m.memoryDate}</div>}
                  </div>
                  <span className="badge badge-grey text-xs self-start">
                    {TYPE_META[m.type]?.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title || ''}
        footer={
          <div className="flex gap-2 w-full">
            <button onClick={() => { openEdit(selected); setSelected(null); }} className="btn-outline flex-1">
              ✏️ {t('edit')}
            </button>
            <button onClick={() => handleDelete(selected?._id)} disabled={deleting === selected?._id}
              className="btn-danger flex-1">
              {deleting === selected?._id ? <Spinner size="sm" /> : `🗑 ${t('delete')}`}
            </button>
            <button onClick={() => setSelected(null)} className="btn-primary flex-1">{t('close')}</button>
          </div>
        }>
        {selected && (
          <div className="flex flex-col gap-4">
            {selected.photo && (
              <img src={selected.photo} alt={selected.title} className="w-full max-h-56 object-cover rounded-2xl border-2 border-warm-200" />
            )}
            {!selected.photo && (
              <div className="flex items-center justify-center py-6">
                <span className="text-7xl">{TYPE_ICONS[selected.type]}</span>
              </div>
            )}
            {selected.personName && (
              <div>
                <div className="text-sm text-warm-400 font-medium">{t('memory_name_label')}</div>
                <div className="text-xl font-bold text-warm-900">{selected.personName}</div>
              </div>
            )}
            {selected.relationship && (
              <div>
                <div className="text-sm text-warm-400 font-medium">{t('memory_rel_label')}</div>
                <div className="text-lg font-semibold text-primary-700">{selected.relationship}</div>
              </div>
            )}
            {selected.description && (
              <div>
                <div className="text-sm text-warm-400 font-medium">{t('memory_about')}</div>
                <p className="text-base text-warm-700 mt-1 leading-relaxed">{selected.description}</p>
              </div>
            )}
            {selected.memoryDate && (
              <div className="flex items-center gap-2 text-warm-500 text-sm">
                <span>📅</span><span>{selected.memoryDate}</span>
              </div>
            )}
            {selected.memoryHints?.length > 0 && (
              <div>
                <div className="text-sm text-warm-400 font-medium mb-2">{t('memory_hints_label')}</div>
                <div className="flex flex-wrap gap-2">
                  {selected.memoryHints.map((h, i) => (
                    <span key={i} className="badge badge-grey">{h}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add / Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? t('edit_memory') : t('add_memory').replace('+ ', '')}
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn-ghost">{t('cancel')}</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Spinner size="sm" /> : editing ? `💾 ${t('save')}` : `💝 ${t('add')}`}
            </button>
          </>
        }>
        <div className="flex flex-col gap-4 pb-2">
          <div>
            <label className="field-label">{t('memory_type')}</label>
            <div className="grid grid-cols-4 gap-2">
              {TYPES.map(tp => (
                <button key={tp.key} type="button" onClick={() => setForm(f => ({ ...f, type: tp.key }))}
                  className={`flex flex-col items-center p-2 rounded-xl border-2 text-sm font-medium transition-all
                    ${form.type === tp.key ? 'border-primary-500 bg-primary-50' : 'border-warm-200 hover:border-primary-300'}`}>
                  <span className="text-2xl">{tp.icon}</span>
                  <span className="text-xs">{tp.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">{t('memory_title')}</label>
            <input type="text" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="field-input" placeholder={t('memory_title_ph')} required />
          </div>

          {form.type === 'person' && (
            <>
              <div>
                <label className="field-label">{t('memory_name')}</label>
                <input type="text" value={form.personName}
                  onChange={e => setForm(f => ({ ...f, personName: e.target.value }))}
                  className="field-input" placeholder={t('memory_title_ph')} />
              </div>
              <div>
                <label className="field-label">{t('memory_rel')}</label>
                <input type="text" value={form.relationship}
                  onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}
                  className="field-input" placeholder={t('memory_rel_ph')} />
              </div>
            </>
          )}

          <div>
            <label className="field-label">{t('memory_desc')}</label>
            <textarea value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="field-input resize-none" rows={3} placeholder="…" />
          </div>

          <div>
            <label className="field-label">
              {t('memory_date')} <span className="text-warm-400 font-normal">{t('optional')}</span>
            </label>
            <input type="text" value={form.memoryDate}
              onChange={e => setForm(f => ({ ...f, memoryDate: e.target.value }))}
              className="field-input" placeholder={t('memory_date_ph')} />
          </div>

          <div>
            <label className="field-label">
              {t('memory_hints')} <span className="text-warm-400 font-normal">{t('memory_hints_sep')}</span>
            </label>
            <input type="text" value={form.memoryHints}
              onChange={e => setForm(f => ({ ...f, memoryHints: e.target.value }))}
              className="field-input" placeholder={t('memory_hints_ph')} />
          </div>

          <div>
            <label className="field-label">
              {t('memory_photo')} <span className="text-warm-400 font-normal">{t('memory_photo_max')}</span>
            </label>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="field-input text-sm" />
            {form.photo && (
              <img src={form.photo} alt="Preview" className="mt-2 w-24 h-24 rounded-2xl object-cover border-2 border-warm-200" />
            )}
          </div>

          <div className="flex gap-4">
            <Toggle active={form.isFavorite} onToggle={() => setForm(f => ({ ...f, isFavorite: !f.isFavorite }))}
              color="bg-yellow-400" label={t('memory_favourite')} />
            <Toggle active={form.usedInGames} onToggle={() => setForm(f => ({ ...f, usedInGames: !f.usedInGames }))}
              color="bg-primary-500" label={t('memory_in_games')} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Toggle({ active, onToggle, color, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div onClick={onToggle}
        className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${active ? color : 'bg-warm-300'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${active ? 'left-5' : 'left-0.5'}`} />
      </div>
      <span className="text-sm font-medium text-warm-700">{label}</span>
    </label>
  );
}

