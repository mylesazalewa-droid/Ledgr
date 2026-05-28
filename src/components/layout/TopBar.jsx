import { useRef, useEffect, useState } from 'react';
import { Search, X, ChevronDown, Check, Plus, MessageCircle } from 'lucide-react';
import { useApp } from '../../App.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  inventory: 'Inventory',
  sold:      'Sold Items',
  settings:  'Settings',
  house:     'Map',
};

// ── Home picker dropdown ──────────────────────────────────────────────────────
function HomePicker({ onClose }) {
  const { homes, activeHomeId, setActiveHomeId, addHome, updateHome, deleteHome } = useApp();
  const isMobile = useIsMobile();
  const [addingNew,    setAddingNew]    = useState(false);
  const [newName,      setNewName]      = useState('');
  const [editingId,    setEditingId]    = useState(null);
  const [editName,     setEditName]     = useState('');
  const newInputRef  = useRef(null);
  const editInputRef = useRef(null);
  const overlayRef   = useRef(null);

  useEffect(() => {
    if (addingNew) newInputRef.current?.focus();
  }, [addingNew]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  async function handleAdd() {
    const name = newName.trim();
    if (name) {
      const h = await addHome({ name, sort_order: homes.length });
      setActiveHomeId(h.id);
    }
    setAddingNew(false);
    setNewName('');
    onClose();
  }

  function commitEdit() {
    const name = editName.trim();
    if (name && editingId) updateHome(editingId, { name });
    setEditingId(null);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 490,
        }}
      />
      {/* Sheet / dropdown */}
      <div style={{
        position: 'fixed',
        ...(isMobile
          ? { bottom: 0, left: 0, right: 0, borderRadius: '18px 18px 0 0', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }
          : { top: 56, left: 0, width: 220, borderRadius: 12 }
        ),
        zIndex: 500,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* Handle (mobile only) */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
          </div>
        )}

        <div style={{ padding: '12px 0 8px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-tertiary)', padding: '0 16px 8px', textTransform: 'uppercase' }}>
            Properties
          </div>

          {homes.map(home => (
            <div key={home.id} style={{ display: 'flex', alignItems: 'center' }}>
              {editingId === home.id ? (
                <input
                  ref={editInputRef}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                  style={{
                    flex: 1, margin: '2px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--accent-gold-dim)',
                    borderRadius: 8, padding: '6px 10px',
                    fontSize: 14, color: 'var(--text-primary)', outline: 'none',
                    fontFamily: 'var(--font-body)',
                  }}
                />
              ) : (
                <button
                  onClick={() => { setActiveHomeId(home.id); onClose(); }}
                  onDoubleClick={() => { setEditingId(home.id); setEditName(home.name); }}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 16px',
                    background: activeHomeId === home.id ? 'rgba(255,203,116,0.08)' : 'none',
                    border: 'none', cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Check
                    size={14}
                    color="var(--accent-gold)"
                    style={{ opacity: activeHomeId === home.id ? 1 : 0, flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: 14, fontWeight: activeHomeId === home.id ? 600 : 400,
                    color: activeHomeId === home.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    flex: 1,
                  }}>
                    {home.name}
                  </span>
                  {homes.length > 1 && (
                    <button
                      onClick={e => { e.stopPropagation(); if (window.confirm(`Delete "${home.name}"?`)) { deleteHome(home.id); if (activeHomeId === home.id) setActiveHomeId(null); onClose(); } }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--text-tertiary)', fontSize: 12, opacity: 0.6 }}
                    >
                      ✕
                    </button>
                  )}
                </button>
              )}
            </div>
          ))}

          <div style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 0' }} />

          {addingNew ? (
            <div style={{ padding: '4px 12px 8px' }}>
              <input
                ref={newInputRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onBlur={handleAdd}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAddingNew(false); setNewName(''); } }}
                placeholder="Property name…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--accent-gold-dim)',
                  borderRadius: 8, padding: '8px 12px',
                  fontSize: 14, color: 'var(--text-primary)', outline: 'none',
                  fontFamily: 'var(--font-body)',
                }}
              />
            </div>
          ) : (
            <button
              onClick={() => setAddingNew(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '11px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent-gold)', fontSize: 14,
              }}
            >
              <Plus size={14} /> Add Property
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function MsgBell() {
  const { unreadMessages, setCurrentPage } = useApp();
  return (
    <button
      onClick={() => setCurrentPage('settings')}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 6, flexShrink: 0,
        WebkitAppRegion: 'no-drag',
      }}
    >
      <MessageCircle
        size={20}
        color={unreadMessages > 0 ? 'var(--accent-gold)' : 'var(--text-tertiary)'}
        strokeWidth={unreadMessages > 0 ? 2.2 : 1.6}
      />
      {unreadMessages > 0 && (
        <div style={{
          position: 'absolute', top: 1, right: 1,
          minWidth: 15, height: 15, borderRadius: 8,
          background: 'var(--accent-gold)',
          color: '#000',
          fontSize: 9, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 3px',
          lineHeight: 1,
        }}>
          {unreadMessages > 9 ? '9+' : unreadMessages}
        </div>
      )}
    </button>
  );
}

