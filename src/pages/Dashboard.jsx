import { TrendingDown, Zap } from 'lucide-react';
import { useApp } from '../App.jsx';
import StatsBar from '../components/dashboard/StatsBar.jsx';
import EarningsChart from '../components/dashboard/EarningsChart.jsx';
import RecentActivity from '../components/dashboard/RecentActivity.jsx';
import ItemCard from '../components/items/ItemCard.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

export default function Dashboard() {
  const { stats, setCurrentPage } = useApp();
  const isMobile = useIsMobile();

  // Split aging items into tiers for targeted suggestions
  const stallingItems  = stats.longestSitting?.filter(i => i.days_listed < 60)  ?? [];
  const agingItems     = stats.longestSitting?.filter(i => i.days_listed >= 60 && i.days_listed < 90) ?? [];
  const stuckItems     = stats.longestSitting?.filter(i => i.days_listed >= 90) ?? [];
  const hasAttention   = (stats.longestSitting?.length ?? 0) > 0;

  return (
    <div style={{ padding: isMobile ? 14 : 24, maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Trapped Value Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212,168,83,0.11) 0%, rgba(212,168,83,0.03) 100%)',
        border: '1px solid var(--border-accent)',
        borderRadius: 18,
        padding: isMobile ? '20px 20px 18px' : '26px 30px 22px',
        marginBottom: isMobile ? 16 : 20,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative blur */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,83,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent-gold-dim)', marginBottom: 6 }}>
          Money sitting in your house
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? 44 : 56, fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1, marginBottom: 10 }}>
          {fmt(stats.totalValue)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 12 : 20, alignItems: 'center' }}>
          <Chip label={`${stats.totalItems} unsold items`} />
          {stats.soldCount > 0 && <Chip label={`${fmt(stats.totalEarned)} earned so far`} accent />}
          {stats.totalProfit > 0 && <Chip label={`${fmt(stats.totalProfit)} profit`} accent />}
        </div>
      </div>

      {/* Stats — horizontal scroll on mobile */}
      {isMobile ? (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 16, paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          <MiniStatCard label="In Stock"   value={stats.totalItems}              color="var(--accent-blue)"  />
          <MiniStatCard label="Est. Value" value={fmt(stats.totalValue)}         color="var(--accent-gold)"  />
          <MiniStatCard label="Sold"       value={stats.soldCount}               color="var(--accent-green)" />
          <MiniStatCard label="Earned"     value={fmt(stats.totalEarned)}        color="var(--accent-green)" />
          <MiniStatCard label="Profit"     value={fmt(stats.totalProfit)} color={stats.totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        </div>
      ) : (
        <StatsBar stats={stats} />
      )}

      {/* Charts + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16, marginBottom: isMobile ? 16 : 24 }}>
        <EarningsChart monthlyEarnings={stats.monthlyEarnings} />
        <RecentActivity />
      </div>

      {/* ── Needs Attention ── */}
      {hasAttention && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <TrendingDown size={15} color="var(--accent-red)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Needs Attention</span>
          </div>

          {/* 90+ days — drop or donate */}
          {stuckItems.length > 0 && (
            <AttentionTier
              items={stuckItems}
              isMobile={isMobile}
              badgeColor="#e05c5c"
              suggestion="3+ months — seriously drop the price or donate"
            />
          )}

          {/* 60-89 days — lower price */}
          {agingItems.length > 0 && (
            <AttentionTier
              items={agingItems}
              isMobile={isMobile}
              badgeColor="#d4a853"
              suggestion="Over 60 days — consider a price drop"
            />
          )}

          {/* 30-59 days — keep an eye on it */}
          {stallingItems.length > 0 && (
            <AttentionTier
              items={stallingItems}
              isMobile={isMobile}
              badgeColor="#888891"
              suggestion="30+ days listed — monitor closely"
            />
          )}
        </div>
      )}
    </div>
  );
}

function AttentionTier({ items, isMobile, badgeColor, suggestion }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Zap size={11} color={badgeColor} />
        <span style={{ fontSize: 11, color: badgeColor, fontWeight: 500 }}>{suggestion}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: isMobile ? 10 : 12 }}>
        {items.map((item, i) => (
          <div key={item.id} style={{ position: 'relative' }}>
            <ItemCard item={item} index={i} />
            <div style={{
              position: 'absolute', top: 8, right: 8,
              background: badgeColor,
              borderRadius: 6, padding: '2px 7px',
              fontSize: 10, fontWeight: 700, color: '#fff', zIndex: 2,
            }}>
              {item.days_listed}d
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({ label, accent }) {
  return (
    <span style={{
      fontSize: 11,
      color: accent ? 'var(--accent-green)' : 'var(--text-secondary)',
      background: accent ? 'rgba(76,175,125,0.12)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${accent ? 'rgba(76,175,125,0.2)' : 'var(--border-subtle)'}`,
      borderRadius: 20,
      padding: '3px 10px',
    }}>
      {label}
    </span>
  );
}

function MiniStatCard({ label, value, color }) {
  return (
    <div style={{ flexShrink: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '12px 16px', minWidth: 110 }}>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}
