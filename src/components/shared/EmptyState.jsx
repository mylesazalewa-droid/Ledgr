import { motion } from 'framer-motion';
import { Package, Plus } from 'lucide-react';
import { useApp } from '../../App.jsx';

export default function EmptyState({
  icon: Icon = Package,
  title = 'Nothing here yet',
  description = 'Add your first item to get started.',
  action,
  actionLabel = 'Add Item',
}) {
  const { setShowAddModal } = useApp();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 60,
        textAlign: 'center',
        height: '100%',
        minHeight: 300,
      }}
    >
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 18,
        background: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border-subtle)',
      }}>
        <Icon size={28} color="var(--text-tertiary)" />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 280 }}>
          {description}
        </div>
      </div>
      {action !== false && (
        <button
          onClick={action || (() => setShowAddModal(true))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 18px',
            borderRadius: 10,
            border: '1px solid var(--border-accent)',
            background: 'rgba(212,168,83,0.08)',
            color: 'var(--accent-gold)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
