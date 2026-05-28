import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../App.jsx';
import { DollarSign, Calendar, Download, Eye, Copy } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import EmptyState from '../components/shared/EmptyState.jsx';
import { storage } from '../services/storage.js';
import { useIsMobile } from '../hooks/useIsMobile.js';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

function timeAgo(dateStr) {
  try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true }); }
  catch { return ''; }
}

const PLATFORM_COLORS = {
  'eBay':                 '#E53238',
  'Facebook':             '#1877F2',
  'Facebook Marketplace': '#1877F2',
  'Depop':                '#FF2D55',
  'Poshmark':             '#C13584',
  'OfferUp':              '#0BC47B',
  'Mercari':              '#FF6600',
  'Craigslist':           '#9c27b0',
  'Vinted':               '#09B1BA',
};

function SoldRowMenu({ x, y, onClose, onView, onCopy }) {
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [onClose]);

  const menuW = 160, menuH = 88;
  const cx = Math.min(x, window.innerWidth  - menuW - 8);
  const cy = Math.min(y, window.innerHeight - menuH - 8);

  return createPortal(
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.1 }}
      style={{
        position: 'fixed', top: cy, left: cx, zIndex: 9999,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10, padding: 4, minWidth: menuW,
        boxShadow: 'var(--shadow-float)',
      }}
    >
      <RowMenuItem icon={Eye}  label="View Details" onClick={onView} />
      <RowMenuItem icon={Copy} label="Copy Info"    onClick={onCopy} />
    </motion.div>,
    document.body
  );
}

function RowMenuItem({ icon: Icon, label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        width: '100%', padding: '8px 10px', borderRadius: 7,
        border: 'none', background: hovered ? 'var(--bg-surface)' : 'transparent',
        color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', textAlign: 'left',
      }}
    >
      <Icon size={13} /> {label}
    </button>
  );
}

function PlatformBadge({ platform }) {
  if (!platform) return <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>;
  const color = PLATFORM_COLORS[platform] || '#9a9a9a';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 20,
      fontSize: 10, fontWeight: 600,
      background: `${color}22`,
      border: `1px solid ${color}44`,
      color,
    }}>
      {platform}
    </span>
  );
}

export default function Sold() {
  const { items, stats, setSelectedItem, searchQuery, toast } = useApp();
  const isMobile = useIsMobile();
  const [activePlatform, setActivePlatform] = useState(null);
  const [rowMenu, setRowMenu] = useState(null); // { item, x, y }
  const rowLongTimer = useRef(null);
  const rowLongFired = useRef(false);

  function onRowTouchStart(item, e) {
    rowLongFired.current = false;
    const touch = e.touches[0];
    rowLongTimer.current = setTimeout(() => {
      rowLongFired.current = true;
      navigator.vibrate?.(14);
      setRowMenu({ item, x: touch.clientX, y: touch.clientY });
    }, 480);
  }
  function onRowTouchEnd()  { clearTimeout(rowLongTimer.current); }
  function onRowTouchMove() { clearTimeout(rowLongTimer.current); }
  function onRowClick(item) {
    if (rowLongFired.current) { rowLongFired.current = false; return; }
    setSelectedItem(item);
  }

  function copyItemInfo(item) {
    const lines = [
      item.name,
      [item.make, item.model].filter(Boolean).join(' '),
      item.sold_platform ? `Platform: ${item.sold_platform}` : '',
      `Sold: ${fmt(item.sold_price)}`,
      item.sold_at ? `Date: ${new Date(item.sold_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(lines);
    toast?.('Sale info copied', 'success');
    setRowMenu(null);
  }

  const soldItems = items.filter(i => i.status === 'sold')
    .filter(i => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return i.name?.toLowerCase().includes(q) || i.make?.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.sold_at || b.updated_at) - new Date(a.sold_at || a.updated_at));

  const allPlatforms = [...new Set(soldItems.map(i => i.sold_platform).filter(Boolean))];
  const displayItems = activePlatform ? soldItems.filter(i => i.sold_platform === activePlatform) : soldItems;

  function exportCsv() {
    const header = 'Name,Make,Model,Condition,Asking Price,Sold Price,Platform,Sold At\n';
    const rows = soldItems.map(i =>
      [i.name, i.make||'', i.model||'', i.condition||'', i.asking_price||'', i.sold_price||'', i.sold_platform||'', i.sold_at||'']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n');
    storage.exportCsv(header + rows);
  }

  if (soldItems.length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title="No sold items yet"
        description="Mark items as sold from the inventory and they'll appear here."
        action={false}
      />
    );
  }

  return (
    <div style={{ padding: isMobile ? 14 : 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: isMobile ? 18 : 20, fontFamily: 'var(--font-display)', fontWeight: 400, color: 'var(--text-primary)', marginBottom: 3 }}>
            Sold Items
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {displayItems.length} items · {fmt(stats.totalEarned)} earned
          </p>
        </div>
        <button onClick={exportCsv} style={{
          padding: '7px 14px',
          borderRadius: 8,
          border: '1px solid var(--border-subtle)',
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Platform filter pills */}
      {allPlatforms.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {allPlatforms.map(p => (
            <button
              key={p}
              onClick={() => setActivePlatform(activePlatform === p ? null : p)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11,
                border: `1px solid ${activePlatform === p ? 'var(--accent-gold-dim)' : 'var(--border-subtle)'}`,
                background: activePlatform === p ? 'rgba(212,168,83,0.1)' : 'transparent',
                color: activePlatform === p ? 'var(--accent-gold)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 80ms',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {isMobile ? (
        // Mobile: card list
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayItems.map(item => {
            const profit = item.cost_price > 0 ? item.sold_price - item.cost_price : null;
            return (
              <div
                key={item.id}
                onClick={() => onRowClick(item)}
                onTouchStart={e => onRowTouchStart(item, e)}
                onTouchEnd={onRowTouchEnd}
                onTouchMove={onRowTouchMove}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 12,
                  border: '1px solid var(--border-subtle)',
                  padding: '14px 16px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={10} />
                        {timeAgo(item.sold_at || item.updated_at)}
                      </span>
                      {item.sold_platform && <PlatformBadge platform={item.sold_platform} />}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: 'var(--accent-green)' }}>
                      {fmt(item.sold_price)}
                    </div>
                    {profit !== null && (
                      <div style={{ fontSize: 11, color: profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', marginTop: 2 }}>
                        {profit >= 0 ? '+' : ''}{fmt(profit)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Desktop: table
        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            <span>Item</span>
            <span>Condition</span>
            <span>Asking</span>
            <span>Sold For</span>
            <span>Platform</span>
          </div>

          {displayItems.map((item, i) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                padding: '12px 16px',
                borderBottom: i < displayItems.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                cursor: 'pointer',
                transition: 'background 80ms',
                alignItems: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Calendar size={10} />
                  {timeAgo(item.sold_at || item.updated_at)}
                </div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.condition || '—'}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{fmt(item.asking_price)}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-green)', fontWeight: 600 }}>{fmt(item.sold_price)}</span>
              <PlatformBadge platform={item.sold_platform} />
            </div>
          ))}
        </div>
      )}

      {/* Row long-press context menu */}
      <AnimatePresence>
        {rowMenu && (
          <SoldRowMenu
            key="row-menu"
            x={rowMenu.x}
            y={rowMenu.y}
            onClose={() => setRowMenu(null)}
            onView={() => { setSelectedItem(rowMenu.item); setRowMenu(null); }}
            onCopy={() => copyItemInfo(rowMenu.item)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
