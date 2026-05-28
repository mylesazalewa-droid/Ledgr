import { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin } from 'lucide-react';
import { useApp } from '../App.jsx';
import { storage } from '../services/storage.js';
import { useIsMobile } from '../hooks/useIsMobile.js';

// ── Room definitions ─ SVG coordinates + keyword matching ────────────────────
// viewBox = "0 0 880 800"  wall-gap = 8px
const ROOM_DEFS = [
  {
    id: 'living_room', label: 'Living Room',
    x: 8,   y: 8,   w: 236, h: 298,
    dotX: 126, dotY: 157,
    keywords: ['living', 'lounge', 'living room'],
  },
  {
    id: 'kitchen', label: 'Kitchen',
    x: 252, y: 8,   w: 174, h: 140,
    dotX: 339, dotY: 78,
    keywords: ['kitchen'],
  },
  {
    id: 'dining', label: 'Dining',
    x: 252, y: 156, w: 174, h: 150,
    dotX: 339, dotY: 231,
    keywords: ['dining', 'dining room'],
  },
  {
    id: 'bedroom', label: 'Bedroom',
    x: 434, y: 8,   w: 198, h: 195,
    dotX: 533, dotY: 105,
    keywords: ['bedroom', 'master bedroom', 'master bed', 'main bedroom'],
  },
  {
    id: 'bathroom', label: 'Bathroom',
    x: 434, y: 211, w: 96,  h: 95,
    dotX: 482, dotY: 259,
    keywords: ['bathroom', 'bath room', 'bath'],
  },
  {
    id: 'closet', label: 'Closet',
    x: 538, y: 211, w: 94,  h: 95,
    dotX: 585, dotY: 259,
    keywords: ['closet', 'master closet', 'wardrobe'],
  },
  {
    id: 'bedroom_2', label: 'Bedroom 2',
    x: 640, y: 8,   w: 232, h: 180,
    dotX: 756, dotY: 98,
    keywords: ['bedroom 2', 'second bedroom', 'guest room', 'guest bedroom', 'spare room', 'spare bedroom'],
  },
  {
    id: 'attic', label: 'Attic',
    x: 640, y: 196, w: 232, h: 110,
    dotX: 756, dotY: 251,
    keywords: ['attic'],
  },
  {
    id: 'garage', label: 'Garage',
    x: 8,   y: 314, w: 236, h: 478,
    dotX: 126, dotY: 553,
    keywords: ['garage'],
  },
  {
    id: 'office', label: 'Office',
    x: 252, y: 314, w: 174, h: 150,
    dotX: 339, dotY: 389,
    keywords: ['office', 'study', 'home office', 'workspace', 'basement office'],
  },
  {
    id: 'storage', label: 'Storage',
    x: 252, y: 472, w: 174, h: 320,
    dotX: 339, dotY: 632,
    keywords: ['storage', 'storeroom', 'utility', 'storage room'],
  },
  {
    id: 'basement', label: 'Basement',
    x: 434, y: 314, w: 438, h: 150,
    dotX: 653, dotY: 389,
    keywords: ['basement'],
  },
  {
    id: 'family_room', label: 'Family Room',
    x: 434, y: 472, w: 200, h: 160,
    dotX: 534, dotY: 538,
    keywords: ['family room', 'family', 'den', 'great room', 'rec room'],
  },
  {
    id: 'bedroom_3', label: 'Bedroom 3',
    x: 642, y: 472, w: 230, h: 160,
    dotX: 757, dotY: 538,
    keywords: ['bedroom 3', 'third bedroom', "kids room", "kid's room", "children's room", 'kids bedroom'],
  },
  {
    id: 'bedroom_4', label: 'Bedroom 4',
    x: 434, y: 640, w: 438, h: 152,
    dotX: 653, dotY: 716,
    keywords: ['bedroom 4', 'fourth bedroom', 'nursery', 'baby room', 'baby'],
  },
];

// Match a free-text location string to a room
function matchRoom(loc) {
  if (!loc) return null;
  const s = loc.toLowerCase().trim();
  for (const def of ROOM_DEFS) {
    if (def.keywords.some(k => s.includes(k) || k.includes(s))) return def.id;
  }
  return null;
}

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

