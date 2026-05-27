import { motion } from 'framer-motion';
import { Package, TrendingUp, DollarSign, ShoppingBag, ArrowUpRight } from 'lucide-react';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

function StatCard({ icon: Icon, label, value, sub, color, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-card)',
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flex: 1,
      }}
    >
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 11,
        background: `${color}14`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={19} color={color} strokeWidth={1.5} />
      </div>
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 3, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 19,
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1,
        }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>{sub}</div>
        )}
      </div>
    </motion.div>
  );
}

export default function StatsBar({ stats }) {
  const margin = stats.avgMargin != null ? `${stats.avgMargin.toFixed(0)}% avg margin` : null;

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
      <StatCard index={0} icon={Package}      label="In Stock"      value={stats.totalItems}            color="var(--accent-blue)" />
      <StatCard index={1} icon={TrendingUp}   label="Est. Value"    value={fmt(stats.totalValue)}       color="var(--accent-gold)" />
      <StatCard index={2} icon={ShoppingBag}  label="Items Sold"    value={stats.soldCount}             color="var(--accent-green)" />
      <StatCard index={3} icon={DollarSign}   label="Total Earned"  value={fmt(stats.totalEarned)}      color="var(--accent-green)" />
      <StatCard index={4} icon={ArrowUpRight} label="Total Profit"  value={fmt(stats.totalProfit)}      sub={margin} color={stats.totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
    </div>
  );
}
