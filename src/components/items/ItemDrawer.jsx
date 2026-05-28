import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Copy, Trash2, DollarSign, Check, Share2, ImagePlus, Loader, Sparkles, Tag, MapPin } from 'lucide-react';
import { auth } from '../../firebase.js';
import { useApp } from '../../App.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import CategoryBadge from '../categories/CategoryBadge.jsx';
import SoldModal from './SoldModal.jsx';
import { storage } from '../../services/storage.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
const LOCATIONS  = ['Living Room', 'Family Room', 'Bedroom', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4', 'Kitchen', 'Bathroom', 'Office', 'Garage', 'Basement', 'Attic', 'Master Closet', 'Storage'];

const LISTING_PLATFORMS = [
  { id: 'eBay',                 color: '#E53238' },
  { id: 'Facebook Marketplace', color: '#1877F2' },
  { id: 'Depop',                color: '#FF2D55' },
  { id: 'Poshmark',             color: '#C13584' },
  { id: 'OfferUp',              color: '#0BC47B' },
  { id: 'Mercari',              color: '#FF6600' },
  { id: 'Craigslist',           color: '#9c27b0' },
  { id: 'Vinted',               color: '#09B1BA' },
];

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

// Shared compress helper (mirrors PhotoUpload.jsx)
function compressImage(file) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(file), 8000);
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          clearTimeout(timer);
          const MAX = 900, scale = img.width > MAX ? MAX / img.width : 1;
          const canvas = document.createElement('canvas');
          canvas.width  = Math.round(img.width  * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => { URL.revokeObjectURL(url); resolve(blob || file); }, 'image/jpeg', 0.70);
        } catch { clearTimeout(timer); URL.revokeObjectURL(url); resolve(file); }
      };
      img.onerror = () => { clearTimeout(timer); URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    } catch { clearTimeout(timer); resolve(file); }
  });
}

