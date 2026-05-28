import { useState, useEffect, useRef } from 'react';
import { TrendingDown, Zap, Trophy } from 'lucide-react';
import { useApp } from '../App.jsx';
import { createPortal } from 'react-dom';
import StatsBar from '../components/dashboard/StatsBar.jsx';
import EarningsChart from '../components/dashboard/EarningsChart.jsx';
import RecentActivity from '../components/dashboard/RecentActivity.jsx';
import ItemCard from '../components/items/ItemCard.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { ACHIEVEMENTS, getUnlocked, getDeclutterScore, getDeclutterLabel } from '../utils/achievements.js';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

/*
 * Count-up: animates from 0 → target once when target first becomes non-zero.
 * Uses a ref so it only fires once per component lifetime (not on every render).
 */
function useCountUp(target, duration = 1400) {
  const [value, setValue]   = useState(0);
  const hasRun              = useRef(false);
  const rafRef              = useRef(null);

  useEffect(() => {
    if (!target || hasRun.current) return;
    hasRun.current = true;

    const startTime = performance.now();
    const tick = (now) => {
      const p     = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);      // ease-out cubic
      setValue(target * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else       setValue(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}

export default function Dashboard() {
  const { stats, items, categories, setCurrentPage, setShowAddModal, toast } = useApp();
  const isMobile    = useIsMobile();
  const [hoveredAch,  setHoveredAch]  = useState(null);
  const [shownDescAch, setShownDescAch] = useState(null); // long-press on mobile

  // Achievement long-press
  const achTimers = useRef({});
  function onAchTouchStart(id) {
    achTimers.current[id] = setTimeout(() => {
      navigator.vibrate?.(12);
      setShownDescAch(id);
      setTimeout(() => setShownDescAch(v => v === id ? null : v), 2600);
    }, 480);
  }
  function onAchTouchEnd(id)  { clearTimeout(achTimers.current[id]); }

  // Hero card long-press → share/copy
  const heroLongTimer = useRef(null);
  const heroLongFired = useRef(false);
  function onHeroTouchStart() {
    heroLongFired.current = false;
    heroLongTimer.current = setTimeout(() => {
      heroLongFired.current = true;
      navigator.vibrate?.(20);
      const text = `My Ledgr: ${fmt(stats.totalValue)} locked up · ${stats.totalItems ?? 0} items · ${fmt(stats.totalEarned)} earned`;
      if (navigator.share) {
        navigator.share({ title: 'Ledgr Portfolio', text }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(text);
        toast?.('Portfolio summary copied', 'success');
      }
    }, 500);
  }
  function onHeroTouchEnd()  { clearTimeout(heroLongTimer.current); }
  function onHeroTouchMove() { clearTimeout(heroLongTimer.current); }

  const stallingItems = stats.longestSitting?.filter(i => i.days_listed <  60) ?? [];
  const agingItems    = stats.longestSitting?.filter(i => i.days_listed >= 60 && i.days_listed < 90) ?? [];
  const stuckItems    = stats.longestSitting?.filter(i => i.days_listed >= 90) ?? [];
  const hasAttention  = (stats.longestSitting?.length ?? 0) > 0;

  const declutterScore = getDeclutterScore(stats);
  const declutterLabel = getDeclutterLabel(declutterScore);
  const unlockedIds    = new Set(getUnlocked(stats).map(a => a.id));

  const heroValue = useCountUp(stats.totalValue);

  const pad = isMobile ? 16 : 24;

  return (
    <div style={{ padding: pad, maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Greeting ── */}
      {isMobile && (
        <div style={{
          marginBottom: 18,
          animation: 'fadeSlideUp 0.35s cubic-bezier(0.32,0.72,0,1) both',
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Your Ledgr 📦
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Here's what you've got
          </div>
        </div>
      )}

      {/* ── Trapped Value Hero — animated bezel ── */}
      <div
        className="hero-bezel"
        onTouchStart={onHeroTouchStart}
        onTouchEnd={onHeroTouchEnd}
        onTouchMove={onHeroTouchMove}
        style={{
          borderRadius:  isMobile ? 22 : 20,
          marginBottom:  isMobile ? 14 : 18,
          animation:     'fadeSlideUp 0.4s cubic-bezier(0.32,0.72,0,1) 0.05s both',
        }}
      >
        {/* inner card — 1.5px smaller radius so the bezel strip is visible */}
        <div style={{
          background:   'linear-gradient(135deg, #1e1a10 0%, #16140c 50%, #0f0e09 100%)',
          borderRadius: isMobile ? 21 : 19,
          padding:      isMobile ? '22px 22px 20px' : '28px 32px 24px',
          position:     'relative',
          overflow:     'hidden',
          zIndex:       1,
        }}>
          {/* floating orbs */}
          <div className="orb-drift-1" style={{
            position: 'absolute', top: -40, right: -40,
            width: 180, height: 180, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,203,116,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div className="orb-drift-2" style={{
            position: 'absolute', bottom: -20, left: -20,
            width: 120, height: 120, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,203,116,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'rgba(255,203,116,0.55)', marginBottom: 6,
            }}>
              Money sitting in your house
            </div>

            {/* animated count-up value */}
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   isMobile ? 48 : 60,
              fontWeight: 700,
              color:      'var(--accent-gold)',
              lineHeight: 1,
              marginBottom: 12,
              letterSpacing: '-0.02em',
            }}>
              {fmt(heroValue || stats.totalValue)}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 8 : 14, alignItems: 'center' }}>
              <Chip label={`${stats.totalItems ?? 0} items`} />
              {stats.soldCount > 0 && <Chip label={`${fmt(stats.totalEarned)} earned`} accent="green" />}
              {stats.totalProfit > 0 && <Chip label={`${fmt(stats.totalProfit)} profit`}  accent="green" />}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Actions (mobile only) ── */}
      {isMobile && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14,
          animation: 'fadeSlideUp 0.4s cubic-bezier(0.32,0.72,0,1) 0.1s both',
        }}>
          <QuickAction
            icon="➕" label="Add Item"
            color="rgba(255,203,116,0.1)" borderColor="rgba(255,203,116,0.2)" textColor="var(--accent-gold)"
            onClick={() => setShowAddModal(true)}
          />
          <QuickAction
            icon="📦" label="Inventory"
            color="rgba(91,142,240,0.1)" borderColor="rgba(91,142,240,0.18)" textColor="var(--accent-blue)"
            onClick={() => setCurrentPage('inventory')}
          />
          <QuickAction
            icon="💰" label="Sold"
            color="rgba(76,175,125,0.1)" borderColor="rgba(76,175,125,0.18)" textColor="var(--accent-green)"
            onClick={() => setCurrentPage('sold')}
          />
        </div>
      )}

      {/* ── Declutter Score ── */}
      {(stats.soldCount > 0 || stats.totalItems > 0) && (
        <div style={{
          background:   'var(--bg-surface)',
          border:       '1px solid var(--border-subtle)',
          borderRadius: isMobile ? 18 : 14,
          padding:      isMobile ? '14px 18px' : '16px 22px',
          marginBottom: isMobile ? 14 : 18,
          display: 'flex', alignItems: 'center', gap: 16,
          animation: 'fadeSlideUp 0.4s cubic-bezier(0.32,0.72,0,1) 0.15s both',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6,
            }}>
              Declutter Score
            </div>
            <div style={{ height: 7, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{
                height: '100%', width: `${declutterScore}%`,
                background: declutterScore >= 80
                  ? 'var(--accent-green)'
                  : declutterScore >= 40
                    ? 'linear-gradient(90deg, var(--accent-gold), #f0c060)'
                    : 'var(--accent-blue)',
                borderRadius: 99,
                transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{declutterLabel}</div>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize:   isMobile ? 32 : 36,
            fontWeight: 700,
            color:      declutterScore >= 80 ? 'var(--accent-green)' : 'var(--accent-gold)',
            lineHeight: 1,
          }}>
            {declutterScore}<span style={{ fontSize: '0.45em', color: 'var(--text-tertiary)' }}>%</span>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ animation: 'fadeSlideUp 0.4s cubic-bezier(0.32,0.72,0,1) 0.2s both' }}>
        {isMobile ? (
          <div style={{
            display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 14,
            paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
          }}>
            <MiniStatCard label="In Stock"   value={stats.totalItems ?? 0}        color="var(--accent-blue)"  />
            <MiniStatCard label="Est. Value" value={fmt(stats.totalValue)}         color="var(--accent-gold)"  />
            <MiniStatCard label="Sold"       value={stats.soldCount ?? 0}          color="var(--accent-green)" />
            <MiniStatCard label="Earned"     value={fmt(stats.totalEarned)}        color="var(--accent-green)" />
            <MiniStatCard label="Profit"     value={fmt(stats.totalProfit)}
              color={(stats.totalProfit ?? 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
            />
          </div>
        ) : (
          <StatsBar stats={stats} />
        )}
      </div>

      {/* ── Insights Strip ── */}
      <div style={{ animation: 'fadeSlideUp 0.4s cubic-bezier(0.32,0.72,0,1) 0.22s both' }}>
        <InsightsStrip items={items} categories={categories} />
      </div>

      {/* ── Charts + Activity ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? 12 : 16,
        marginBottom: isMobile ? 14 : 22,
        animation: 'fadeSlideUp 0.4s cubic-bezier(0.32,0.72,0,1) 0.25s both',
      }}>
        <EarningsChart monthlyEarnings={stats.monthlyEarnings} />
        <RecentActivity />
      </div>

      {/* ── Sales Heatmap ── */}
      <SalesHeatmap items={items} />

      {/* ── Needs Attention ── */}
      {hasAttention && (
        <div style={{
          marginBottom: 8,
          animation: 'fadeSlideUp 0.4s cubic-bezier(0.32,0.72,0,1) 0.3s both',
        }}>
          <SectionHeader icon={<TrendingDown size={14} color="var(--accent-red)" />} label="Needs Attention" />
          {stuckItems.length   > 0 && <AttentionTier items={stuckItems}   isMobile={isMobile} badgeColor="#e05c5c" suggestion="3+ months — drop price or donate" />}
          {agingItems.length   > 0 && <AttentionTier items={agingItems}   isMobile={isMobile} badgeColor="#d4a853" suggestion="Over 60 days — consider a price drop" />}
          {stallingItems.length > 0 && <AttentionTier items={stallingItems} isMobile={isMobile} badgeColor="#888891" suggestion="30+ days listed — monitor closely" />}
        </div>
      )}

      {/* ── Achievements ── */}
      <div style={{
        marginTop: isMobile ? 20 : 28,
        animation: 'fadeSlideUp 0.4s cubic-bezier(0.32,0.72,0,1) 0.35s both',
      }}>
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
            const earned  = unlockedIds.has(a.id);
            const hovered = hoveredAch === a.id;
            const showDesc = hovered || shownDescAch === a.id;
            return (
              <div
                key={a.id}
                className={`achieve-card${earned ? ' earn' : ''}`}
                onMouseEnter={() => setHoveredAch(a.id)}
                onMouseLeave={() => setHoveredAch(null)}
                onTouchStart={() => onAchTouchStart(a.id)}
                onTouchEnd={() => onAchTouchEnd(a.id)}
                onTouchMove={() => onAchTouchEnd(a.id)}
                style={{
                  background: earned
                    ? 'linear-gradient(135deg, rgba(255,203,116,0.12), rgba(255,203,116,0.04))'
                    : 'var(--bg-surface)',
                  border: `1px solid ${earned
                    ? (hovered ? 'rgba(255,203,116,0.55)' : 'rgba(255,203,116,0.3)')
                    : 'var(--border-subtle)'}`,
                  borderRadius:  isMobile ? 16 : 12,
                  padding:       isMobile ? '12px 8px' : '14px 12px',
                  display:       'flex',
                  flexDirection: 'column',
                  alignItems:    'center',
                  gap:           5,
                  opacity:       earned ? 1 : 0.42,
                  cursor:        'default',
                  userSelect:    'none',
                  WebkitTapHighlightColor: 'transparent',
                  minHeight:     isMobile ? 86 : 96,
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: isMobile ? 26 : 30, lineHeight: 1 }}>
                  {earned ? a.icon : '🔒'}
                </span>
                <span style={{
                  fontSize:   10,
                  fontWeight: 600,
                  color:      earned ? 'var(--accent-gold)' : 'var(--text-tertiary)',
                  textAlign:  'center',
                  lineHeight: 1.3,
                }}>
                  {a.label}
                </span>
                {showDesc && (
                  <span style={{
                    fontSize:   9,
                    color:      earned ? 'rgba(255,203,116,0.55)' : 'rgba(255,255,255,0.35)',
                    textAlign:  'center',
                    lineHeight: 1.4,
                    animation:  'fadeSlideUp 0.15s ease both',
                  }}>
                    {earned ? a.desc : a.desc}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isMobile && <div style={{ height: 8 }} />}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 8, marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {icon}
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {label}
        </span>
      </div>
      {right}
    </div>
  );
}

function QuickAction({ icon, label, color, borderColor, textColor, onClick }) {
  return (
    <button
      className="quick-action"
      onClick={onClick}
      style={{
        background:  color,
        border:      `1px solid ${borderColor}`,
        borderRadius: 16,
        padding:     '14px 8px',
        display:     'flex',
        flexDirection: 'column',
        alignItems:  'center',
        gap:         7,
        cursor:      'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        width:       '100%',
      }}
    >
      <span style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: textColor, letterSpacing: '0.01em' }}>{label}</span>
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: isMobile ? 10 : 12,
      }}>
        {items.map((item, i) => (
          <div key={item.id} style={{ position: 'relative' }}>
            <ItemCard item={item} index={i} />
            <div style={{
              position: 'absolute', top: 8, right: 8,
              background: badgeColor, borderRadius: 6,
              padding: '2px 7px', fontSize: 10, fontWeight: 700, color: '#fff', zIndex: 2,
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
  const colors = {
    green: { text: 'var(--accent-green)', bg: 'rgba(76,175,125,0.14)',  border: 'rgba(76,175,125,0.22)'  },
    gold:  { text: 'var(--accent-gold)',  bg: 'rgba(255,203,116,0.12)', border: 'rgba(255,203,116,0.22)' },
  };
  const c = colors[accent] ?? null;
  return (
    <span style={{
      fontSize:   11,
      color:      c ? c.text   : 'rgba(255,255,255,0.5)',
      background: c ? c.bg     : 'rgba(255,255,255,0.06)',
      border:    `1px solid ${c ? c.border : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 20,
      padding: '3px 10px',
    }}>
      {label}
    </span>
  );
}

function MiniStatCard({ label, value, color }) {
  const { toast } = useApp();
  const longTimer = useRef(null);
  const longFired = useRef(false);

  function onTouchStart() {
    longFired.current = false;
    longTimer.current = setTimeout(() => {
      longFired.current = true;
      navigator.vibrate?.(14);
      navigator.clipboard?.writeText(String(value));
      toast?.(`${label} copied`, 'success');
    }, 480);
  }
  function onTouchEnd()  { clearTimeout(longTimer.current); }
  function onTouchMove() { clearTimeout(longTimer.current); }

  return (
    <div
      className="mini-stat-card"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
      style={{
        flexShrink:   0,
        background:   'var(--bg-surface)',
        border:       '1px solid var(--border-subtle)',
        borderRadius: 14,
        padding:      '12px 16px',
        minWidth:     110,
      }}
    >
      <div style={{
        fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600,
        letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}

// ── Insights Strip ────────────────────────────────────────────────────────────
function InsightsStrip({ items, categories }) {
  const soldItems = (items || []).filter(i => i.status === 'sold');
  if (soldItems.length === 0) return null;

  const now            = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const thisMonthEarned = soldItems
    .filter(i => i.sold_at && new Date(i.sold_at) >= thisMonthStart)
    .reduce((s, i) => s + (i.sold_price || 0), 0);
  const lastMonthEarned = soldItems
    .filter(i => i.sold_at && new Date(i.sold_at) >= lastMonthStart && new Date(i.sold_at) <= lastMonthEnd)
    .reduce((s, i) => s + (i.sold_price || 0), 0);
  const monthDelta = lastMonthEarned > 0
    ? Math.round(((thisMonthEarned - lastMonthEarned) / lastMonthEarned) * 100)
    : null;

  const sellTimes = soldItems
    .filter(i => i.sold_at && i.added_at)
    .map(i => (new Date(i.sold_at) - new Date(i.added_at)) / 86400000);
  const avgSellTime = sellTimes.length > 0
    ? Math.round(sellTimes.reduce((s, v) => s + v, 0) / sellTimes.length)
    : null;

  const platCounts = {};
  soldItems.forEach(i => {
    if (i.sold_platform) platCounts[i.sold_platform] = (platCounts[i.sold_platform] || 0) + 1;
  });
  const topPlatformEntry = Object.entries(platCounts).sort((a, b) => b[1] - a[1])[0];

  const soldWithCost = soldItems.filter(i => i.cost_price > 0 && i.sold_price > 0);
  const totalCost    = soldWithCost.reduce((s, i) => s + i.cost_price, 0);
  const totalProfit  = soldWithCost.reduce((s, i) => s + (i.sold_price - i.cost_price), 0);
  const roi          = totalCost > 0 ? Math.round((totalProfit / totalCost) * 100) : null;

  const catProfit = {};
  soldItems.forEach(i => {
    if (i.category_id && i.cost_price > 0 && i.sold_price > 0)
      catProfit[i.category_id] = (catProfit[i.category_id] || 0) + (i.sold_price - i.cost_price);
  });
  const topCatEntry = Object.entries(catProfit).sort((a, b) => b[1] - a[1])[0];
  const topCat      = topCatEntry ? (categories || []).find(c => c.id === topCatEntry[0]) : null;

  const insights = [
    thisMonthEarned > 0 && {
      label: 'This Month',
      value: fmt(thisMonthEarned),
      sub:   monthDelta !== null
        ? `${monthDelta >= 0 ? '+' : ''}${monthDelta}% vs last month`
        : 'first month selling',
      color: 'var(--accent-gold)',
    },
    avgSellTime !== null && {
      label: 'Avg Sell Time',
      value: `${avgSellTime}d`,
      sub:   avgSellTime <= 14 ? 'Fast mover 🔥' : avgSellTime <= 45 ? 'Steady pace' : 'Slow burn',
      color: avgSellTime <= 14 ? 'var(--accent-green)' : avgSellTime <= 45 ? 'var(--accent-gold)' : 'var(--accent-red)',
    },
    roi !== null && {
      label: 'ROI',
      value: `${roi}%`,
      sub:   `${soldWithCost.length} tracked sale${soldWithCost.length !== 1 ? 's' : ''}`,
      color: roi >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
    },
    topPlatformEntry && {
      label: 'Top Platform',
      value: topPlatformEntry[0],
      sub:   `${topPlatformEntry[1]} sale${topPlatformEntry[1] !== 1 ? 's' : ''}`,
      color: 'var(--accent-blue)',
    },
    topCat && {
      label: 'Best Category',
      value: topCat.name,
      sub:   `${fmt(topCatEntry[1])} profit`,
      color: topCat.color,
    },
  ].filter(Boolean);

  if (insights.length === 0) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        className="no-scrollbar"
        style={{
          display: 'flex', gap: 10, overflowX: 'auto',
          paddingBottom: 4, WebkitOverflowScrolling: 'touch',
        }}
      >
        {insights.map((ins, i) => <InsightCard key={i} {...ins} />)}
      </div>
    </div>
  );
}

function InsightCard({ label, value, sub, color }) {
  return (
    <div style={{
      flexShrink:   0,
      background:   'var(--bg-surface)',
      border:       '1px solid var(--border-subtle)',
      borderRadius: 14,
      padding:      '12px 14px',
      minWidth:     118,
      maxWidth:     148,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 5,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily:   'var(--font-mono)',
        fontSize:     16,
        fontWeight:   700,
        color,
        marginBottom: 3,
        overflow:     'hidden',
        textOverflow: 'ellipsis',
        whiteSpace:   'nowrap',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.35 }}>
        {sub}
      </div>
    </div>
  );
}

// ── Sales Heatmap ─────────────────────────────────────────────────────────────
function SalesHeatmap({ items }) {
  const soldItems = (items || []).filter(i => i.status === 'sold' && i.sold_at);
  if (soldItems.length === 0) return null;

  const soldByDate = {};
  soldItems.forEach(i => {
    const d = new Date(i.sold_at).toISOString().split('T')[0];
    soldByDate[d] = (soldByDate[d] || 0) + 1;
  });

  const today = new Date();
  const grid  = Array.from({ length: 364 }, (_, idx) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (363 - idx));
    const dateStr = d.toISOString().split('T')[0];
    return { date: dateStr, count: soldByDate[dateStr] || 0 };
  });

  const weeks = Array.from({ length: 52 }, (_, w) => grid.slice(w * 7, w * 7 + 7));

  const totalSales = grid.reduce((s, d) => s + d.count, 0);
  const activeDays = grid.filter(d => d.count > 0).length;

  function cellBg(count) {
    if (count === 0) return 'rgba(255,255,255,0.05)';
    if (count === 1) return 'rgba(255,203,116,0.28)';
    if (count === 2) return 'rgba(255,203,116,0.58)';
    return 'var(--accent-gold)';
  }

  return (
    <div style={{
      background:   'var(--bg-surface)',
      border:       '1px solid var(--border-subtle)',
      borderRadius: 14,
      padding:      '14px 16px',
      marginBottom: 16,
      animation:    'fadeSlideUp 0.4s cubic-bezier(0.32,0.72,0,1) 0.28s both',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: 'var(--text-secondary)',
        }}>
          Sales Activity
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          {totalSales} sale{totalSales !== 1 ? 's' : ''} · {activeDays} active day{activeDays !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="no-scrollbar" style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 2.5, minWidth: 'max-content' }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {week.map((day, di) => (
                <div
                  key={di}
                  title={day.count > 0
                    ? `${day.date}: ${day.count} sale${day.count !== 1 ? 's' : ''}`
                    : day.date}
                  style={{
                    width:        10,
                    height:       10,
                    borderRadius: 2.5,
                    background:   cellBg(day.count),
                    flexShrink:   0,
                    transition:   'background 120ms',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        marginTop: 8, justifyContent: 'flex-end',
      }}>
        <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>Less</span>
        {[0, 1, 2, 3].map(n => (
          <div key={n} style={{ width: 9, height: 9, borderRadius: 2, background: cellBg(n) }} />
        ))}
        <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>More</span>
      </div>
    </div>
  );
}
