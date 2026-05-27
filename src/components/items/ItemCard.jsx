import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Trash2, Eye, Check } from 'lucide-react';
import { useApp } from '../../App.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import SoldModal from './SoldModal.jsx';
import { storage } from '../../services/storage.js';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

// ---- Right-click context menu (rendered via portal to avoid clip issues) ----
function ContextMenu({ x, y, item, onClose, onSell, onOpen, onDelete }) {
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    // Small delay so the triggering click doesn't immediately close
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [onClose]);

  // Clamp to viewport
  const menuW = 170;
  const menuH = item.status !== 'sold' ? 118 : 88;
  const cx = Math.min(x, window.innerWidth  - menuW - 8);
  const cy = Math.min(y, window.innerHeight - menuH - 8);

  return createPortal(
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      style={{
        position: 'fixed',
        top: cy,
        left: cx,
        zIndex: 9999,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        padding: 4,
        minWidth: menuW,
        boxShadow: 'var(--shadow-float)',
      }}
    >
      {item.status !== 'sold' && (
        <MenuItem icon={DollarSign} label="Quick Sell" color="var(--accent-green)" onClick={onSell} />
      )}
      <MenuItem icon={Eye} label="Open Details" onClick={onOpen} />
      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '3px 0' }} />
      <MenuItem icon={Trash2} label="Delete" color="var(--accent-red)" onClick={onDelete} />
    </motion.div>,
    document.body
  );
}

