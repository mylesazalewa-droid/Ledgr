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
      // The background here fills the safe-area strip below the pill.
      // The 200px overflow below ensures iOS keyboard-dismiss snap never
      // reveals a gap — the extra area is clipped by the screen edge.
      background: 'var(--bg-void)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      overflow: 'visible',
    }}>
      {/* This invisible div extends the bg-void fill far below the screen */}
      <div style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        height: 200,
        background: 'var(--bg-void)',
        pointerEvents: 'none',
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
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setShowAddModal(true)}
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'var(--accent-gold)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(212,168,83,0.45)',
              touchAction: 'manipulation',
            }}
          >
            <Plus size={24} color="#0a0a0b" strokeWidth={2.5} />
          </motion.button>
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
    <button
      onClick={onPress}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '12px 0 10px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: active ? 'var(--accent-gold)' : 'var(--text-tertiary)',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        transition: 'color 120ms',
      }}
    >
      <Icon size={20} strokeWidth={active ? 2.2 : 1.5} />
      <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: active ? '0.01em' : 0 }}>
        {item.label}
      </span>
    </button>
  );
}