export default function ItemDrawer({ item, onClose }) {
  const { updateItem, markSold, deleteItem, categories, homes, toast } = useApp();
  const isMobile = useIsMobile();
  const [photoDataUrl,   setPhotoDataUrl]   = useState(null);
  const [photoHovered,   setPhotoHovered]   = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showSoldModal,  setShowSoldModal]  = useState(false);
  const [showDelete,     setShowDelete]     = useState(false);
  const [showLabel,      setShowLabel]      = useState(false);
  const [copied,         setCopied]         = useState(false);
  const [generating,     setGenerating]     = useState(false);
  const [aiDescription,  setAiDescription]  = useState(null);
  const [tags,           setTags]           = useState(() => Array.isArray(item.tags) ? item.tags : []);
  const [tagInput,       setTagInput]       = useState('');
  const [platforms,       setPlatforms]       = useState(() => Array.isArray(item.listing_platforms) ? item.listing_platforms : []);
  const [quickSellPlatform, setQuickSellPlatform] = useState(null);
  const [suggestingPrice, setSuggestingPrice] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState(null);
  const [showPhotoMenu,   setShowPhotoMenu]   = useState(false);
  const fileInputRef     = useRef(null);
  const tagInputRef      = useRef(null);
  const photoLongTimer   = useRef(null);
  const photoLongFired   = useRef(false);
  // Per-platform chip long-press refs (keyed by platform id)
  const chipTimers       = useRef({});
  const chipLongFired    = useRef({});

  function commitTag(raw) {
    const tag = raw.trim().replace(/,/g, '').slice(0, 28);
    if (!tag || tags.includes(tag)) { setTagInput(''); return; }
    const next = [...tags, tag];
    setTags(next);
    updateItem(item.id, { tags: next });
    setTagInput('');
  }

  function removeTag(tag) {
    const next = tags.filter(t => t !== tag);
    setTags(next);
    updateItem(item.id, { tags: next });
  }

  function togglePlatform(platformId) {
    const next = platforms.includes(platformId)
      ? platforms.filter(p => p !== platformId)
      : [...platforms, platformId];
    setPlatforms(next);
    updateItem(item.id, { listing_platforms: next });
  }

  // Long-press on an active platform chip → open SoldModal pre-filled
  function onChipTouchStart(platformId) {
    chipLongFired.current[platformId] = false;
    chipTimers.current[platformId] = setTimeout(() => {
      chipLongFired.current[platformId] = true;
      navigator.vibrate?.(18);
      setQuickSellPlatform(platformId);
      setShowSoldModal(true);
    }, 480);
  }
  function onChipTouchEnd(platformId)  { clearTimeout(chipTimers.current[platformId]); }
  function onChipTouchMove(platformId) { clearTimeout(chipTimers.current[platformId]); }
  function onChipClick(platformId) {
    if (chipLongFired.current[platformId]) { chipLongFired.current[platformId] = false; return; }
    togglePlatform(platformId);
  }

  // Photo long-press → show action menu
  function onPhotoTouchStart() {
    photoLongFired.current = false;
    photoLongTimer.current = setTimeout(() => {
      photoLongFired.current = true;
      navigator.vibrate?.(15);
      setShowPhotoMenu(true);
    }, 480);
  }
  function onPhotoTouchEnd()  { clearTimeout(photoLongTimer.current); }
  function onPhotoTouchMove() { clearTimeout(photoLongTimer.current); }
  function onPhotoClick() {
    if (photoLongFired.current) { photoLongFired.current = false; return; }
    if (!uploadingPhoto) fileInputRef.current?.click();
  }

  async function suggestPrice() {
    setSuggestingPrice(true);
    setPriceSuggestion(null);
    try {
      const categoryName = categories.find(c => c.id === item.category_id)?.name;
      const res = await fetch('/api/suggest-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:      item.name,
          make:      item.make,
          model:     item.model,
          condition: item.condition,
          category:  categoryName,
        }),
      });
      const data = await res.json();
      if (data.suggested != null) {
        setPriceSuggestion(data);
      } else {
        toast?.(`Could not suggest price — ${data.error || 'unknown error'}`, 'error');
      }
    } catch {
      toast?.('Price suggestion failed — are you online?', 'error');
    } finally {
      setSuggestingPrice(false);
    }
  }

  const category = categories.find(c => c.id === item.category_id);

  useEffect(() => {
    setPhotoDataUrl(null);
    const src = item.photo_path || item.photo_url;
    if (src) storage.getPhotoDataUrl(src).then(setPhotoDataUrl);
  }, [item.photo_path, item.photo_url]);

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file);
      const savedPath  = await storage.copyPhotoToAppData(compressed);
      if (savedPath) {
        await updateItem(item.id, { photo_path: savedPath });
        const url = await storage.getPhotoDataUrl(savedPath);
        setPhotoDataUrl(url || savedPath);
        toast?.('Photo saved', 'success');
      }
    } catch (err) {
      console.error('Photo update failed:', err);
      toast?.('Photo failed to save', 'error');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  }

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

  async function generateDescription() {
    setGenerating(true);
    setAiDescription(null);
    try {
      const res = await fetch('/api/generate-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:         item.name,
          make:         item.make,
          model:        item.model,
          condition:    item.condition,
          notes:        item.notes,
          askingPrice:  item.asking_price,
          costPrice:    item.cost_price,
          category:     item.category_id,
        }),
      });
      const data = await res.json();
      if (data.description) {
        setAiDescription(data.description);
      } else {
        const detail = data.detail?.error?.message || data.error || 'Unknown error';
        toast?.(`AI error: ${detail}`, 'error');
        console.error('generate-listing response:', data);
      }
    } catch {
      toast?.('Generation failed — are you online?', 'error');
    } finally {
      setGenerating(false);
    }
  }

  function acceptDescription() {
    if (aiDescription) {
      update('notes', aiDescription);
      setAiDescription(null);
      toast?.('Description added to notes', 'success');
    }
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
        <div style={{ flex: 1, overflow: 'auto', padding: 20, paddingBottom: isMobile ? 'calc(24px + env(safe-area-inset-bottom))' : 24 }}>
          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />

          {/* Photo — tap to add/change, long-press for options */}
          <div
            onClick={onPhotoClick}
            onTouchStart={onPhotoTouchStart}
            onTouchEnd={onPhotoTouchEnd}
            onTouchMove={onPhotoTouchMove}
            onMouseEnter={() => setPhotoHovered(true)}
            onMouseLeave={() => setPhotoHovered(false)}
            style={{
              width: '100%', aspectRatio: '16/10',
              background: 'var(--bg-elevated)', borderRadius: 12,
              overflow: 'hidden', marginBottom: 20,
              cursor: 'pointer', position: 'relative',
              border: photoDataUrl ? 'none' : '2px dashed var(--border-subtle)',
            }}
          >
            {photoDataUrl ? (
              <>
                <img
                  src={photoDataUrl}
                  alt={item.name}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    transition: 'transform 250ms',
                    transform: (photoHovered || uploadingPhoto) ? 'scale(1.03)' : 'scale(1)',
                  }}
                />
                {/* Change-photo overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: (photoHovered || uploadingPhoto) ? 1 : 0,
                  transition: 'opacity 150ms',
                }}>
                  {uploadingPhoto
                    ? <Loader size={18} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                    : <><ImagePlus size={16} color="#fff" /><span style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>Change Photo</span></>
                  }
                </div>
              </>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {uploadingPhoto
                  ? <Loader size={24} color="var(--accent-gold)" style={{ animation: 'spin 1s linear infinite' }} />
                  : <>
                      <ImagePlus size={26} color="var(--text-tertiary)" />
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Tap to add photo</span>
                    </>
                }
              </div>
            )}

            {/* Photo long-press menu */}
            <AnimatePresence>
              {showPhotoMenu && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={e => { e.stopPropagation(); setShowPhotoMenu(false); }}
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.72)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 10,
                    zIndex: 10,
                  }}
                >
                  <button
                    onClick={e => { e.stopPropagation(); setShowPhotoMenu(false); fileInputRef.current?.click(); }}
                    style={photoMenuBtnStyle}
                  >
                    <ImagePlus size={15} /> Change Photo
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setShowPhotoMenu(false); shareItem(); }}
                    style={photoMenuBtnStyle}
                  >
                    <Share2 size={15} /> Share Item
                  </button>
                  {photoDataUrl && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        const a = document.createElement('a');
                        a.href = photoDataUrl;
                        a.download = `${item.name.replace(/[^a-z0-9]/gi, '_')}.jpg`;
                        a.click();
                        setShowPhotoMenu(false);
                      }}
                      style={photoMenuBtnStyle}
                    >
                      <Copy size={15} /> Save Photo
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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

            {/* Quantity */}
            <Field label="Quantity">
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, width: 'fit-content', overflow: 'hidden' }}>
                <button
                  onClick={() => update('quantity', Math.max(1, (item.quantity || 1) - 1))}
                  style={{ padding: '6px 13px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}
                >−</button>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', minWidth: 28, textAlign: 'center' }}>
                  {item.quantity || 1}
                </span>
                <button
                  onClick={() => update('quantity', (item.quantity || 1) + 1)}
                  style={{ padding: '6px 13px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}
                >+</button>
              </div>
              {(item.quantity || 1) > 1 && item.asking_price > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {item.quantity} × {fmt(item.asking_price)} = <span style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt((item.quantity || 1) * item.asking_price)}</span> total
                </div>
              )}
            </Field>

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

            {/* AI Price Suggest + Platform Tracker — available items only */}
            {item.status !== 'sold' && (
              <>
                {/* Suggest price pill */}
                <div style={{ marginTop: -4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={suggestPrice}
                    disabled={suggestingPrice}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '4px 11px', borderRadius: 20,
                      border: '1px solid rgba(212,168,83,0.28)',
                      background: 'transparent',
                      color: suggestingPrice ? 'var(--text-tertiary)' : 'var(--accent-gold)',
                      fontSize: 11, cursor: 'pointer',
                      opacity: suggestingPrice ? 0.6 : 1,
                      transition: 'opacity 100ms',
                    }}
                  >
                    {suggestingPrice
                      ? <><Loader size={10} style={{ animation: 'spin 1s linear infinite' }} /> Thinking…</>
                      : <><Sparkles size={10} /> AI Suggest Price</>
                    }
                  </button>
                </div>

                {/* Price suggestion result */}
                <AnimatePresence>
                  {priceSuggestion && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      style={{
                        background: 'rgba(212,168,83,0.05)',
                        border: '1px solid rgba(212,168,83,0.2)',
                        borderRadius: 10,
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Sparkles size={11} color="var(--accent-gold)" />
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-gold)' }}>
                            Price Suggestion
                          </span>
                        </div>
                        <button onClick={() => setPriceSuggestion(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0, display: 'flex' }}>
                          <X size={12} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 6 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--accent-gold)' }}>
                          {fmt(priceSuggestion.suggested)}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          range {fmt(priceSuggestion.low)} – {fmt(priceSuggestion.high)}
                        </span>
                      </div>
                      {priceSuggestion.reasoning && (
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.55 }}>
                          {priceSuggestion.reasoning}
                        </p>
                      )}
                      <button
                        onClick={() => {
                          update('asking_price', priceSuggestion.suggested);
                          setPriceSuggestion(null);
                          toast?.(`Asking price set to ${fmt(priceSuggestion.suggested)}`, 'success');
                        }}
                        style={{
                          padding: '6px 16px', borderRadius: 8, border: 'none',
                          background: 'var(--accent-gold)', color: '#000',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        Apply {fmt(priceSuggestion.suggested)}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Listed On platforms */}
                <Field label="Listed On">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 2 }}>
                    {LISTING_PLATFORMS.map(p => {
                      const active = platforms.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => onChipClick(p.id)}
                          onTouchStart={() => onChipTouchStart(p.id)}
                          onTouchEnd={() => onChipTouchEnd(p.id)}
                          onTouchMove={() => onChipTouchMove(p.id)}
                          title={active && item.status !== 'sold' ? `Long-press to sell on ${p.id}` : p.id}
                          style={{
                            padding: '4px 11px', borderRadius: 20,
                            fontSize: 11, fontWeight: active ? 600 : 400,
                            border: `1px solid ${active ? p.color + '88' : 'var(--border-subtle)'}`,
                            background: active ? `${p.color}22` : 'transparent',
                            color: active ? p.color : 'var(--text-tertiary)',
                            cursor: 'pointer',
                            transition: 'all 100ms',
                          }}
                        >
                          {p.id}
                        </button>
                      );
                    })}
                  </div>
                  {platforms.length > 0 && item.status !== 'sold' && (
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      Long-press an active platform to mark sold there
                    </div>
                  )}
                </Field>
              </>
            )}

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

            {/* AI description preview */}
            <AnimatePresence>
              {aiDescription && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  style={{
                    background: 'rgba(212,168,83,0.05)',
                    border: '1px solid rgba(212,168,83,0.25)',
                    borderRadius: 10,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Sparkles size={12} color="var(--accent-gold)" />
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-gold)' }}>
                      AI Generated
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, marginBottom: 12, whiteSpace: 'pre-wrap' }}>
                    {aiDescription}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={acceptDescription}
                      style={{
                        flex: 1, padding: '7px', borderRadius: 7, border: 'none',
                        background: 'var(--accent-gold)', color: '#000',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}
                    >
                      <Check size={12} /> Use This
                    </button>
                    <button
                      onClick={generateDescription}
                      style={{
                        padding: '7px 12px', borderRadius: 7,
                        border: '1px solid rgba(212,168,83,0.3)',
                        background: 'transparent', color: 'var(--accent-gold-dim)',
                        fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => setAiDescription(null)}
                      style={{
                        padding: '7px 10px', borderRadius: 7,
                        border: '1px solid var(--border-subtle)',
                        background: 'transparent', color: 'var(--text-tertiary)',
                        fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      Discard
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tags */}
            <Field label="Tags">
              <div
                onClick={() => tagInputRef.current?.focus()}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  padding: '6px 8px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  minHeight: 38,
                  alignItems: 'center',
                  cursor: 'text',
                  transition: 'border-color 100ms',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-gold-dim)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
              >
                {tags.map(tag => (
                  <div key={tag} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    background: 'rgba(255,203,116,0.12)',
                    border: '1px solid rgba(255,203,116,0.22)',
                    borderRadius: 20,
                    padding: '3px 7px 3px 9px',
                    fontSize: 11,
                    color: 'var(--accent-gold)',
                    fontWeight: 500,
                    lineHeight: 1,
                  }}>
                    {tag}
                    <button
                      onClick={e => { e.stopPropagation(); removeTag(tag); }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '0 0 0 2px', display: 'flex', alignItems: 'center',
                        color: 'rgba(255,203,116,0.55)', lineHeight: 1,
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <input
                  ref={tagInputRef}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
                      e.preventDefault();
                      commitTag(tagInput);
                    }
                    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                      removeTag(tags[tags.length - 1]);
                    }
                  }}
                  onBlur={() => tagInput.trim() && commitTag(tagInput)}
                  placeholder={tags.length === 0 ? 'Add tags…' : ''}
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    fontSize: 12, color: 'var(--text-primary)',
                    minWidth: 80, flex: 1, padding: '3px 2px',
                  }}
                />
              </div>
              {tags.length === 0 && (
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>
                  Press Enter or comma to add a tag
                </div>
              )}
            </Field>

            <Field label="Listing URL">
              <EditableField value={item.listing_url} onChange={v => update('listing_url', v)} placeholder="https://…" />
            </Field>

            {/* ── Location in Home ── */}
            <Field label="Location in Home">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <MapPin size={12} color={item.location ? 'var(--accent-gold)' : 'var(--text-tertiary)'} style={{ flexShrink: 0 }} />
                <EditableField
                  value={item.location}
                  onChange={v => update('location', v?.trim() || null)}
                  placeholder="e.g. Garage, Bedroom 2…"
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {LOCATIONS.map(l => {
                  const active = item.location === l;
                  return (
                    <button
                      key={l}
                      onClick={() => update('location', active ? null : l)}
                      style={{
                        padding:    '3px 10px',
                        borderRadius: 20,
                        fontSize:   10,
                        fontWeight: active ? 600 : 400,
                        cursor:     'pointer',
                        border:     `1px solid ${active ? 'rgba(255,203,116,0.5)' : 'var(--border-subtle)'}`,
                        background: active ? 'rgba(255,203,116,0.1)' : 'transparent',
                        color:      active ? 'var(--accent-gold)' : 'var(--text-tertiary)',
                        transition: 'all 80ms',
                      }}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* ── Property (only shown when multiple homes exist) ── */}
            {homes?.length > 1 && (
              <Field label="Property">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {homes.map(h => {
                    const firstHomeId = homes[0]?.id;
                    const itemHome = item.home_id || firstHomeId;
                    const active   = itemHome === h.id;
                    return (
                      <button
                        key={h.id}
                        onClick={() => update('home_id', h.id)}
                        style={{
                          padding: '3px 10px', borderRadius: 20,
                          fontSize: 10, fontWeight: active ? 600 : 400,
                          cursor: 'pointer',
                          border: `1px solid ${active ? 'rgba(255,203,116,0.5)' : 'var(--border-subtle)'}`,
                          background: active ? 'rgba(255,203,116,0.1)' : 'transparent',
                          color: active ? 'var(--accent-gold)' : 'var(--text-tertiary)',
                          transition: 'all 80ms',
                        }}
                      >
                        {h.name}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}

            {/* ── Delete ── */}
            <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              {!showDelete ? (
                <button
                  onClick={() => setShowDelete(true)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 10, cursor: 'pointer',
                    border: '1px solid rgba(224,92,92,0.2)',
                    background: 'rgba(224,92,92,0.04)',
                    color: 'var(--accent-red)', fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Trash2 size={14} /> Delete Item
                </button>
              ) : (
                <div style={{
                  background: 'rgba(224,92,92,0.05)',
                  border: '1px solid rgba(224,92,92,0.2)',
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-red)', marginBottom: 4 }}>Delete this item?</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>This can't be undone.</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowDelete(false)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                      Cancel
                    </button>
                    <button onClick={() => deleteItem(item.id)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'var(--accent-red)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
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
          <button
            onClick={generateDescription}
            disabled={generating}
            style={{
              ...secondaryBtn,
              borderColor: 'rgba(212,168,83,0.35)',
              color: generating ? 'var(--text-tertiary)' : 'var(--accent-gold)',
              background: 'rgba(212,168,83,0.06)',
              opacity: generating ? 0.7 : 1,
            }}
          >
            {generating
              ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
              : <><Sparkles size={13} /> Write Description</>
            }
          </button>
          <button onClick={shareItem} style={secondaryBtn}>
            <Share2 size={14} /> Share
          </button>
          <button onClick={copyListingText} style={secondaryBtn}>
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
          </button>
          <button onClick={() => setShowLabel(true)} style={secondaryBtn}>
            <Tag size={14} /> Label
          </button>
          {item.listing_url && (
            <button onClick={() => storage.openExternal(item.listing_url)} style={secondaryBtn}>
              <ExternalLink size={14} /> Open
            </button>
          )}
        </div>
      </motion.aside>

      {showSoldModal && (
        <SoldModal
          item={item}
          defaultPlatform={quickSellPlatform || ''}
          onClose={() => { setShowSoldModal(false); setQuickSellPlatform(null); }}
          onConfirm={async (saleData) => {
            await markSold(item.id, saleData);
            setShowSoldModal(false);
            setQuickSellPlatform(null);
          }}
        />
      )}

      {showLabel && (
        <PrintLabelModal item={item} onClose={() => setShowLabel(false)} />
      )}
    </>
  );
}

// ── Print Label Modal ──────────────────────────────────────────────────────────
function PrintLabelModal({ item, onClose }) {
  const uid      = auth?.currentUser?.uid;
  const shopUrl  = uid ? `${window.location.origin}/shop/${uid}` : window.location.origin;
  const qrSrc    = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&format=png&data=${encodeURIComponent(shopUrl)}`;

  function printLabel() {
    // Inject print-only CSS that hides everything except the label
    const style = document.createElement('style');
    style.id    = '__stash_print_style';
    style.textContent = `
      @media print {
        body > * { visibility: hidden !important; }
        #stash-print-label,
        #stash-print-label * { visibility: visible !important; }
        #stash-print-label {
          position: fixed !important;
          top: 0 !important; left: 0 !important;
          width: 100vw !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
    // Clean up after print dialog closes
    setTimeout(() => document.getElementById('__stash_print_style')?.remove(), 1000);
  }

  const priceText = item.asking_price > 0
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(item.asking_price)
    : 'Make offer';

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{   opacity: 0, scale: 0.94,  y: 12 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 201,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, pointerEvents: 'none',
        }}
      >
        <div style={{
          pointerEvents: 'auto',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
          width: '100%', maxWidth: 360,
          padding: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Print Label</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={16} color="var(--text-secondary)" />
            </button>
          </div>

          {/* Label preview */}
          <div
            id="stash-print-label"
            style={{
              background: '#fff',
              borderRadius: 10,
              padding: '16px 18px',
              display: 'flex',
              gap: 14,
              alignItems: 'center',
              marginBottom: 16,
              border: '1px solid #e5e7eb',
            }}
          >
            {/* QR code */}
            <img
              src={qrSrc}
              alt="QR code"
              width={80}
              height={80}
              style={{ flexShrink: 0, borderRadius: 4 }}
            />

            {/* Item info */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                fontWeight: 700, fontSize: 14,
                color: '#111', lineHeight: 1.3,
                marginBottom: 4,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {item.name}
              </div>
              {(item.make || item.model) && (
                <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                  {[item.make, item.model].filter(Boolean).join(' ')}
                </div>
              )}
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 20, color: '#111' }}>
                {priceText}
              </div>
              {item.condition && (
                <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  {item.condition}
                </div>
              )}
              <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: '#9ca3af', marginTop: 6 }}>
                Stash
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 16, lineHeight: 1.5 }}>
            QR code links to your public shop. Scan to browse all available items.
          </div>

          <button
            onClick={printLabel}
            style={{
              width: '100%', padding: '11px', borderRadius: 10, border: 'none',
              background: 'var(--accent-gold)', color: '#000',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Tag size={14} /> Print Label
          </button>
        </div>
      </motion.div>
    </>
  );
}

const selectStyle      = { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '5px 8px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', width: '100%' };
const primaryBtn       = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-green)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const secondaryBtn     = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' };
const photoMenuBtnStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', backdropFilter: 'blur(8px)', width: 180, justifyContent: 'center' };