// ── Subtle furniture silhouettes per room ─────────────────────────────────────
const FURNITURE = {
  living_room: [
    { x: 26,  y: 195, w: 160, h: 65  }, // sofa
    { x: 66,  y: 268, w: 80,  h: 26  }, // coffee table
    { x: 26,  y: 16,  w: 90,  h: 18  }, // TV unit
    { x: 156, y: 16,  w: 40,  h: 28  }, // side table
  ],
  kitchen: [
    { x: 253, y: 14,  w: 14,  h: 108 }, // counter left wall
    { x: 267, y: 14,  w: 110, h: 14  }, // counter top wall
    { x: 320, y: 90,  w: 72,  h: 36  }, // island
  ],
  dining: [
    { x: 295, y: 188, w: 90,  h: 54  }, // dining table
    { x: 285, y: 194, w: 22,  h: 20  }, // chair L
    { x: 390, y: 194, w: 22,  h: 20  }, // chair R
    { x: 319, y: 175, w: 22,  h: 20  }, // chair top
    { x: 319, y: 248, w: 22,  h: 20  }, // chair bottom
  ],
  bedroom: [
    { x: 480, y: 85,  w: 124, h: 90  }, // bed
    { x: 462, y: 95,  w: 16,  h: 24  }, // nightstand L
    { x: 608, y: 95,  w: 16,  h: 24  }, // nightstand R
    { x: 462, y: 165, w: 160, h: 18  }, // dresser
  ],
  bedroom_2: [
    { x: 684, y: 50,  w: 120, h: 88  }, // bed
    { x: 666, y: 58,  w: 16,  h: 22  }, // nightstand L
    { x: 808, y: 58,  w: 16,  h: 22  }, // nightstand R
    { x: 666, y: 148, w: 160, h: 16  }, // dresser
  ],
  bathroom: [
    { x: 440, y: 218, w: 34,  h: 24  }, // toilet
    { x: 490, y: 218, w: 32,  h: 20  }, // sink
    { x: 440, y: 262, w: 78,  h: 34  }, // tub
  ],
  closet: [
    { x: 542, y: 216, w: 82,  h: 14  }, // top rail
    { x: 542, y: 272, w: 82,  h: 14  }, // bottom shelf
    { x: 542, y: 234, w: 14,  h: 36  }, // divider L
    { x: 610, y: 234, w: 14,  h: 36  }, // divider R
  ],
  office: [
    { x: 260, y: 328, w: 130, h: 52  }, // desk
    { x: 360, y: 380, w: 34,  h: 36  }, // chair
    { x: 260, y: 390, w: 46,  h: 60  }, // filing cabinet
    { x: 380, y: 328, w: 40,  h: 24  }, // monitor
  ],
  storage: [
    { x: 256, y: 478, w: 162, h: 14  }, // shelf 1
    { x: 256, y: 510, w: 162, h: 14  }, // shelf 2
    { x: 256, y: 542, w: 162, h: 14  }, // shelf 3
    { x: 256, y: 574, w: 162, h: 14  }, // shelf 4
    { x: 256, y: 644, w: 162, h: 14  }, // shelf 5
    { x: 256, y: 676, w: 162, h: 14  }, // shelf 6
    { x: 256, y: 708, w: 162, h: 14  }, // shelf 7
    { x: 256, y: 752, w: 162, h: 32  }, // floor bins
  ],
  garage: [
    { x: 22,  y: 344, w: 210, h: 118 }, // car footprint
    { x: 22,  y: 472, w: 24,  h: 300 }, // left shelving (extended)
    { x: 200, y: 472, w: 24,  h: 300 }, // right shelving (extended)
    { x: 56,  y: 484, w: 100, h: 50  }, // workbench front
    { x: 56,  y: 626, w: 100, h: 50  }, // workbench back
  ],
  basement: [
    { x: 442, y: 322, w: 200, h: 80  }, // storage unit L
    { x: 660, y: 322, w: 80,  h: 80  }, // storage unit R
    { x: 750, y: 322, w: 118, h: 80  }, // shelving
    { x: 442, y: 416, w: 84,  h: 40  }, // chest L
    { x: 538, y: 416, w: 84,  h: 40  }, // chest R
  ],
  family_room: [
    { x: 444, y: 478, w: 80,  h: 18  }, // TV unit
    { x: 444, y: 546, w: 158, h: 55  }, // sofa
    { x: 484, y: 576, w: 62,  h: 22  }, // coffee table
    { x: 596, y: 506, w: 28,  h: 28  }, // armchair
  ],
  bedroom_3: [
    { x: 688, y: 496, w: 120, h: 88  }, // bed
    { x: 670, y: 502, w: 16,  h: 22  }, // nightstand L
    { x: 810, y: 502, w: 16,  h: 22  }, // nightstand R
    { x: 650, y: 598, w: 200, h: 18  }, // dresser
  ],
  bedroom_4: [
    { x: 530, y: 666, w: 160, h: 100 }, // bed
    { x: 510, y: 672, w: 18,  h: 24  }, // nightstand L
    { x: 692, y: 672, w: 18,  h: 24  }, // nightstand R
    { x: 440, y: 648, w: 18,  h: 130 }, // side wardrobe
    { x: 722, y: 648, w: 140, h: 20  }, // dresser
  ],
};

