import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Package, DollarSign, Settings,
  Plus, Cpu, Zap, Home, MapPin, Shirt, Wrench, Star, Bike, Box,
} from 'lucide-react';
import { useApp } from '../../App.jsx';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'house',     label: 'Home Map',  icon: Home },
  { id: 'sold',      label: 'Sold',      icon: DollarSign },
  { id: 'settings',  label: 'Settings',  icon: Settings },
];

const ICON_MAP = {
  Cpu, Zap, Home, Shirt, Wrench, Star, Bike, Box,
  LayoutDashboard, Package, DollarSign, Settings,
};

function CategoryIcon({ name, size = 13 }) {
  const Icon = ICON_MAP[name] || Box;
  return <Icon size={size} />;
}

// ── Nav row ───────────────────────────────────────────────────────────────────
function NavRow({ item, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:      'relative',
        display:       'flex',
        alignItems:    'center',
        gap:           10,
        width:         '100%',
        padding:       '7px 10px',
        borderRadius:  8,
        border:        'none',
        cursor:        'pointer',
        fontSize:      13,
        fontWeight:    active ? 600 : 400,
        letterSpacing: active ? '-0.01em' : 0,
        color:         active ? 'var(--text-primary)' : hovered ? 'var(--text-secondary)' : 'var(--text-tertiary)',
        background:    active
          ? 'rgba(255,203,116,0.07)'
          : hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        textAlign:     'left',
        transition:    'background 100ms ease, color 100ms ease',
      }}
    >
      {/* Gold left accent bar */}
      <div style={{
        position:     'absolute',
        left:         0,
        top:          '18%',
        bottom:       '18%',
        width:        3,
        borderRadius: '0 3px 3px 0',
        background:   'var(--accent-gold)',
        opacity:      active ? 1 : 0,
        transition:   'opacity 120ms ease',
      }} />

      {/* Icon container */}
      <div style={{
        width:        28,
        height:       28,
        borderRadius: 7,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        flexShrink:   0,
        background:   active ? 'rgba(255,203,116,0.11)' : 'transparent',
        border:       active ? '1px solid rgba(255,203,116,0.16)' : '1px solid transparent',
        transition:   'background 120ms ease, border-color 120ms ease',
      }}>
        <Icon
          size={15}
          color={active ? 'var(--accent-gold)' : hovered ? 'var(--text-secondary)' : 'var(--text-tertiary)'}
        />
      </div>

      {item.label}
    </motion.button>
  );
}

