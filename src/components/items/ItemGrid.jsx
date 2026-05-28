import { useApp } from '../../App.jsx';
import ItemCard from './ItemCard.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { Package } from 'lucide-react';

export default function ItemGrid({ statusFilter, bulkMode = false, selectedIds, onToggleSelect }) {
  const { filteredItems, itemsLoading } = useApp();
  const isMobile = useIsMobile();

  const displayItems = statusFilter
    ? filteredItems.filter(i => i.status === statusFilter)
    : filteredItems.filter(i => i.status !== 'sold');

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile
      ? 'repeat(2, 1fr)'
      : 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: isMobile ? 10 : 16,
    padding: isMobile ? 12 : 24,
    alignContent: 'start',
  };

  if (itemsLoading) {
    return (
      <div style={gridStyle}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No items here"
        description="Add items to your Ledgr to see them here."
      />
    );
  }

  return (
    <div style={gridStyle}>
      {displayItems.map((item, i) => (
        <ItemCard
          key={item.id}
          item={item}
          index={i}
          bulkMode={bulkMode}
          selected={selectedIds?.has(item.id) ?? false}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderRadius: 'var(--radius-card)',
      border: '1px solid var(--border-subtle)',
      overflow: 'hidden',
    }}>
      {/* Photo placeholder */}
      <div className="skeleton-shimmer" style={{ width: '100%', aspectRatio: '16/10' }} />
      <div style={{ padding: '10px 14px 13px 16px' }}>
        {/* Title */}
        <div className="skeleton-shimmer" style={{ height: 13, borderRadius: 6, marginBottom: 7, width: '68%' }} />
        {/* Subtitle */}
        <div className="skeleton-shimmer" style={{ height: 10, borderRadius: 6, marginBottom: 10, width: '45%' }} />
        {/* Price + badge row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="skeleton-shimmer" style={{ height: 14, borderRadius: 6, width: '38%' }} />
          <div className="skeleton-shimmer" style={{ height: 18, borderRadius: 20, width: '24%' }} />
        </div>
      </div>
    </div>
  );
}
