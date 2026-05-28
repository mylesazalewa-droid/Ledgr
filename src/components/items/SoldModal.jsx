import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, CheckCircle } from 'lucide-react';
import PriceInput from '../shared/PriceInput.jsx';

// ── Confetti burst ────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#ffcb74', '#4caf7d', '#5b8ef0', '#e05c5c', '#ffffff', '#ff9f43', '#c084fc', '#38bdf8'];

function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 65 }, (_, i) => ({
      id: i,
      left:  12 + Math.random() * 76,
      top:   30 + Math.random() * 40,
      w:     4  + Math.random() * 6,
      h:     4  + Math.random() * 11,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 0.42,
      dur:   0.6 + Math.random() * 0.6,
      round: Math.random() > 0.48,
      rot:   Math.floor(Math.random() * 360),
    }))
  );

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position:     'absolute',
            left:         `${p.left}%`,
            top:          `${p.top}%`,
            width:        p.w,
            height:       p.round ? p.w : p.h,
            background:   p.color,
            borderRadius: p.round ? '50%' : 2,
            transform:    `rotate(${p.rot}deg)`,
            animation:    `confettiBurst ${p.dur}s ease-out ${p.delay}s both`,
          }}
        />
      ))}
    </div>,
    document.body
  );
}

const PLATFORMS = ['eBay', 'Facebook Marketplace', 'Depop', 'Poshmark', 'OfferUp', 'Mercari', 'Craigslist', 'Vinted', 'Other'];

// Default fee % per platform
const PLATFORM_FEES = {
  'eBay':                 13.25,
  'Facebook Marketplace': 0,
  'Depop':                10,
  'Poshmark':             20,
  'OfferUp':              12.9,
  'Mercari':              10,
  'Craigslist':           0,
  'Vinted':               5,
  'Other':                0,
};

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

export default function SoldModal({ item, onClose, onConfirm, defaultPlatform = '' }) {
  const [soldPrice,    setSoldPrice]    = useState(item.asking_price || 0);
  const [platform,     setPlatform]     = useState(() => {
    if (defaultPlatform && PLATFORMS.includes(defaultPlatform)) return defaultPlatform;
    return '';
  });
  const [feePct,       setFeePct]       = useState(() => {
    if (defaultPlatform && PLATFORM_FEES[defaultPlatform] != null) return PLATFORM_FEES[defaultPlatform];
    return 0;
  });
  const [shippingCost, setShippingCost] = useState(0);
  const [notes,        setNotes]        = useState('');
  const [confirming,   setConfirming]   = useState(false);
  const [done,         setDone]         = useState(false);

  function handlePlatformChange(p) {
    setPlatform(p);
    setFeePct(PLATFORM_FEES[p] ?? 0);
  }

  const fees        = soldPrice * feePct / 100;
  const netProceeds = Math.max(0, soldPrice - fees - shippingCost);
  const profit      = item.cost_price > 0 ? netProceeds - item.cost_price : null;

  async function handleConfirm() {
    setConfirming(true);
    try {
      await onConfirm({ soldPrice, platform, notes, feePct, shippingCost, netProceeds });
      setDone(true);
      setTimeout(onClose, 1400);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <>
    {done && <Confetti />}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 500,
        backdropFilter: 'blur(4px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        exit={{ scale: 0.92,   opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-modal)',
          width: 420,
          maxWidth: 'calc(100vw - 32px)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-float)',
          overflow: 'hidden',
        }}
      >
        {done ? (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 48 }}
          >
            <CheckCircle size={52} color="var(--accent-green)" strokeWidth={1.5} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>Sold!</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {fmt(netProceeds)} net · {profit !== null ? `${profit >= 0 ? '+' : ''}${fmt(profit)} profit` : fmt(soldPrice) + ' logged'}
            </span>
          </motion.div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Mark as Sold</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {item.name}
                  {(item.quantity || 1) > 1 && (
                    <span style={{ marginLeft: 6, color: 'var(--accent-gold)', fontWeight: 600 }}>
                      · selling 1 of {item.quantity}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} color="var(--text-secondary)" />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <PriceInput label="Sale Price" value={soldPrice} onChange={setSoldPrice} />

              {/* Platform */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Platform</label>
                <select
                  value={platform}
                  onChange={e => handlePlatformChange(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Select platform…</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Fee % — auto-filled but editable */}
              {platform && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={labelStyle}>Platform Fee %</label>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '0 12px' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={feePct}
                        onChange={e => setFeePct(parseFloat(e.target.value) || 0)}
                        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', padding: '9px 0' }}
                      />
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>%</span>
                    </div>
                  </div>
                  <PriceInput label="Shipping Cost" value={shippingCost} onChange={setShippingCost} />
                </div>
              )}

              {/* Net proceeds breakdown */}
              {soldPrice > 0 && (platform || shippingCost > 0) && (
                <div style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 2 }}>Breakdown</div>
                  <Row label="Sale price"   value={fmt(soldPrice)} />
                  {fees > 0        && <Row label={`${platform} fee (${feePct}%)`} value={`− ${fmt(fees)}`}        color="var(--accent-red)" />}
                  {shippingCost > 0 && <Row label="Shipping"                        value={`− ${fmt(shippingCost)}`} color="var(--accent-red)" />}
                  <div style={{ height: 1, background: 'var(--border-subtle)', margin: '2px 0' }} />
                  <Row label="Net proceeds" value={fmt(netProceeds)} bold color="var(--accent-green)" />
                  {profit !== null && (
                    <Row
                      label="Profit (after cost)"
                      value={`${profit >= 0 ? '+' : ''}${fmt(profit)}`}
                      bold
                      color={profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
                    />
                  )}
                </div>
              )}

              {/* Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any notes about the sale…"
                  style={textareaStyle}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
              <button
                onClick={handleConfirm}
                disabled={confirming || soldPrice <= 0}
                style={{ ...confirmBtnStyle, opacity: (confirming || soldPrice <= 0) ? 0.5 : 1, cursor: (confirming || soldPrice <= 0) ? 'not-allowed' : 'pointer' }}
              >
                {confirming ? 'Logging…' : 'Confirm Sale'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
    </>
  );
}

function Row({ label, value, color, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: bold ? 600 : 400, color: color || 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

const labelStyle    = { fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' };
const selectStyle   = { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', width: '100%' };
const textareaStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', resize: 'none', fontFamily: 'var(--font-body)', width: '100%' };
const cancelBtnStyle  = { padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' };
const confirmBtnStyle = { padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent-green)', color: '#fff', fontSize: 13, fontWeight: 600 };