export default function TopBar() {
  const { currentPage, searchQuery, setSearchQuery, searchFocusTrigger,
          homes, activeHomeId } = useApp();
  const isMobile = useIsMobile();
  const inputRef = useRef(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (searchFocusTrigger > 0) inputRef.current?.focus();
  }, [searchFocusTrigger]);

  const showSearch    = currentPage === 'inventory' || currentPage === 'sold';
  const activeHome    = homes.find(h => h.id === activeHomeId);
  const homeName      = activeHome?.name || 'My Home';
  const multiHome     = homes.length > 1;

  return (
    <>
    <header style={{
      display: 'flex',
      alignItems: 'center',
      padding: isMobile ? '0 16px' : '0 20px',
      background: 'var(--bg-base)',
      borderBottom: '1px solid var(--border-subtle)',
      flexShrink: 0,
      WebkitAppRegion: 'drag',
      paddingTop: isMobile ? 'env(safe-area-inset-top)' : undefined,
      height: isMobile ? 'calc(56px + env(safe-area-inset-top))' : 52,
    }}>
      {isMobile ? (
        <>
          {/* Home switcher button (always visible on mobile left side) */}
          <button
            onClick={() => setShowPicker(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              marginRight: 10, flexShrink: 0,
              WebkitAppRegion: 'no-drag',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              color: 'var(--accent-gold)',
              letterSpacing: '-0.02em',
            }}>
              Ledgr
            </span>
            {multiHome && (
              <ChevronDown size={13} color="var(--accent-gold)" style={{ opacity: 0.7 }} />
            )}
          </button>

          {showSearch ? (
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
                  background: 'none', border: 'none', outline: 'none',
                  fontSize: 14, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <X size={13} color="var(--text-tertiary)" />
                </button>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, WebkitAppRegion: 'no-drag' }}>
              {/* Home name chip — tappable to switch */}
              <button
                onClick={() => setShowPicker(v => !v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'rgba(255,203,116,0.08)',
                  border: '1px solid rgba(255,203,116,0.18)',
                  borderRadius: 20,
                  padding: '3px 10px',
                  cursor: 'pointer',
                  color: 'var(--accent-gold)',
                  fontSize: 12, fontWeight: 600,
                }}
              >
                {homeName}
                <ChevronDown size={11} />
              </button>
            </div>
          )}

          {/* Message bell — right side on mobile */}
          <MsgBell />
        </>
      ) : (
        // Desktop
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180, WebkitAppRegion: 'no-drag' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
              {PAGE_TITLES[currentPage]}
            </span>
            {/* Home chip */}
            <button
              onClick={() => setShowPicker(v => !v)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(255,203,116,0.08)',
                border: '1px solid rgba(255,203,116,0.18)',
                borderRadius: 20,
                padding: '2px 9px',
                cursor: 'pointer',
                color: 'rgba(255,203,116,0.7)',
                fontSize: 11, fontWeight: 600,
              }}
            >
              {homeName}
              <ChevronDown size={10} />
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', WebkitAppRegion: 'no-drag' }}>
            {showSearch && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8, padding: '5px 12px', width: 320,
              }}>
                <Search size={13} color="var(--text-tertiary)" />
                <input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search items… (⌘F)"
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    fontSize: 13, color: 'var(--text-primary)',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100, justifyContent: 'flex-end', WebkitAppRegion: 'no-drag' }}>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
              ⌘N new · ⌘, settings
            </span>
            <MsgBell />
          </div>
        </>
      )}
    </header>

    {showPicker && <HomePicker onClose={() => setShowPicker(false)} />}
    </>
  );
}
