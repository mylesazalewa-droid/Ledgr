import { useApp, SORT_OPTIONS } from '../App.jsx';
import ItemGrid from '../components/items/ItemGrid.jsx';

export default function Inventory() {
  const { filteredItems, selectedCategory, categories, setSelectedCategory, sortBy, setSortBy } = useApp();

  const available = filteredItems.filter(i => i.status !== 'sold');
  const category  = categories.find(c => c.id === selectedCategory);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sub-header with sort + filter info */}
      <div style={{
        padding: '10px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 4 }}>
          {available.length} {available.length === 1 ? 'item' : 'items'}
          {category ? ` in ${category.name}` : ''}
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
              padding: '2px 10px',
              cursor: 'pointer',
            }}
          >
            ×  Clear filter
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Sort controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginRight: 6 }}>Sort</span>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              style={{
                padding: '3px 10px',
                borderRadius: 20,
                border: `1px solid ${sortBy === opt.id ? 'var(--accent-gold-dim)' : 'var(--border-subtle)'}`,
                background: sortBy === opt.id ? 'rgba(212,168,83,0.1)' : 'transparent',
                color: sortBy === opt.id ? 'var(--accent-gold)' : 'var(--text-tertiary)',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: sortBy === opt.id ? 600 : 400,
                whiteSpace: 'nowrap',
                transition: 'all 80ms',
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
