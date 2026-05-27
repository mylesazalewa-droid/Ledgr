import { useApp } from '../../App.jsx';
import ItemCard from './ItemCard.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import { Package } from 'lucide-react';

export default function ItemGrid({ statusFilter }) {
  const { filteredItems, itemsLoading } = useApp();

  const displayItems = statusFilter
    ? filteredItems.filter(i => i.status === statusFilter)
    : filteredItems.filter(i => i.status !== 'sold');

  if (itemsLoading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16,
        padding: 24,
      }}>
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
        description="Add items to your stash to see them here."
      />
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 16,
      padding: 24,
      alignContent: 'start',
    }}>
      {displayItems.map((item, i) => (
        <ItemCard key={item.id} item={item} index={i} />
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
      <div style={{
        width: '100%',
        aspectRatio: '16/10',
        background: 'var(--bg-elevated)',
        animation: 'pulse 1.5s ease infinite',
      }} />
      <div style={{ padding: '12px 14px 14px 16px' }}>
        <div style={{ height: 13, background: 'var(--bg-elevated)', borderRadius: 6, marginBottom: 6, width: '70%' }} />
        <div style={{ height: 11, background: 'var(--bg-elevated)', borderRadius: 6, width: '50%' }} />
      </div>
    </div>
  );
}