// ── Pulsing Dot (SVG — uses className for CSS animation) ──────────────────────
function PulsingDot({ cx, cy, count, isActive }) {
  return (
    <g>
      {/* Outer pulse rings */}
      <circle cx={cx} cy={cy} r="18" fill="rgba(255,203,116,0.22)" className="room-dot-ring" />
      <circle cx={cx} cy={cy} r="18" fill="rgba(255,203,116,0.18)" className="room-dot-ring-2" />
      {/* Core */}
      <circle
        cx={cx} cy={cy} r="9"
        fill={isActive ? '#ffffff' : '#ffcb74'}
        filter="url(#dotGlow)"
      />
      {/* Count */}
      <text
        x={cx} y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="8"
        fontWeight="800"
        fill={isActive ? '#ffcb74' : '#0a0a0b'}
        style={{ userSelect: 'none', pointerEvents: 'none', fontFamily: 'system-ui' }}
      >
        {count > 99 ? '99+' : count}
      </text>
    </g>
  );
}

// ── Single room SVG element ───────────────────────────────────────────────────
function RoomSVG({ room, hasItems, isActive, isHovered, itemCount, onSelect, onHover }) {
  const { id, x, y, w, h, dotX, dotY, label } = room;
  const furniture = FURNITURE[id] || [];

  const baseFill     = '#0c0c14';
  const litFill      = `url(#grad-${id})`;
  const activeBorder = isActive  ? 'rgba(255,210,90,0.55)' : 'rgba(255,255,255,0.06)';
  const hoverBorder  = isHovered && hasItems ? 'rgba(255,180,60,0.28)' : activeBorder;

  return (
    <g
      style={{ cursor: hasItems ? 'pointer' : 'default' }}
      onClick={hasItems ? onSelect : undefined}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Floor */}
      <rect x={x} y={y} width={w} height={h} fill={baseFill} rx="3" />

      {/* Warm light fill (lit rooms) */}
      {hasItems && (
        <rect x={x} y={y} width={w} height={h} fill={litFill} rx="3" />
      )}

      {/* Active highlight */}
      {isActive && (
        <rect
          x={x} y={y} width={w} height={h}
          fill="rgba(255,200,80,0.07)"
          stroke="rgba(255,210,90,0.45)"
          strokeWidth="1.5"
          rx="3"
        />
      )}

      {/* Room border */}
      <rect
        x={x} y={y} width={w} height={h}
        fill="none"
        stroke={hoverBorder}
        strokeWidth="1"
        rx="3"
      />

      {/* Furniture silhouettes */}
      {furniture.map((f, i) => (
        <rect
          key={i}
          x={f.x} y={f.y} width={f.w} height={f.h}
          fill={hasItems ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)'}
          rx="1.5"
        />
      ))}

      {/* Room label */}
      <text
        x={dotX}
        y={y + h - 10}
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        letterSpacing="0.1"
        fill={hasItems ? 'rgba(255,195,80,0.5)' : 'rgba(255,255,255,0.15)'}
        style={{ userSelect: 'none', pointerEvents: 'none', fontFamily: 'system-ui, sans-serif' }}
      >
        {label.toUpperCase()}
      </text>

      {/* Pulsing dot */}
      {hasItems && (
        <PulsingDot
          cx={dotX}
          cy={dotY}
          count={itemCount}
          isActive={isActive}
        />
      )}
    </g>
  );
}

