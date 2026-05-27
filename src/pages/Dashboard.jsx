import { Clock } from 'lucide-react';
import { useApp } from '../App.jsx';
import StatsBar from '../components/dashboard/StatsBar.jsx';
import EarningsChart from '../components/dashboard/EarningsChart.jsx';
import RecentActivity from '../components/dashboard/RecentActivity.jsx';
import ItemCard from '../components/items/ItemCard.jsx';

export default function Dashboard() {
  const { stats, setCurrentPage, setSelectedItem } = useApp();

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          color: 'var(--text-primary)',
          fontWeight: 400,
          marginBottom: 4,
        }}>
          Your Stash
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {stats.totalItems} items · {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalValue)} total value
        </p>
      </div>

      {/* Stats row */}
      <StatsBar stats={stats} />

      {/* Charts + Activity row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <EarningsChart monthlyEarnings={stats.monthlyEarnings} />
        <RecentActivity />
      </div>

      {/* Longest sitting */}
      {stats.longestSitting?.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Clock size={14} color="var(--accent-red)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              Sitting Too Long
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Items you've had for 30+ days
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 12,
          }}>
            {stats.longestSitting.map((item, i) => (
              <div key={item.id} style={{ position: 'relative' }}>
                <ItemCard item={item} index={i} />
                <div style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: 'rgba(224,92,92,0.9)',
                  borderRadius: 8,
                  padding: '2px 7px',
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
