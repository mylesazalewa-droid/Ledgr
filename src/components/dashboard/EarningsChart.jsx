import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { format, parseISO } from 'date-fns';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
        {fmt(payload[0]?.value)}
      </div>
    </div>
  );
}

export default function EarningsChart({ monthlyEarnings }) {
  if (!monthlyEarnings?.length) {
    return (
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-card)',
        padding: '24px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 200,
        color: 'var(--text-tertiary)',
        fontSize: 13,
      }}>
        No sales data yet
      </div>
    );
  }

  const data = monthlyEarnings.map(row => ({
    month: (() => {
      try { return format(parseISO(`${row.month}-01`), 'MMM'); }
      catch { return row.month; }
    })(),
    total: row.total,
  }));

  const maxVal = Math.max(...data.map(d => d.total));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-card)',
        padding: '20px 20px 12px',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Monthly Earnings</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Last 12 months</div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barSize={24} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
            tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.total === maxVal ? 'var(--accent-gold)' : 'var(--bg-elevated)'}
                stroke={entry.total === maxVal ? 'var(--accent-gold)' : 'var(--border-subtle)'}
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