// ── SVG Floor Plan ────────────────────────────────────────────────────────────
function FloorPlan({ roomItems, activeRoom, onSelectRoom }) {
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const VW = 880, VH = 800;

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ width: '100%', height: '100%', display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Warm ambient light gradient per room (all share same look) */}
        {ROOM_DEFS.map(room => (
          <radialGradient
            key={room.id}
            id={`grad-${room.id}`}
            cx="50%" cy="40%" r="68%"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%"   stopColor="rgba(255,172,48,0.24)" />
            <stop offset="50%"  stopColor="rgba(255,145,35,0.12)" />
            <stop offset="100%" stopColor="rgba(255,120,20,0.02)" />
          </radialGradient>
        ))}

        {/* Dot outer glow */}
        <filter id="dotGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Room glow when active */}
        <filter id="activeGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Exterior — very dark background (the "outside" / garden) */}
      <rect width={VW} height={VH} fill="#04040a" />

      {/* Subtle exterior grain / vignette */}
      <radialGradient id="exterior-fade" cx="50%" cy="50%" r="70%">
        <stop offset="0%"   stopColor="rgba(15,15,22,0.6)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0)" />
      </radialGradient>
      <rect width={VW} height={VH} fill="url(#exterior-fade)" />

      {/* Wall background (the structural grid between rooms) */}
      <rect x="0" y="0" width={VW} height={VH} fill="none" />

      {/* All rooms */}
      {ROOM_DEFS.map(room => (
        <RoomSVG
          key={room.id}
          room={room}
          hasItems={!!roomItems[room.id]?.length}
          isActive={activeRoom === room.id}
          isHovered={hoveredRoom === room.id}
          itemCount={roomItems[room.id]?.length || 0}
          onSelect={() => onSelectRoom(room.id)}
          onHover={over => setHoveredRoom(over ? room.id : null)}
        />
      ))}
    </svg>
  );
}

// ── Mini item card inside room panel ─────────────────────────────────────────
function RoomItemCard({ item, categories, onClick }) {
  const [photoUrl, setPhotoUrl] = useState(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    const src = item.photo_path || item.photo_url;
    if (src) {
      storage.getPhotoDataUrl(src).then(url => {
        if (!cancelled.current) setPhotoUrl(url);
      });
    }
    return () => { cancelled.current = true; };
  }, [item.photo_path, item.photo_url]);

  const cat = categories?.find(c => c.id === item.category_id);

  return (
    <motion.div
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      style={{
        background:   'var(--bg-elevated)',
        borderRadius: 12,
        border:       '1px solid var(--border-subtle)',
        overflow:     'hidden',
        cursor:       'pointer',
        transition:   'border-color 80ms',
      }}
    >
      {/* Photo */}
      <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--bg-void)', position: 'relative', overflow: 'hidden' }}>
        {photoUrl ? (
          <img
            src={photoUrl} alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: cat ? `${cat.color}14` : 'rgba(255,203,116,0.05)',
          }}>
            <span style={{
              fontFamily:  'var(--font-display)',
              fontSize:    28,
              fontStyle:   'italic',
              color:       cat ? `${cat.color}50` : 'rgba(255,203,116,0.2)',
              userSelect:  'none',
            }}>
              {item.name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
        )}
        {cat && (
          <div style={{
            position:   'absolute',
            top: 0, left: 0, right: 0,
            height:     3,
            background: `linear-gradient(90deg, ${cat.color}, transparent)`,
          }} />
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '8px 10px' }}>
        <div style={{
          fontSize:     11,
          fontWeight:   600,
          color:        'var(--text-primary)',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
          marginBottom: 3,
        }}>
          {item.name}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize:   12,
          fontWeight: 700,
          color:      item.status === 'sold' ? 'var(--text-tertiary)' : 'var(--accent-gold)',
        }}>
          {item.status === 'sold' ? fmt(item.sold_price) : fmt(item.asking_price)}
        </div>
        {item.condition && (
          <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2, fontWeight: 500 }}>
            {item.condition}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Room panel (bottom sheet) ─────────────────────────────────────────────────
