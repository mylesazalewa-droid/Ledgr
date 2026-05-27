import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Cpu, Zap, Home, Shirt, Wrench, Star, Bike, Box, AlertTriangle } from 'lucide-react';
import { useApp } from '../../App.jsx';

const ICON_OPTIONS = ['Cpu', 'Zap', 'Home', 'Shirt', 'Wrench', 'Star', 'Bike', 'Box'];
const ICON_MAP = { Cpu, Zap, Home, Shirt, Wrench, Star, Bike, Box };
const COLOR_PRESETS = ['#5b8ef0', '#d4a853', '#7c6fcd', '#4caf7d', '#e05c5c', '#f07c5b', '#5bcfcf', '#888891'];
const BUILT_IN = ['cat_electronics','cat_appliances','cat_furniture','cat_clothing','cat_tools','cat_collectibles','cat_sports','cat_other'];

export default function CategoryManager() {
  const { categories, addCategory, deleteCategory, items } = useApp();
  const [showForm, setShowForm]         = useState(false);
  const [newName,  setNewName]          = useState('');
  const [newIcon,  setNewIcon]          = useState('Box');
  const [newColor, setNewColor]         = useState('#888891');
  const [confirmId, setConfirmId]       = useState(null);

  async function handleAdd() {
    if (!newName.trim()) return;
    await addCategory({ name: newName.trim(), icon: newIcon, color: newColor });
    setNewName(''); setNewIcon('Box'); setNewColor('#888891');
    setShowForm(false);
  }

  function handleDeleteClick(catId) {
    setConfirmId(catId);
  }

  async function handleConfirmDelete() {
    await deleteCategory(confirmId);
    setConfirmId(null);
  }

  const confirmCat = categories.find(c => c.id === confirmId);
  const affectedCount = confirmCat
    ? (items || []).filter(i => i.category_id === confirmId).length
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {categories.map(cat => {
        const Icon = ICON_MAP[cat.icon] || Box;
        const isBuiltIn = BUILT_IN.includes(cat.id);
        return (
          <div
            key={cat.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: 'var(--bg-elevated)',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ color: cat.color }}><Icon size={15} /></span>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{cat.name}</span>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
            {!isBuiltIn && (
              <button
                onClick={() => handleDeleteClick(cat.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-tertiary)' }}
                title="Delete category"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        );
      })}

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmId && confirmCat && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{
              padding: '14px 16px',
              background: 'rgba(224,92,92,0.07)',
              borderRadius: 10,
              border: '1px solid rgba(224,92,92,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertTriangle size={15} color="var(--accent-red)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Delete "{confirmCat.name}"?
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                  {affectedCount > 0
                    ? `${affectedCount} item${affectedCount !== 1 ? 's' : ''} will be moved to Other.`
                    : 'This category has no items.'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmId(null)}
                style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'var(--accent-red)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showForm ? (
        <div style={{
          padding: 14,
          background: 'var(--bg-elevated)',
          borderRadius: 10,
          border: '1px solid var(--border-accent)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowForm(false); }}
            placeholder="Category name"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              padding: '7px 10px',
              fontSize: 13,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ICON_OPTIONS.map(name => {
              const I = ICON_MAP[name];
              return (
                <button
                  key={name}
                  onClick={() => setNewIcon(name)}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: `1px solid ${newIcon === name ? 'var(--accent-gold-dim)' : 'var(--border-subtle)'}`,
                    background: newIcon === name ? 'rgba(212,168,83,0.12)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    color: newColor,
                  }}
                >
                  <I size={14} />
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {COLOR_PRESETS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                style={{
                  width: 22, height: 22,
                  borderRadius: '50%',
                  background: c,
                  border: newColor === c ? '2px solid white' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleAdd} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: 'var(--accent-gold)', color: '#0a0a0b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 14px',
            borderRadius: 8,
            border: '1px dashed var(--border-subtle)',
            background: 'transparent',
            color: 'var(--text-tertiary)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <Plus size={13} /> Add Category
        </button>
      )}
    </div>
  );
}
