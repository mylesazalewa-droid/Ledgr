import { TrendingDown, Zap, Trophy, ScanLine, Plus, Package, DollarSign } from 'lucide-react';
import { useApp } from '../App.jsx';
import StatsBar from '../components/dashboard/StatsBar.jsx';
import EarningsChart from '../components/dashboard/EarningsChart.jsx';
import RecentActivity from '../components/dashboard/RecentActivity.jsx';
import ItemCard from '../components/items/ItemCard.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { ACHIEVEMENTS, getUnlocked, getDeclutterScore, getDeclutterLabel, getSeenIds } from '../utils/achievements.js';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

export default function Dashboard() {
  const { stats, setCurrentPage, setShowAddModal } = useApp();
  const isMobile = useIsMobile();

  const stallingItems  = stats.longestSitting?.filter(i => i.days_listed < 60)  ?? [];
  const agingItems     = stats.longestSitting?.filter(i => i.days_listed >= 60 && i.days_listed < 90) ?? [];
  const stuckItems     = stats.longestSitting?.filter(i => i.days_listed >= 90) ?? [];
  const hasAttention   = (stats.longestSitting?.length ?? 0) > 0;

  const declutterScore = getDeclutterScore(stats);
  const declutterLabel = getDeclutterLabel(declutterScore);
  const unlockedIds    = new Set(getUnlocked(stats).map(a => a.id));

  const pad = isMobile ? 16 : 24;

  return (
    <div style={{ padding: pad, maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Greeting ── */}
      {isMobile && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Your Stash 📦
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Here's what you've got
          </div>
        </div>
      )}

      {/* ── Trapped Value Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1a10 0%, #16140c 50%, #0f0e09 100%)',
        border: '1px solid rgba(212,168,83,0.2)',
        borderRadius: isMobile ? 22 : 20,
        padding: isMobile ? '22px 22px 20px' : '28px 32px 24px',
        marginBottom: isMobile ? 14 : 18,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative orbs */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,83,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,83,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(212,168,83,0.55)', marginBottom: 6 }}>
          Money sitting in your house
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? 48 : 60, fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1, marginBottom: 12 }}>
          {fmt(stats.totalValue)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 8 : 14, alignItems: 'center' }}>
          <Chip label={`${stats.totalItems ?? 0} items`} />
          {stats.soldCount > 0 && <Chip label={`${fmt(stats.totalEarned)} earned`} accent />}
          {stats.totalProfit > 0 && <Chip label={`${fmt(stats.totalProfit)} profit`} accent />}
        </div>
      </div>

      {/* ── Quick Actions (mobile only) ── */}
      {isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
          <QuickAction
            icon="➕"
            label="Add Item"
            color="rgba(212,168,83,0.12)"
            borderColor="rgba(212,168,83,0.2)"
            textColor="var(--accent-gold)"
            onClick={() => setShowAddModal(true)}
          />
          <QuickAction
            icon="📦"
            label="Inventory"
            color="rgba(91,142,240,0.1)"
            borderColor="rgba(91,142,240,0.18)"
            textColor="var(--accent-blue)"
            onClick={() => setCurrentPage('inventory')}
          />
          <QuickAction
            icon="💰"
            label="Sold"
            color="rgba(76,175,125,0.1)"
            borderColor="rgba(76,175,125,0.18)"
            textColor="var(--accent-green)"
            onClick={() => setCurrentPage('sold')}
          />
        </div>
      )}

      {/* ── Declutter Score ── */}
      {(stats.soldCount > 0 || stats.totalItems > 0) && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: isMobile ? 18 : 14,
          padding: isMobile ? '14px 18px' : '16px 22px',
          marginBottom: isMobile ? 14 : 18,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6 }}>
              Declutter Score
            </div>
            <div style={{ height: 7, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{
                height: '100%',
                width: `${declutterScore}%`,
                background: declutterScore >= 80
                  ? 'var(--accent-green)'
                  : declutterScore >= 40
                    ? 'linear-gradient(90deg, var(--accent-gold), #f0c060)'
                    : 'var(--accent-blue)',
                borderRadius: 99,
                transition: 'width 700ms ease',
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{declutterLabel}</div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? 32 : 36, fontWeight: 700, color: declutterScore >= 80 ? 'var(--accent-green)' : 'var(--accent-gold)', lineHeight: 1 }}>
            {declutterScore}<span style={{ fontSize: '0.45em', color: 'var(--text-tertiary)' }}>%</span>
          </div>
        </div>
      )}

      {/* Stats */}
      {isMobile ? (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 14, paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          <MiniStatCard label="In Stock"   value={stats.totalItems ?? 0}        color="var(--accent-blue)"  />
          <MiniStatCard label="Est. Value" value={fmt(stats.totalValue)}         color="var(--accent-gold)"  />
          <MiniStatCard label="Sold"       value={stats.soldCount ?? 0}          color="var(--accent-green)" />
          <MiniStatCard label="Earned"     value={fmt(stats.totalEarned)}        color="var(--accent-green)" />
          <MiniStatCard label="Profit"     value={fmt(stats.totalProfit)} color={(stats.totalProfit ?? 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        </div>
      ) : (
        <StatsBar stats={stats} />
      )}

      {/* Charts + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16, marginBottom: isMobile ? 14 : 22 }}>
        <EarningsChart monthlyEarnings={stats.monthlyEarnings} />
        <RecentActivity />
      </div>

      {/* ── Needs Attention ── */}
      {hasAttention && (
        <div style={{ marginBottom: 8 }}>
          <SectionHeader icon={<TrendingDown size={14} color="var(--accent-red)" />} label="Needs Attention" />

          {stuckItems.length > 0 && (
            <AttentionTier items={stuckItems} isMobile={isMobile} badgeColor="#e05c5c" suggestion="3+ months — drop price or donate" />
          )}
          {agingItems.length > 0 && (
            <AttentionTier items={agingItems} isMobile={isMobile} badgeColor="#d4a853" suggestion="Over 60 days — consider a price drop" />
          )}
          {stallingItems.length > 0 && (
            <AttentionTier items={stallingItems} isMobile={isMobile} badgeColor="#888891" suggestion="30+ days listed — monitor closely" />
          )}
        </div>
      )}

      {/* ── Achievements ── */}
      <div style={{ marginTop: isMobile ? 20 : 28 }}>
        <SectionHeader
          icon={<Trophy size={14} color="var(--accent-gold)" />}
          label="Achievements"
          right={<span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{unlockedIds.size} / {ACHIEVEMENTS.length}</span>}
        />
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: isMobile ? 9 : 10,
        }}>
          {ACHIEVEMENTS.map(a => {
            const earned = unlockedIds.has(a.id);
            return (
              <div
                key={a.id}
                title={a.desc}
                style={{
                  background: earned
                    ? 'linear-gradient(135deg, rgba(212,168,83,0.12), rgba(212,168,83,0.04))'
                    : 'var(--bg-surface)',
                  border: `1px solid ${earned ? 'rgba(212,168,83,0.3)' : 'var(--border-subtle)'}`,
                  borderRadius: isMobile ? 16 : 12,
                  padding: isMobile ? '12px 8px' : '14px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  opacity: earned ? 1 : 0.45,
                  transition: 'opacity 200ms, border-color 200ms',
                }}
              >
                <span style={{ fontSize: isMobile ? 24 : 28, lineHeight: 1 }}>{earned ? a.icon : '🔒'}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: earned ? 'var(--accent-gold)' : 'var(--text-tertiary)',
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}>
                  {a.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* bottom breathing room for floating nav */}
      {isMobile && <div style={{ height: 8 }} />}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {icon}
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{label}</span>
      </div>
      {right}
    </div>
  );
}

function QuickAction({ icon, label, color, borderColor, textColor, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: color,
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        padding: '14px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        transition: 'opacity 100ms',
        width: '100%',
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: textColor }}>{label}</span>
    </button>
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
      color: accent ? 'var(--accent-green)' : 'rgba(255,255,255,0.5)',
      background: accent ? 'rgba(76,175,125,0.14)' : 'rgba(255,255,255,0.06)',
      border: `1px solid ${accent ? 'rgba(76,175,125,0.22)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 20,
      padding: '3px 10px',
    }}>
      {label}
    </span>
  );
}

function MiniStatCard({ label, value, color }) {
  return (
    <div style={{ flexShrink: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '12px 16px', minWidth: 110 }}>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