function RoomPanel({ room, items, categories, onClose, onSelectItem, isMobile }) {
  const totalValue = items.reduce((s, i) => s + (i.asking_price || 0), 0);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position:       'fixed',
        inset:          0,
        background:     'rgba(0,0,0,0.65)',
        zIndex:         400,
        display:        'flex',
        alignItems:     'flex-end',
        justifyContent: 'center',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        style={{
          width:        isMobile ? '100%' : 480,
          maxHeight:    isMobile ? '75vh' : '68vh',
          background:   'var(--bg-surface)',
          borderRadius: '22px 22px 0 0',
          border:       '1px solid var(--border-subtle)',
          borderBottom: 'none',
          display:      'flex',
          flexDirection: 'column',
          overflow:     'hidden',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Header */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '10px 20px 14px',
          flexShrink:     0,
          borderBottom:   '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Gold dot */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                position:  'absolute',
                width:     22, height: 22,
                borderRadius: '50%',
                background: 'rgba(255,203,116,0.22)',
                animation: 'roomDotRing 2.2s ease-out infinite',
              }} />
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: 'var(--accent-gold)',
                boxShadow: '0 0 10px rgba(255,203,116,0.6)',
                position: 'relative',
                zIndex: 1,
              }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{room.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                {items.length} item{items.length !== 1 ? 's' : ''} · {fmt(totalValue)} est. value
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background:   'var(--bg-elevated)',
              border:       '1px solid var(--border-subtle)',
              borderRadius: 8,
              cursor:       'pointer',
              padding:      '6px 8px',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
            }}
          >
            <X size={15} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Item grid */}
        <div style={{
          flex:       1,
          overflow:   'auto',
          padding:    '14px 16px',
          paddingBottom: isMobile ? 'calc(14px + env(safe-area-inset-bottom))' : 14,
        }}>
          <div style={{
            display:               'grid',
            gridTemplateColumns:   'repeat(2, 1fr)',
            gap:                   10,
          }}>
            {items.map(item => (
              <RoomItemCard
                key={item.id}
                item={item}
                categories={categories}
                onClick={() => onSelectItem(item)}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyOverlay({ isMobile }) {
  return (
    <div style={{
      position:       'absolute',
      inset:          0,
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      pointerEvents:  'none',
      zIndex:         10,
      gap:            10,
    }}>
      <div style={{
        background:   'rgba(10,10,18,0.82)',
        border:       '1px solid var(--border-subtle)',
        borderRadius: 14,
        padding:      '16px 22px',
        textAlign:    'center',
        backdropFilter: 'blur(8px)',
        maxWidth:     260,
      }}>
        <MapPin size={20} color="var(--accent-gold)" style={{ marginBottom: 8 }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 5 }}>
          No rooms mapped yet
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          When adding an item, pick a location (Bedroom, Garage, etc.) and it'll appear here as a glowing dot.
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function House() {
  // items is already scoped to the active home by App.jsx
  const { items, categories, homes, activeHomeId, setSelectedItem } = useApp();
  const isMobile = useIsMobile();
  const [activeRoom, setActiveRoom] = useState(null);

  const firstHomeId = homes[0]?.id ?? 'home_default';

  const roomItems = useMemo(() => {
    const grouped = {};
    items
      .filter(i => i.status !== 'sold' && i.location)
      .forEach(item => {
        const roomId = matchRoom(item.location);
        if (roomId) {
          if (!grouped[roomId]) grouped[roomId] = [];
          grouped[roomId].push(item);
        }
      });
    return grouped;
  }, [items]);

  const activeRoomDef = ROOM_DEFS.find(r => r.id === activeRoom);
  const activeItems   = activeRoom ? (roomItems[activeRoom] || []) : [];
  const totalRooms    = Object.keys(roomItems).length;
  const totalMapped   = Object.values(roomItems).reduce((s, v) => s + v.length, 0);
  const hasAnyItems   = totalMapped > 0;
  const homeName      = homes.find(h => h.id === activeHomeId)?.name || 'My Home';

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: 'var(--bg-void)',
    }}>

      {/* Header */}
      <div style={{
        padding: isMobile ? '14px 16px' : '16px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h2 style={{
            fontSize: isMobile ? 18 : 20,
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}>
            {homeName}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '3px 0 0' }}>
            {hasAnyItems
              ? `${totalMapped} item${totalMapped !== 1 ? 's' : ''} across ${totalRooms} room${totalRooms !== 1 ? 's' : ''} — tap a glow to explore`
              : 'Assign locations to items to light up your home'}
          </p>
        </div>
        {hasAnyItems && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
            color: 'rgba(255,203,116,0.55)',
            background: 'rgba(255,203,116,0.07)',
            border: '1px solid rgba(255,203,116,0.14)',
            borderRadius: 20, padding: '4px 12px',
          }}>
            {totalRooms} active
          </div>
        )}
      </div>

      {/* Map area */}
      <div style={{
        flex:            1,
        position:        'relative',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         isMobile ? '10px 6px' : '18px 20px',
        overflow:        'hidden',
      }}>
        {!hasAnyItems && <EmptyOverlay isMobile={isMobile} />}
        <FloorPlan
          roomItems={roomItems}
          activeRoom={activeRoom}
          onSelectRoom={id => setActiveRoom(id === activeRoom ? null : id)}
        />
      </div>

      {/* Room panel */}
      <AnimatePresence>
        {activeRoom && activeRoomDef && (
          <RoomPanel
            key={activeRoom}
            room={activeRoomDef}
            items={activeItems}
            categories={categories}
            onClose={() => setActiveRoom(null)}
            onSelectItem={item => { setSelectedItem(item); setActiveRoom(null); }}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
