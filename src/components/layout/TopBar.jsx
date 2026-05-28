import { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useApp } from '../../App.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  inventory: 'Inventory',
  sold:      'Sold Items',
  settings:  'Settings',
};

export default function TopBar() {
  const { currentPage, searchQuery, setSearchQuery, searchFocusTrigger } = useApp();
  const isMobile = useIsMobile();
  const inputRef = useRef(null);

  useEffect(() => {
    if (searchFocusTrigger > 0) inputRef.current?.focus();
  }, [searchFocusTrigger]);

  const showSearch = currentPage === 'inventory' || currentPage === 'sold';

  return (
    <header style={{
      height: isMobile ? 56 : 52,
      display: 'flex',
      alignItems: 'center',
      padding: isMobile ? '0 16px' : '0 20px',
      background: 'var(--bg-base)',
      borderBottom: '1px solid var(--border-subtle)',
      flexShrink: 0,
      WebkitAppRegion: 'drag',
      // Push content below status bar on iPhone
      paddingTop: isMobile ? 'env(safe-area-inset-top)' : undefined,
      height: isMobile ? 'calc(56px + env(safe-area-inset-top))' : 52,
    }}>
      {isMobile ? (
        // Mobile: logo left, search fills middle
        <>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            color: 'var(--accent-gold)',
            letterSpacing: '-0.02em',
            marginRight: 12,
            flexShrink: 0,
            WebkitAppRegion: 'no-drag',
          }}>
            Ledgr
          </span>

          {showSearch && (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              padding: '7px 12px',
              WebkitAppRegion: 'no-drag',
            }}>
              <Search size={13} color="var(--text-tertiary)" />
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search items…"
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <X size={13} color="var(--text-tertiary)" />
                </button>
              )}
            </div>
          )}

          {!showSearch && (
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', WebkitAppRegion: 'no-drag' }}>
              {PAGE_TITLES[currentPage]}
            </span>
          )}
        </>
      ) : (
        // Desktop: title left, search center, hints right
        <>
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
            {showSearch && (
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
        </>
      )}
    </header>
  );
}
