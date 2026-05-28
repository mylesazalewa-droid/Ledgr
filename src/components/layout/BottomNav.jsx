import { motion } from 'framer-motion';
import { LayoutDashboard, Package, DollarSign, Settings, Plus } from 'lucide-react';
import { useApp } from '../../App.jsx';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home',      icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'sold',      label: 'Sold',      icon: DollarSign },
  { id: 'settings',  label: 'Settings',  icon: Settings },
];

export default function BottomNav() {
  const { currentPage, setCurrentPage, setShowAddModal, setSelectedCategory, setSearchQuery } = useApp();

  function navigate(id) {
    setCurrentPage(id);
    setSelectedCategory(null);
    setSearchQuery('');
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 200,
      background: 'var(--bg-void)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      overflow: 'visible',
    }}>
      {/* Fills the safe-area strip below so no gap shows on iOS */}
      <div style={{
        position: 'absolute', top: '100%', left: 0, right: 0,
        height: 200, background: 'var(--bg-void)', pointerEvents: 'none',
      }} />

      {/* Floating pill */}
      <nav style={{
        margin: '8px 12px',
        background: '#1c1c22',
        borderRadius: 28,
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 -2px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
        {NAV_ITEMS.slice(0, 2).map(item => (
          <NavTab key={item.id} item={item} active={currentPage === item.id} onPress={() => navigate(item.id)} />
        ))}

        {/* Centre FAB */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Pulse rings — draw attention to the add button */}
            <div className="fab-ring" style={{ borderRadius: 16 }} />
            <div className="fab-ring fab-ring-2" style={{ borderRadius: 16 }} />

            <motion.button
              whileTap={{ scale: 0.86 }}
              onClick={() => setShowAddModal(true)}
              style={{
                position: 'relative',
                width: 52,
                height: 52,
                borderRadius: 16,
                background: 'var(--accent-gold)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(255,203,116,0.4)',
                touchAction: 'manipulation',
                zIndex: 1,
              }}
            >
              <Plus size={24} color="#111111" strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>

        {NAV_ITEMS.slice(2).map(item => (
          <NavTab key={item.id} item={item} active={currentPage === item.id} onPress={() => navigate(item.id)} />
        ))}
      </nav>
    </div>
  );
}

function NavTab({ item, active, onPress }) {
  const Icon = item.icon;
  return (
    <motion.button
      onClick={onPress}
      whileTap={{ scale: 0.78 }}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '10px 0',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: active ? 'var(--accent-gold)' : 'var(--text-tertiary)',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        transition: 'color 150ms',
      }}
    >
      {/* Icon with active highlight pill */}
      <div style={{
        position: 'relative',
        width: 38,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {active && (
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 10,
            background: 'rgba(255,203,116,0.13)',
            border: '1px solid rgba(255,203,116,0.18)',
          }} />
        )}
        <Icon
          size={20}
          strokeWidth={active ? 2.3 : 1.5}
          style={{ position: 'relative', zIndex: 1, transition: 'stroke-width 150ms' }}
        />
      </div>

      <span style={{
        fontSize:      10,
        fontWeight:    active ? 700 : 400,
        letterSpacing: active ? '0.02em' : 0,
        transition:    'font-weight 150ms',
      }}>
        {item.label}
      </span>
    </motion.button>
  );
}
