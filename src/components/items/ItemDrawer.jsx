import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Copy, Trash2, DollarSign, Check, Share2 } from 'lucide-react';
import { useApp } from '../../App.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import CategoryBadge from '../categories/CategoryBadge.jsx';
import SoldModal from './SoldModal.jsx';
import { storage } from '../../services/storage.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function EditableField({ value, onChange, placeholder, style }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value || '');

  function commit() {
    setEditing(false);
    if (draft !== (value || '')) onChange(draft);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter')  commit();
          if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); }
        }}
        placeholder={placeholder}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--accent-gold-dim)',
          borderRadius: 6,
          padding: '5px 8px',
          fontSize: 13,
          color: 'var(--text-primary)',
          outline: 'none',
          width: '100%',
          ...style,
        }}
      />
    );
  }

  return (
    <div
      onClick={() => { setDraft(value || ''); setEditing(true); }}
      style={{
        fontSize: 13,
        color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
        padding: '4px 0',
        cursor: 'text',
        borderBottom: '1px solid transparent',
        transition: 'border-color 100ms',
        ...style,
      }}
      onMouseEnter={e => e.currentTarget.style.borderBottomColor = 'var(--border-subtle)'}
      onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}
    >
      {value || placeholder || '—'}
    </div>
  );
}

function PriceField({ label, value, onChange, color }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');

  function commit() {
    setEditing(false);
    const v = parseFloat(draft);
    if (!isNaN(v) && v !== value) onChange(v);
  }

  if (editing) {
    return (
      <Field label={label}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--accent-gold-dim)', padding: '0 8px' }}>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12, fontFamily: 'var(--font-mono)', marginRight: 2 }}>$</span>
          <input
            autoFocus
            type="number"
            min="0"
            step="0.01"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 14, color: color || 'var(--accent-gold)', fontFamily: 'var(--font-mono)', fontWeight: 600, padding: '5px 0', width: '100%' }}
          />
        </div>
      </Field>
    );
  }

  return (
    <Field label={label}>
      <div
        onClick={() => { setDraft(value > 0 ? String(value) : ''); setEditing(true); }}
        style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-mono)', color: color || 'var(--accent-gold)', padding: '4px 0', cursor: 'text', borderBottom: '1px solid transparent', transition: 'border-color 100ms' }}
        onMouseEnter={e => e.currentTarget.style.borderBottomColor = 'var(--border-subtle)'}
        onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}
      >
        {value > 0 ? fmt(value) : '—'}
      </div>
    </Field>
  );
}