// ── Category row ──────────────────────────────────────────────────────────────
function CategoryRow({ cat, active, count, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:      'relative',
        display:       'flex',
        alignItems:    'center',
        justifyContent: 'space-between',
        width:         '100%',
        padding:       '6px 10px',
        borderRadius:  7,
        border:        'none',
        cursor:        'pointer',
        fontSize:      12,
        fontWeight:    active ? 600 : 400,
        color:         active ? 'var(--text-primary)' : hovered ? 'var(--text-secondary)' : 'var(--text-tertiary)',
        background:    active
          ? `${cat.color}12`
          : hovered ? 'rgba(255,255,255,0.028)' : 'transparent',
        transition:    'background 100ms ease, color 100ms ease',
        textAlign:     'left',
      }}
    >
      {/* Category-colored left bar */}
      <div style={{
        position:     'absolute',
        left:         0,
        top:          '18%',
        bottom:       '18%',
        width:        3,
        borderRadius: '0 3px 3px 0',
        background:   cat.color,
        opacity:      active ? 1 : 0,
        transition:   'opacity 120ms ease',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Colored dot */}
        <div style={{
          width:        6,
          height:       6,
          borderRadius: '50%',
          flexShrink:   0,
          background:   cat.color,
          opacity:      active ? 1 : 0.55,
          transition:   'opacity 100ms ease',
          boxShadow:    active ? `0 0 6px ${cat.color}88` : 'none',
        }} />
        {cat.name}
      </div>

      {count > 0 && (
        <span style={{
          fontSize:    10,
          fontFamily:  'var(--font-mono)',
          fontWeight:  600,
          color:       active ? cat.color : 'var(--text-tertiary)',
          background:  active ? `${cat.color}18` : 'rgba(255,255,255,0.06)',
          padding:     '1px 7px',
          borderRadius: 20,
          transition:  'color 100ms, background 100ms',
          flexShrink:  0,
        }}>
          {count}
        </span>
      )}
    </motion.button>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar() {
  const {
    currentPage, setCurrentPage,
    selectedCategory, setSelectedCategory,
    setSearchQuery,
    categories,
    items,
    stats,
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

  const [allHovered, setAllHovered] = useState(false);
  const allActive = !selectedCategory && currentPage === 'inventory';

  return (
    <aside style={{
      width:           220,
      flexShrink:      0,
      background:      'var(--bg-void)',
      borderRight:     '1px solid var(--border-subtle)',
      display:         'flex',
      flexDirection:   'column',
      paddingTop:      48,
      position:        'relative',
      overflow:        'hidden',
    }}>

      {/* Ambient top glow */}
      <div style={{
        position:      'absolute',
        top:           -40,
        left:          '50%',
        transform:     'translateX(-50%)',
        width:         280,
        height:        240,
        background:    'radial-gradient(ellipse at 50% 0%, rgba(255,203,116,0.07) 0%, transparent 65%)',
        pointerEvents: 'none',
        zIndex:        0,
      }} />

      {/* ── Logo ── */}
      <div style={{ padding: '0 16px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* App icon */}
          <div style={{
            width:        32,
            height:       32,
            borderRadius: 9,
            background:   'linear-gradient(145deg, rgba(255,203,116,0.18) 0%, rgba(255,203,116,0.06) 100%)',
            border:       '1px solid rgba(255,203,116,0.22)',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            flexShrink:   0,
          }}>
            <DollarSign size={14} color="var(--accent-gold)" strokeWidth={2} />
          </div>

          <div>
            <div style={{
              fontFamily:    'var(--font-display)',
              fontSize:      19,
              color:         'var(--text-primary)',
              letterSpacing: '-0.025em',
              lineHeight:    1.1,
            }}>
              Ledgr
            </div>
            <div style={{
              fontSize:      10,
              color:         'var(--text-tertiary)',
              letterSpacing: '0.04em',
              marginTop:     1,
            }}>
              Resale Tracker
            </div>
          </div>
        </div>
      </div>

      {/* ── Main nav ── */}
      <nav style={{ padding: '0 8px', marginBottom: 6, position: 'relative', zIndex: 1 }}>
        {NAV_ITEMS.map(item => (
          <NavRow
            key={item.id}
            item={item}
            active={currentPage === item.id}
            onClick={() => navigate(item.id)}
          />
        ))}
      </nav>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 14px 12px', position: 'relative', zIndex: 1 }} />

      {/* ── Categories ── */}
      <div style={{ padding: '0 8px', flex: 1, overflow: 'auto', position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize:      10,
          fontWeight:    600,
          letterSpacing: '0.1em',
          color:         'var(--text-tertiary)',
          padding:       '0 10px',
          marginBottom:  6,
          textTransform: 'uppercase',
          opacity:       0.7,
        }}>
          Categories
        </div>

        {/* All Items */}
        <motion.button
          onClick={() => selectCategory(null)}
          whileTap={{ scale: 0.97 }}
          onMouseEnter={() => setAllHovered(true)}
          onMouseLeave={() => setAllHovered(false)}
          style={{
            position:      'relative',
            display:       'flex',
            alignItems:    'center',
            justifyContent: 'space-between',
            width:         '100%',
            padding:       '6px 10px',
            borderRadius:  7,
            border:        'none',
            cursor:        'pointer',
            fontSize:      12,
            fontWeight:    allActive ? 600 : 400,
            color:         allActive ? 'var(--text-primary)' : allHovered ? 'var(--text-secondary)' : 'var(--text-tertiary)',
            background:    allActive
              ? 'rgba(255,255,255,0.055)'
              : allHovered ? 'rgba(255,255,255,0.028)' : 'transparent',
            transition:    'background 100ms, color 100ms',
            textAlign:     'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--text-tertiary)', opacity: allActive ? 0.7 : 0.35, flexShrink: 0,
            }} />
            All Items
          </div>
          <span style={{
            fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600,
            color: 'var(--text-tertiary)',
            background: 'rgba(255,255,255,0.06)',
            padding: '1px 7px', borderRadius: 20, flexShrink: 0,
          }}>
            {availableItems.length}
          </span>
        </motion.button>

        {categories.map(cat => (
          <CategoryRow
            key={cat.id}
            cat={cat}
            active={selectedCategory === cat.id}
            count={countForCategory(cat.id)}
            onClick={() => selectCategory(cat.id)}
          />
        ))}
      </div>

      {/* ── Bottom ── */}
      <div style={{
        padding:    '12px 12px 14px',
        borderTop:  '1px solid var(--border-subtle)',
        position:   'relative',
        zIndex:     1,
      }}>
        {/* Portfolio summary */}
        {availableItems.length > 0 && (
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            padding:        '0 4px',
            marginBottom:   10,
          }}>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
              {availableItems.length} listed
            </span>
            {(stats?.totalValue ?? 0) > 0 && (
              <span style={{
                fontSize:   10,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color:      'rgba(255,203,116,0.55)',
              }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(stats.totalValue)}
              </span>
            )}
          </div>
        )}

        <AddItemButton />
      </div>
    </aside>
  );
}

// ── Add Item button ────────────────────────────────────────────────────────────
function AddItemButton() {
  const { setShowAddModal } = useApp();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={() => setShowAddModal(true)}
      whileTap={{ scale: 0.97 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            7,
        width:          '100%',
        padding:        '9px 16px',
        borderRadius:   9,
        border:         'none',
        background:     hovered
          ? 'rgba(255,203,116,0.92)'
          : 'var(--accent-gold)',
        color:          '#111111',
        fontSize:       12,
        fontWeight:     700,
        letterSpacing:  '0.01em',
        cursor:         'pointer',
        transition:     'background 100ms ease, box-shadow 100ms ease',
        boxShadow:      hovered
          ? '0 4px 18px rgba(255,203,116,0.35)'
          : '0 2px 8px rgba(255,203,116,0.18)',
      }}
    >
      <Plus size={14} strokeWidth={2.5} />
      New Item
    </motion.button>
  );
}
