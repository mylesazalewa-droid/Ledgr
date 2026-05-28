import { useState } from 'react';
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
  const [pressed, setPressed] = useState(false);

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
        gap: 20,
        padding: 60,
        textAlign: 'center',
        height: '100%',
        minHeight: 300,
      }}
    >
      {/* Floating icon with glow */}
      <div className="icon-float" style={{ position: 'relative' }}>
        {/* Glow backdrop */}
        <div style={{
          position: 'absolute',
          inset: -12,
          borderRadius: 30,
          background: 'radial-gradient(circle, rgba(255,203,116,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 22,
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255,203,116,0.15)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          position: 'relative',
        }}>
          <Icon size={30} color="var(--text-tertiary)" />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 7 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 260, lineHeight: 1.6 }}>
          {description}
        </div>
      </div>

      {action !== false && (
        <motion.button
          whileTap={{ scale: 0.94 }}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          onClick={action || (() => setShowAddModal(true))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '10px 22px',
            borderRadius: 14,
            border: '1px solid rgba(255,203,116,0.3)',
            background: pressed ? 'rgba(255,203,116,0.14)' : 'rgba(255,203,116,0.08)',
            color: 'var(--accent-gold)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            transition: 'background 100ms',
            boxShadow: '0 0 20px rgba(255,203,116,0.08)',
          }}
        >
          <Plus size={15} />
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}
