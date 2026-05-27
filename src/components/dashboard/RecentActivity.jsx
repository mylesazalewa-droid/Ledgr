import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useApp } from '../../App.jsx';

function timeAgo(dateStr) {
  try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true }); }
  catch { return ''; }
}

export default function RecentActivity() {
  const { items, setSelectedItem } = useApp();

  const recent = [...items]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Activity</div>
      </div>

      {recent.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
          No activity yet
        </div>
      ) : (
        <div>
          {recent.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedItem(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 18px',
                borderBottom: i < recent.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                cursor: 'pointer',
                transition: 'background 80ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Status dot */}
              <div style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                flexShrink: 0,
                background: item.status === 'sold' ? 'var(--accent-red)'
                  : item.status === 'reserved' ? 'var(--accent-gold)'
                  : 'var(--accent-green)',
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>
                  {item.status === 'sold' ? 'Sold' : item.status === 'reserved' ? 'Reserved' : 'Added'}
                  {' · '}{timeAgo(item.updated_at)}
                </div>
              </div>

              {item.status === 'sold' ? (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-green)', fontWeight: 600, flexShrink: 0 }}>
                  ${item.sold_price?.toFixed(0)}
                </span>
              ) : (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                  ${item.asking_price?.toFixed(0)}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
