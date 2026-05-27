import { useState, useCallback } from 'react';
import { useApp, SORT_OPTIONS } from '../App.jsx';
import ItemGrid from '../components/items/ItemGrid.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { CheckSquare, X, Trash2, DollarSign } from 'lucide-react';

export default function Inventory() {
  const { filteredItems, selectedCategory, categories, setSelectedCategory, sortBy, setSortBy, deleteItem, markSold, toast } = useApp();
  const isMobile = useIsMobile();
  const [bulkMode,    setBulkMode]    = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(null); // 'sell' | 'delete'

  const toggleBulkMode = () => {
    setBulkMode(v => !v);
    setSelectedIds(new Set());
  };

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const availableItems = filteredItems.filter(i => i.status !== 'sold');

  const selectAll = () => setSelectedIds(new Set(availableItems.map(i => i.id)));
  const clearSelection = () => setSelectedIds(new Set());

  async function executeBulkDelete() {
    for (const id of selectedIds) await deleteItem(id);
    toast?.(`${selectedIds.size} items deleted`, 'success');
    setBulkMode(false);
    setSelectedIds(new Set());
    setBulkConfirm(null);
  }

  async function executeBulkSell() {
    const now = new Date().toISOString();
    const selected = availableItems.filter(i => selectedIds.has(i.id));
    for (const item of selected) {
      await markSold(item.id, { soldPrice: item.asking_price || 0, soldAt: now });
    }
    toast?.(`${selected.length} items marked as sold`, 'success');
    setBulkMode(false);
    setSelectedIds(new Set());
    setBulkConfirm(null);
  }

  const category = categories.find(c => c.id === selectedCategory);

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
          {availableItems.length} {availableItems.length === 1 ? 'item' : 'items'}
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
          maxWidth: isMobile ? '50%' : undefined,
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

        {/* Bulk toggle */}
        <button
          onClick={toggleBulkMode}
          title={bulkMode ? 'Exit select mode' : 'Select items'}
          style={{
            flexShrink: 0,
            padding: isMobile ? '3px 6px' : '3px 10px',
            borderRadius: 20,
            border: `1px solid ${bulkMode ? 'var(--accent-gold-dim)' : 'var(--border-subtle)'}`,
            background: bulkMode ? 'rgba(212,168,83,0.1)' : 'transparent',
            color: bulkMode ? 'var(--accent-gold)' : 'var(--text-tertiary)',
            fontSize: 11,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <CheckSquare size={12} />
          {!isMobile && (bulkMode ? 'Done' : 'Select')}
        </button>
      </div>

      {/* Bulk action bar */}
      {bulkMode && (
        <div style={{
          padding: '8px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
            {selectedIds.size} selected
          </span>
          <button onClick={selectAll}   style={bulkBtn}>All</button>
          <button onClick={clearSelection} style={bulkBtn}>None</button>
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={() => setBulkConfirm('sell')}
                style={{ ...bulkBtn, color: 'var(--accent-green)', borderColor: 'rgba(76,175,125,0.3)' }}
              >
                <DollarSign size={12} /> Mark Sold
              </button>
              <button
                onClick={() => setBulkConfirm('delete')}
                style={{ ...bulkBtn, color: 'var(--accent-red)', borderColor: 'rgba(224,92,92,0.3)' }}
              >
                <Trash2 size={12} /> Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Bulk confirmation overlay */}
      {bulkConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
        }}>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 14, padding: '22px 24px',
            width: 320, border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-float)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              {bulkConfirm === 'sell' ? `Mark ${selectedIds.size} items as sold?` : `Delete ${selectedIds.size} items?`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 18 }}>
              {bulkConfirm === 'sell'
                ? 'Each item will be marked sold at its current asking price.'
                : 'This cannot be undone. All selected items will be permanently removed.'}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setBulkConfirm(null)} style={cancelBtn}>Cancel</button>
              <button
                onClick={bulkConfirm === 'sell' ? executeBulkSell : executeBulkDelete}
                style={bulkConfirm === 'sell' ? confirmSellBtn : confirmDeleteBtn}
              >
                {bulkConfirm === 'sell' ? 'Mark Sold' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        <ItemGrid bulkMode={bulkMode} selectedIds={selectedIds} onToggleSelect={toggleSelect} />
      </div>
    </div>
  );
}

const bulkBtn        = { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' };
const cancelBtn      = { padding: '7px 14px', borderRadius: 7, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' };
const confirmSellBtn = { padding: '7px 14px', borderRadius: 7, border: 'none', background: 'var(--accent-green)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const confirmDeleteBtn = { padding: '7px 14px', borderRadius: 7, border: 'none', background: 'var(--accent-red)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
