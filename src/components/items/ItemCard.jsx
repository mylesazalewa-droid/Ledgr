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
  const cardRef          = useRef(null);
  const longPressTimer   = useRef(null);
  const longPressDidFire = useRef(false);

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

  // Long-press on mobile — mirrors right-click context menu
  function onTouchStart(e) {
    if (bulkMode) return;
    longPressDidFire.current = false;
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      longPressDidFire.current = true;
      navigator.vibrate?.(12);
      setMenu({ x: touch.clientX, y: touch.clientY });
    }, 480);
  }
  function onTouchEnd()  { clearTimeout(longPressTimer.current); }
  function onTouchMove() { clearTimeout(longPressTimer.current); }

  function handleClick() {
    if (longPressDidFire.current) { longPressDidFire.current = false; return; }
    if (bulkMode) { onToggleSelect?.(item.id); } else { setSelectedItem(item); }
  }

  const closeMenu = useCallback(() => setMenu(null), []);

  return (
    <>
      <motion.div
        ref={cardRef}
        onClick={handleClick}
        onContextMenu={bulkMode ? undefined : onContextMenu}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchMove}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
        whileHover={{ y: -3, transition: { duration: 0.08 } }}
        whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-card)',
          border: `1px solid ${
            hovered
              ? (category ? category.color + '66' : 'var(--border-accent)')
              : 'var(--border-subtle)'
          }`,
          overflow: 'hidden',
          cursor: 'pointer',
          position: 'relative',
          boxShadow: hovered
            ? `0 12px 40px rgba(0,0,0,0.65)${category ? `, 0 0 22px ${category.color}22` : ''}`
            : 'var(--shadow-card)',
          transition: 'border-color 80ms, box-shadow 80ms',
        }}
      >
        {/* Photo — 3:2 ratio, photo-first layout */}
        <div style={{ width: '100%', aspectRatio: '3/2', background: 'var(--bg-elevated)', overflow: 'hidden', position: 'relative' }}>

          {/* Category gradient stripe — top edge */}
          {category && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3, zIndex: 3,
              background: `linear-gradient(90deg, ${category.color} 0%, ${category.color}55 55%, transparent 100%)`,
            }} />
          )}

          {photoDataUrl ? (
            <img
              src={photoDataUrl}
              alt={item.name}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transition: 'transform 320ms ease',
                transform: hovered ? 'scale(1.05)' : 'scale(1)',
              }}
            />
          ) : (
            /* Premium letter placeholder — no more cardboard box emoji */
            <div style={{
              width: '100%', height: '100%',
              background: category
                ? `linear-gradient(145deg, ${category.color}28 0%, ${category.color}08 100%)`
                : 'linear-gradient(145deg, rgba(255,203,116,0.1) 0%, rgba(255,203,116,0.02) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 48, fontStyle: 'italic', lineHeight: 1, userSelect: 'none',
                color: category ? `${category.color}55` : 'rgba(255,203,116,0.22)',
              }}>
                {item.name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}

          {/* Gradient scrim — name + price live here */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 45%, transparent 100%)',
            zIndex: 2,
          }} />

          {/* Name + price overlay */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 10px', zIndex: 3 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.25,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              marginBottom: 5,
            }}>
              {item.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                color: item.status === 'sold' ? 'rgba(255,255,255,0.5)' : 'var(--accent-gold)',
              }}>
                {item.status === 'sold' ? fmt(item.sold_price) : fmt(item.asking_price)}
              </span>
              <StatusBadge status={item.status} />
            </div>
          </div>

          {/* Age badge */}
          {daysListed !== null && daysListed >= 14 && (
            <div style={{
              position: 'absolute', top: 10, right: 8, zIndex: 4,
              background: 'rgba(0,0,0,0.68)',
              color: ageColor,
              fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
              padding: '2px 6px', borderRadius: 20,
              backdropFilter: 'blur(6px)',
            }}>
              {daysListed}d
            </div>
          )}

          {/* Quantity badge */}
          {!bulkMode && (item.quantity || 1) > 1 && (
            <div style={{
              position: 'absolute', top: 10, left: 8, zIndex: 4,
              background: 'rgba(212,168,83,0.9)',
              color: '#0a0a0b',
              fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
              padding: '2px 6px', borderRadius: 20,
            }}>
              ×{item.quantity}
            </div>
          )}

          {/* Bulk selection checkbox */}
          {bulkMode && (
            <div style={{
              position: 'absolute', top: 8, left: 8, zIndex: 5,
              width: 22, height: 22, borderRadius: 6,
              border: `2px solid ${selected ? 'var(--accent-gold)' : 'rgba(255,255,255,0.5)'}`,
              background: selected ? 'var(--accent-gold)' : 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 120ms',
            }}>
              {selected && <Check size={12} color="#0a0a0b" strokeWidth={3} />}
            </div>
          )}
        </div>

        {/* Make/model — compact strip, only when present */}
        {(item.make || item.model) && (
          <div style={{
            padding: '6px 10px 8px',
            fontSize: 10, color: 'var(--text-tertiary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
            {[item.make, item.model].filter(Boolean).join(' · ')}
          </div>
        )}
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
