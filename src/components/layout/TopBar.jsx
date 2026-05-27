import { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useApp } from '../../App.jsx';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  inventory: 'Inventory',
  sold:      'Sold Items',
  settings:  'Settings',
};

export default function TopBar() {
  const { currentPage, searchQuery, setSearchQuery, searchFocusTrigger } = useApp();
  const inputRef = useRef(null);

  // Triggered by ⌘F keyboard shortcut
  useEffect(() => {
    if (searchFocusTrigger > 0) inputRef.current?.focus();
  }, [searchFocusTrigger]);

  return (
    <header style={{
      height: 52,
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      background: 'var(--bg-base)',
      borderBottom: '1px solid var(--border-subtle)',
      flexShrink: 0,
      WebkitAppRegion: 'drag',
    }}>
      <span style={{
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text-secondary)',
        minWidth: 100,
        WebkitAppRegion: 'no-drag',
      }}>
        {PAGE_TITLES[currentPage]}
      </span>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', WebkitAppRegion: 'no-drag' }}>
        {(currentPage === 'inventory' || currentPage === 'sold') && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '5px 12px',
            width: 320,
          }}>
            <Search size={13} color="var(--text-tertiary)" />
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search items… (⌘F)"
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <X size={12} color="var(--text-tertiary)" />
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ minWidth: 100, textAlign: 'right', WebkitAppRegion: 'no-drag' }}>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          ⌘N new · ⌘, settings
        </span>
      </div>
    </header>
  );
}
