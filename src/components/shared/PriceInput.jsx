import { useState } from 'react';

export default function PriceInput({ value, onChange, placeholder = '0.00', label, style }) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-surface)',
        border: `1px solid ${focused ? 'var(--accent-gold-dim)' : 'var(--border-subtle)'}`,
        borderRadius: 8,
        padding: '0 12px',
        transition: 'border-color 100ms',
        ...style,
      }}>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 13, marginRight: 4, fontFamily: 'var(--font-mono)' }}>$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value === 0 ? '' : value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: 14,
            color: 'var(--accent-gold)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 500,
            padding: '9px 0',
          }}
        />
      </div>
    </div>
  );
}
