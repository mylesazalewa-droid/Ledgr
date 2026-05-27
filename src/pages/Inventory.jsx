import { useApp, SORT_OPTIONS } from '../App.jsx';
import ItemGrid from '../components/items/ItemGrid.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';

export default function Inventory() {
  const { filteredItems, selectedCategory, categories, setSelectedCategory, sortBy, setSortBy } = useApp();
  const isMobile = useIsMobile();

  const available = filteredItems.filter(i => i.status !== 'sold');
  const category  = categories.find(c => c.id === selectedCategory);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sub-header */}
      <div style={{
        padding: isMobile ? '8px 12px' : '10px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
        flexWrap: isMobile ? 'nowrap' : 'wrap',
        overflow: isMobile ? 'hidden' : undefined,
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
          {available.length} {available.length === 1 ? 'item' : 'items'}
          {category ? ` · ${category.name}` : ''}
        </span>

        {selectedCategory && (
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 20,
              padding: '2px 8px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            × Clear
          </button>
        )}

        {/* Sort controls — horizontally scrollable on mobile */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginLeft: 'auto',
          overflowX: isMobile ? 'auto' : undefined,
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          flexShrink: 0,
          maxWidth: isMobile ? '60%' : undefined,
        }}>
          {!isMobile && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginRight: 4, flexShrink: 0 }}>Sort</span>}
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              style={{
                padding: isMobile ? '3px 8px' : '3px 10px',
                borderRadius: 20,
                border: `1px solid ${sortBy === opt.id ? 'var(--accent-gold-dim)' : 'var(--border-subtle)'}`,
                background: sortBy === opt.id ? 'rgba(212,168,83,0.1)' : 'transparent',
                color: sortBy === opt.id ? 'var(--accent-gold)' : 'var(--text-tertiary)',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: sortBy === opt.id ? 600 : 400,
                whiteSpace: 'nowrap',
                transition: 'all 80ms',
                flexShrink: 0,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <ItemGrid />
      </div>
    </div>
  );
}