function MenuItem({ icon: Icon, label, color, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        width: '100%',
        padding: '7px 10px',
        borderRadius: 7,
        border: 'none',
        background: hovered ? 'var(--bg-surface)' : 'transparent',
        color: color || 'var(--text-primary)',
        fontSize: 12,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

// ---- Delete confirmation ----
function DeleteConfirm({ onConfirm, onCancel }) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onCancel()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 14,
          padding: '22px 24px',
          width: 320,
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-float)',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Delete this item?</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 18 }}>
          This can't be undone. The item and its photo will be permanently removed.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel}  style={cancelBtn}>Cancel</button>
          <button onClick={onConfirm} style={deleteBtn}>Delete</button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

const cancelBtn = { padding: '7px 14px', borderRadius: 7, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' };
const deleteBtn = { padding: '7px 14px', borderRadius: 7, border: 'none', background: 'var(--accent-red)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' };

// ---- Main card ----
export default function ItemCard({ item, index = 0, bulkMode = false, selected = false, onToggleSelect }) {
  const { setSelectedItem, categories, deleteItem, markSold } = useApp();

  const [hovered,      setHovered]      = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [menu,         setMenu]         = useState(null); // { x, y }
  const [showSell,     setShowSell]     = useState(false);
  const [showDelete,   setShowDelete]   = useState(false);
  const [visible,      setVisible]      = useState(false);
  const cardRef = useRef(null);

  const category = categories.find(c => c.id === item.category_id);

  // Age badge
  const daysListed = item.status !== 'sold' && item.added_at
    ? Math.floor((Date.now() - new Date(item.added_at).getTime()) / 86400000)
    : null;
  const ageColor = daysListed >= 90 ? 'var(--accent-red)'
    : daysListed >= 60 ? 'var(--accent-gold)'
    : 'var(--text-tertiary)';

  // Lazy load: only fetch photo once the card is visible on screen
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { rootMargin: '120px' }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const src = item.photo_path || item.photo_url;
    if (!src) return;
    storage.getPhotoDataUrl(src).then(url => {
      if (!cancelled) setPhotoDataUrl(url);
    });
    return () => { cancelled = true; };
  }, [visible, item.photo_path, item.photo_url]);

  function onContextMenu(e) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }

  const closeMenu = useCallback(() => setMenu(null), []);

  return (
    <>
      <motion.div
        ref={cardRef}
        onClick={() => bulkMode ? onToggleSelect?.(item.id) : setSelectedItem(item)}
        onContextMenu={bulkMode ? undefined : onContextMenu}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
        whileHover={{ y: -3, transition: { duration: 0.08 } }}
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-card)',
          border: `1px solid ${hovered ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
          overflow: 'hidden',
          cursor: 'pointer',
          position: 'relative',
          boxShadow: hovered
            ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px var(--border-accent)'
            : 'var(--shadow-card)',
          transition: 'border-color 80ms, box-shadow 80ms',
        }}
      >
        {/* Category color bar */}
        {category && (
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: category.color, zIndex: 1 }} />
        )}

        {/* Photo */}
        <div style={{ width: '100%', aspectRatio: '16/10', background: 'var(--bg-elevated)', overflow: 'hidden', position: 'relative' }}>
          {photoDataUrl ? (
            <img
              src={photoDataUrl}
              alt={item.name}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transition: 'transform 300ms ease',
                transform: hovered ? 'scale(1.04)' : 'scale(1)',
              }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 26 }}>
              📦
            </div>
          )}

          {/* Age badge */}
          {daysListed !== null && daysListed >= 14 && (
            <div style={{
              position: 'absolute', top: 6, right: 6, zIndex: 2,
              background: 'rgba(0,0,0,0.65)',
              color: ageColor,
              fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
              padding: '2px 6px', borderRadius: 20,
              backdropFilter: 'blur(4px)',
            }}>
              {daysListed}d
            </div>
          )}

          {/* Quantity badge */}
          {(item.quantity || 1) > 1 && (
            <div style={{
              position: 'absolute', bottom: 6, right: 6, zIndex: 2,
              background: 'rgba(212,168,83,0.9)',
              color: '#0a0a0b',
              fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
              padding: '2px 6px', borderRadius: 20,
              backdropFilter: 'blur(4px)',
            }}>
              ×{item.quantity}
            </div>
          )}

          {/* Bulk selection checkbox */}
          {bulkMode && (
            <div style={{
              position: 'absolute', top: 6, left: 6, zIndex: 3,
              width: 22, height: 22, borderRadius: 6,
              border: `2px solid ${selected ? 'var(--accent-gold)' : 'rgba(255,255,255,0.5)'}`,
              background: selected ? 'var(--accent-gold)' : 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 120ms',
            }}>
              {selected && <Check size={12} color="#0a0a0b" strokeWidth={3} />}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '10px 14px 12px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
            {item.name}
          </div>
          {(item.make || item.model) && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 8 }}>
              {[item.make, item.model].filter(Boolean).join(' · ')}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              fontWeight: 500,
              color: item.status === 'sold' ? 'var(--text-secondary)' : 'var(--accent-gold)',
            }}>
              {item.status === 'sold' ? fmt(item.sold_price) : fmt(item.asking_price)}
            </span>
            <StatusBadge status={item.status} />
          </div>
        </div>
      </motion.div>

      {/* Context menu */}
      <AnimatePresence>
        {menu && (
          <ContextMenu
            key="ctx"
            x={menu.x}
            y={menu.y}
            item={item}
            onClose={closeMenu}
            onSell={()  => { closeMenu(); setShowSell(true); }}
            onOpen={()  => { closeMenu(); setSelectedItem(item); }}
            onDelete={() => { closeMenu(); setShowDelete(true); }}
          />
        )}
      </AnimatePresence>

      {/* Quick sell */}
      {showSell && (
        <SoldModal
          item={item}
          onClose={() => setShowSell(false)}
          onConfirm={async (saleData) => {
            await markSold(item.id, saleData);
            setShowSell(false);
          }}
        />
      )}

      {/* Delete confirm */}
      <AnimatePresence>
        {showDelete && (
          <DeleteConfirm
            key="del"
            onCancel={() => setShowDelete(false)}
            onConfirm={() => { deleteItem(item.id); setShowDelete(false); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
