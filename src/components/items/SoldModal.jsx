import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle } from 'lucide-react';
import PriceInput from '../shared/PriceInput.jsx';

const PLATFORMS = ['eBay', 'Facebook Marketplace', 'Craigslist', 'OfferUp', 'Poshmark', 'Mercari', 'Other'];

export default function SoldModal({ item, onClose, onConfirm }) {
  const [soldPrice,  setSoldPrice]  = useState(item.asking_price || 0);
  const [platform,   setPlatform]   = useState('');
  const [notes,      setNotes]      = useState('');
  const [confirming, setConfirming] = useState(false);
  const [done,       setDone]       = useState(false);

  async function handleConfirm() {
    setConfirming(true);
    try {
      await onConfirm({ soldPrice, platform, notes });
      setDone(true);
      setTimeout(onClose, 1200);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
          width: 400,
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-float)',
          overflow: 'hidden',
        }}
      >
        {done ? (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              padding: 48,
            }}
          >
            <CheckCircle size={52} color="var(--accent-green)" strokeWidth={1.5} />
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Sold!</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(soldPrice)} logged
            </span>
          </motion.div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 22px',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Mark as Sold</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{item.name}</div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} color="var(--text-secondary)" />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <PriceInput
                label="Sale Price"
                value={soldPrice}
                onChange={setSoldPrice}
              />

              {/* Platform */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Platform
                </label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: '9px 12px',
                    fontSize: 13,
                    color: platform ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select platform…</option>
                  {PLATFORMS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any notes about the sale…"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: '9px 12px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'var(--font-body)',
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 22px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
            }}>
              <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
              <button
                onClick={handleConfirm}
                disabled={confirming || soldPrice <= 0}
                style={{
                  ...confirmBtnStyle,
                  opacity: (confirming || soldPrice <= 0) ? 0.5 : 1,
                  cursor: (confirming || soldPrice <= 0) ? 'not-allowed' : 'pointer',
                }}
              >
                {confirming ? 'Logging…' : 'Confirm Sale'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

const cancelBtnStyle = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid var(--border-subtle)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 13,
  cursor: 'pointer',
};

const confirmBtnStyle = {
  padding: '8px 18px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--accent-green)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
};
