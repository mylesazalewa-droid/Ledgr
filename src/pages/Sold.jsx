import { useState } from 'react';
import { useApp } from '../App.jsx';
import { DollarSign, Calendar, Download } from 'lucide-react';
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

export default function Sold() {
  const { items, stats, setSelectedItem, searchQuery } = useApp();
  const isMobile = useIsMobile();
  const [activePlatform, setActivePlatform] = useState(null);

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
                onClick={() => setSelectedItem(item)}
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
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={10} />
                      {timeAgo(item.sold_at || item.updated_at)}
                      {item.sold_platform && <> · {item.sold_platform}</>}
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
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.sold_platform || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
