import { Clock } from 'lucide-react';
import { useApp } from '../App.jsx';
import StatsBar from '../components/dashboard/StatsBar.jsx';
import EarningsChart from '../components/dashboard/EarningsChart.jsx';
import RecentActivity from '../components/dashboard/RecentActivity.jsx';
import ItemCard from '../components/items/ItemCard.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';

export default function Dashboard() {
  const { stats, setCurrentPage } = useApp();
  const isMobile = useIsMobile();

  return (
    <div style={{ padding: isMobile ? 14 : 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: isMobile ? 22 : 28,
          color: 'var(--text-primary)',
          fontWeight: 400,
          marginBottom: 4,
        }}>
          Your Stash
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {stats.totalItems} items · {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalValue)} total value
        </p>
      </div>

      {/* Stats — horizontal scroll on mobile */}
      {isMobile ? (
        <div style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          marginBottom: 16,
          paddingBottom: 4,
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}>
          <MiniStatCard label="In Stock"     value={stats.totalItems}  color="var(--accent-blue)" />
          <MiniStatCard label="Est. Value"   value={fmt(stats.totalValue)}   color="var(--accent-gold)" />
          <MiniStatCard label="Sold"         value={stats.soldCount}   color="var(--accent-green)" />
          <MiniStatCard label="Earned"       value={fmt(stats.totalEarned)}  color="var(--accent-green)" />
          <MiniStatCard label="Profit"       value={fmt(stats.totalProfit)}  color={stats.totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        </div>
      ) : (
        <StatsBar stats={stats} />
      )}

      {/* Charts + Activity */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? 12 : 16,
        marginBottom: isMobile ? 16 : 24,
      }}>
        <EarningsChart monthlyEarnings={stats.monthlyEarnings} />
        <RecentActivity />
      </div>

      {/* Longest sitting */}
      {stats.longestSitting?.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Clock size={14} color="var(--accent-red)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              Sitting Too Long
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              30+ days
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: isMobile ? 10 : 12,
          }}>
            {stats.longestSitting.map((item, i) => (
              <div key={item.id} style={{ position: 'relative' }}>
                <ItemCard item={item} index={i} />
                <div style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'rgba(224,92,92,0.9)',
                  borderRadius: 6,
                  padding: '2px 6px',
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#fff',
                  zIndex: 2,
                }}>
                  {item.days_listed}d
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

function MiniStatCard({ label, value, color }) {
  return (
    <div style={{
      flexShrink: 0,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 12,
      padding: '12px 16px',
      minWidth: 110,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color }}>
        {value}
      </div>
    </div>
  );
}
