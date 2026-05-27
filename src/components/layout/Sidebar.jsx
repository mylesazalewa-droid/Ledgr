import { motion } from 'framer-motion';
import {
  LayoutDashboard, Package, DollarSign, Settings,
  Plus, Cpu, Zap, Home, Shirt, Wrench, Star, Bike, Box,
} from 'lucide-react';
import { useApp } from '../../App.jsx';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory',  icon: Package },
  { id: 'sold',      label: 'Sold',       icon: DollarSign },
  { id: 'settings',  label: 'Settings',   icon: Settings },
];

const ICON_MAP = {
  Cpu, Zap, Home, Shirt, Wrench, Star, Bike, Box,
  LayoutDashboard, Package, DollarSign, Settings,
};

function CategoryIcon({ name, size = 14 }) {
  const Icon = ICON_MAP[name] || Box;
  return <Icon size={size} />;
}

export default function Sidebar() {
  const {
    currentPage, setCurrentPage,
    selectedCategory, setSelectedCategory,
    setSearchQuery,
    categories,
    items,
  } = useApp();

  const availableItems = items.filter(i => i.status !== 'sold');

  function countForCategory(catId) {
    return availableItems.filter(i => i.category_id === catId).length;
  }

  function navigate(page) {
    setCurrentPage(page);
    setSelectedCategory(null);
    setSearchQuery('');
  }

  function selectCategory(catId) {
    setCurrentPage('inventory');
    setSelectedCategory(catId === selectedCategory ? null : catId);
  }

  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      background: 'var(--bg-void)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      paddingTop: 52, // space for macOS traffic lights
    }}>
      {/* Logo */}
      <div style={{ padding: '0 20px 24px' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          color: 'var(--accent-gold)',
          letterSpacing: '-0.02em',
        }}>
          Stash
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
          Resale Inventory
        </div>
      </div>

      {/* Main nav */}
      <nav style={{ padding: '0 10px', marginBottom: 8 }}>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => navigate(item.id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: active ? 'var(--bg-elevated)' : 'transparent',
                textAlign: 'left',
                transition: 'all 80ms ease',
              }}
            >
              <Icon
                size={16}
                color={active ? 'var(--accent-gold)' : 'var(--text-tertiary)'}
              />
              {item.label}
            </motion.button>
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 20px 16px' }} />

      {/* Categories */}
      <div style={{ padding: '0 10px', flex: 1, overflow: 'auto' }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: 'var(--text-tertiary)',
          padding: '0 12px',
          marginBottom: 6,
          textTransform: 'uppercase',
        }}>
          Categories
        </div>

        {/* All Items shortcut */}
        <motion.button
          onClick={() => selectCategory(null)}
          whileHover={{ x: 2 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '7px 12px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: !selectedCategory && currentPage === 'inventory'
              ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: !selectedCategory && currentPage === 'inventory'
              ? 'var(--bg-elevated)' : 'transparent',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Box size={13} color="var(--text-tertiary)" />
            All Items
          </div>
          <span style={{
            fontSize: 10,
            color: 'var(--text-tertiary)',
            background: 'var(--bg-elevated)',
            padding: '1px 6px',
            borderRadius: 10,
          }}>
            {availableItems.length}
          </span>
        </motion.button>

        {categories.map(cat => {
          const count = countForCategory(cat.id);
          const active = selectedCategory === cat.id;
          return (
            <motion.button
              key={cat.id}
              onClick={() => selectCategory(cat.id)}
              whileHover={{ x: 2 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '7px 12px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: active ? 'var(--bg-elevated)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: cat.color }}>
                  <CategoryIcon name={cat.icon} size={13} />
                </span>
                {cat.name}
              </div>
              {count > 0 && (
                <span style={{
                  fontSize: 10,
                  color: 'var(--text-tertiary)',
                  background: 'var(--bg-elevated)',
                  padding: '1px 6px',
                  borderRadius: 10,
                }}>
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Add Item button */}
      <div style={{ padding: 12 }}>
        <AddItemButton />
      </div>
    </aside>
  );
}

function AddItemButton() {
  const { setShowAddModal } = useApp();
  return (
    <motion.button
      onClick={() => setShowAddModal(true)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        width: '100%',
        padding: '9px 16px',
        borderRadius: 10,
        border: '1px solid var(--border-accent)',
        background: 'rgba(212,168,83,0.08)',
        color: 'var(--accent-gold)',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 80ms ease',
      }}
    >
      <Plus size={15} />
      Add Item
    </motion.button>
  );
}