export default function ItemDrawer({ item, onClose }) {
  const { updateItem, markSold, deleteItem, categories, toast } = useApp();
  const isMobile = useIsMobile();
  const [photoDataUrl,  setPhotoDataUrl]  = useState(null);
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [showDelete,    setShowDelete]    = useState(false);
  const [copied,        setCopied]        = useState(false);

  const category = categories.find(c => c.id === item.category_id);

  useEffect(() => {
    setPhotoDataUrl(null);
    const src = item.photo_path || item.photo_url;
    if (src) storage.getPhotoDataUrl(src).then(setPhotoDataUrl);
  }, [item.photo_path, item.photo_url]);

  function update(field, value) {
    if (field === 'asking_price' && item.asking_price && item.asking_price !== value) {
      const history = Array.isArray(item.price_history) ? item.price_history : [];
      updateItem(item.id, {
        asking_price: value,
        price_history: [...history, { price: item.asking_price, date: new Date().toISOString() }],
      });
    } else {
      updateItem(item.id, { [field]: value });
    }
  }

  async function shareItem() {
    const lines = [
      item.name,
      [item.make, item.model].filter(Boolean).join(' '),
      `Condition: ${item.condition || 'Good'}`,
      item.asking_price ? `Asking: ${fmt(item.asking_price)}` : '',
      item.notes || '',
      item.listing_url || '',
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      try { await navigator.share({ title: item.name, text: lines }); } catch {}
    } else {
      navigator.clipboard.writeText(lines);
      toast?.('Copied to clipboard', 'success');
    }
  }

  function copyListingText() {
    const lines = [
      item.name,
      [item.make, item.model].filter(Boolean).join(' '),
      `Condition: ${item.condition || 'Good'}`,
      item.asking_price ? `Asking: ${fmt(item.asking_price)}` : '',
      item.notes || '',
      item.listing_url ? `Listing: ${item.listing_url}` : '',
    ].filter(Boolean);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast?.('Listing text copied', 'success');
  }

  const profit = item.status === 'sold' && item.cost_price > 0
    ? item.sold_price - item.cost_price : null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }}
      />

      {/* Drawer */}
      <motion.aside
        initial={isMobile ? { y: '100%' } : { x: '100%' }}
        animate={isMobile ? { y: 0 } : { x: 0 }}
        exit={isMobile ? { y: '100%' } : { x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        style={isMobile ? {
          position: 'fixed', left: 0, right: 0, bottom: 0,
          top: 'env(safe-area-inset-top)',
          background: 'var(--bg-surface)',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTop: '1px solid var(--border-subtle)',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-float)',
          overflow: 'hidden',
        } : {
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 480,
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-subtle)',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-float)',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle (mobile only) */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-subtle)' }} />
          </div>
        )}

        {/* Header */}
        <div style={{ padding: isMobile ? '10px 20px 14px' : '38px 20px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusBadge status={item.status} size="lg" />
            {category && <CategoryBadge category={category} size="lg" />}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {/* Photo */}
          <div style={{ width: '100%', aspectRatio: '16/10', background: 'var(--bg-elevated)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
            {photoDataUrl
              ? <img src={photoDataUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📦</div>
            }
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Name">
              <EditableField
                value={item.name}
                onChange={v => update('name', v)}
                placeholder="Item name"
                style={{ fontSize: 18, fontWeight: 600 }}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Make"><EditableField value={item.make}  onChange={v => update('make', v)}  placeholder="Brand" /></Field>
              <Field label="Model"><EditableField value={item.model} onChange={v => update('model', v)} placeholder="Model" /></Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Condition">
                <select value={item.condition || 'Good'} onChange={e => update('condition', e.target.value)} style={selectStyle}>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Status">
                {item.status !== 'sold' ? (
                  <select value={item.status} onChange={e => update('status', e.target.value)} style={selectStyle}>
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                  </select>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--accent-red)', padding: '4px 0' }}>Sold</div>
                )}
              </Field>
            </div>

            {/* Pricing grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <PriceField
                label="Cost Paid"
                value={item.cost_price || 0}
                onChange={v => update('cost_price', v)}
                color="var(--text-secondary)"
              />
              <PriceField
                label="Est. Value"
                value={item.est_value || 0}
                onChange={v => update('est_value', v)}
                color="var(--text-secondary)"
              />
              <PriceField
                label="Asking Price"
                value={item.asking_price || 0}
                onChange={v => update('asking_price', v)}
                color="var(--accent-gold)"
              />
            </div>

            {/* Price history */}
            {Array.isArray(item.price_history) && item.price_history.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                  Price History
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[...item.price_history].reverse().map((entry, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{fmt(entry.price)}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sold info */}
            {item.status === 'sold' && (
              <div style={{
                padding: '12px 14px',
                background: 'rgba(76,175,125,0.07)',
                borderRadius: 10,
                border: '1px solid rgba(76,175,125,0.15)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Sold For</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color: 'var(--accent-green)' }}>{fmt(item.sold_price)}</div>
                </div>
                {profit !== null && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Profit</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color: profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {profit >= 0 ? '+' : ''}{fmt(profit)}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Platform</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item.sold_platform || '—'}</div>
                </div>
              </div>
            )}

            <Field label="Notes">
              <textarea
                value={item.notes || ''}
                onChange={e => update('notes', e.target.value)}
                rows={3}
                placeholder="Notes about this item…"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'var(--font-body)',
                  width: '100%',
                }}
              />
            </Field>

            <Field label="Listing URL">
              <EditableField value={item.listing_url} onChange={v => update('listing_url', v)} placeholder="https://…" />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: 8,
          flexShrink: 0,
          background: 'var(--bg-surface)',
          flexWrap: 'wrap',
        }}>
          {item.status !== 'sold' && (
            <button onClick={() => setShowSoldModal(true)} style={primaryBtn}>
              <DollarSign size={14} /> Mark Sold
            </button>
          )}
          <button onClick={shareItem} style={secondaryBtn}>
            <Share2 size={14} /> Share
          </button>
          <button onClick={copyListingText} style={secondaryBtn}>
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
          </button>
          {item.listing_url && (
            <button onClick={() => storage.openExternal(item.listing_url)} style={secondaryBtn}>
              <ExternalLink size={14} /> Open
            </button>
          )}
          <div style={{ flex: 1 }} />
          {!showDelete ? (
            <button onClick={() => setShowDelete(true)} style={dangerBtn} title="Delete item">
              <Trash2 size={14} />
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--accent-red)' }}>Delete?</span>
              <button onClick={() => setShowDelete(false)} style={{ ...secondaryBtn, fontSize: 11, padding: '5px 10px' }}>No</button>
              <button
                onClick={() => deleteItem(item.id)}
                style={{ ...dangerBtn, padding: '5px 12px', fontSize: 11 }}
              >
                Yes, delete
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {showSoldModal && (
        <SoldModal
          item={item}
          onClose={() => setShowSoldModal(false)}
          onConfirm={async (saleData) => {
            await markSold(item.id, saleData);
            setShowSoldModal(false);
          }}
        />
      )}
    </>
  );
}

const selectStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '5px 8px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', width: '100%' };
const primaryBtn  = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-green)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const secondaryBtn = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' };
const dangerBtn   = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(224,92,92,0.2)', background: 'rgba(224,92,92,0.08)', color: 'var(--accent-red)', cursor: 'pointer' };
