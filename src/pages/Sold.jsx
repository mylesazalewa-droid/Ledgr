import { useApp } from '../App.jsx';
import { DollarSign, Calendar } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import EmptyState from '../components/shared/EmptyState.jsx';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

function timeAgo(dateStr) {
  try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true }); }
  catch { return ''; }
}

export default function Sold() {
  const { items, stats, setSelectedItem, searchQuery } = useApp();

  const soldItems = items.filter(i => i.status === 'sold')
    .filter(i => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return i.name?.toLowerCase().includes(q) || i.make?.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.sold_at || b.updated_at) - new Date(a.sold_at || a.updated_at));

  function exportCsv() {
    const header = 'Name,Make,Model,Condition,Asking Price,Sold Price,Platform,Sold At\n';
    const rows = soldItems.map(i =>
      [i.name, i.make||'', i.model||'', i.condition||'', i.asking_price||'', i.sold_price||'', i.sold_platform||'', i.sold_at||'']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n');
    window.stash.exportCsv(header + rows);
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
    <div style={{ padding: 24 }}>
      {/* Header stats */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 400, color: 'var(--text-primary)', marginBottom: 4 }}>
            Sold Items
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {soldItems.length} items · {fmt(stats.totalEarned)} total earned
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
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}>
        {/* Table header */}
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

        {soldItems.map((item, i) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
              padding: '12px 16px',
              borderBottom: i < soldItems.length - 1 ? '1px solid var(--border-subtle)' : 'none',
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
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
              {fmt(item.asking_price)}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-green)', fontWeight: 600 }}>
              {fmt(item.sold_price)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.sold_platform || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
