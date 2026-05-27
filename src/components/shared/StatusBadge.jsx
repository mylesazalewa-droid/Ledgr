const STATUS_CONFIG = {
  available: { label: 'Available', color: 'var(--accent-green)',  bg: 'rgba(76,175,125,0.12)' },
  reserved:  { label: 'Reserved',  color: 'var(--accent-gold)',   bg: 'rgba(212,168,83,0.12)' },
  sold:      { label: 'Sold',      color: 'var(--accent-red)',    bg: 'rgba(224,92,92,0.12)'  },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.available;
  const dotSize  = size === 'lg' ? 7  : 5;
  const fontSize = size === 'lg' ? 12 : 10;
  const padding  = size === 'lg' ? '4px 10px' : '3px 7px';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: dotSize - 1,
      padding,
      borderRadius: 20,
      background: cfg.bg,
      fontSize,
      fontWeight: 500,
      color: cfg.color,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: dotSize,
        height: dotSize,
        borderRadius: '50%',
        background: cfg.color,
        flexShrink: 0,
      }} />
      {cfg.label}
    </span>
  );
}
