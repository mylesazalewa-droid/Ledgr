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
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 200,
      background: 'var(--bg-void)',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      // Safe area for iPhone home bar
      paddingBottom: 'env(safe-area-inset-bottom)',
      backdropFilter: 'blur(20px)',
    }}>
      {NAV_ITEMS.slice(0, 2).map(item => <NavTab key={item.id} item={item} active={currentPage === item.id} onPress={() => navigate(item.id)} />)}

      {/* Centre FAB */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowAddModal(true)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'var(--accent-gold)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(212,168,83,0.35)',
          }}
        >
          <Plus size={22} color="#0a0a0b" strokeWidth={2.5} />
        </motion.button>
      </div>

      {NAV_ITEMS.slice(2).map(item => <NavTab key={item.id} item={item} active={currentPage === item.id} onPress={() => navigate(item.id)} />)}
    </nav>
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
        padding: '10px 0 8px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: active ? 'var(--accent-gold)' : 'var(--text-tertiary)',
      }}
    >
      <Icon size={20} strokeWidth={active ? 2 : 1.5} />
      <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{item.label}</span>
    </button>
  );
}
