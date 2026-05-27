import {
  Cpu, Zap, Home, Shirt, Wrench, Star, Bike, Box,
} from 'lucide-react';

const ICON_MAP = { Cpu, Zap, Home, Shirt, Wrench, Star, Bike, Box };

export default function CategoryBadge({ category, size = 'sm' }) {
  if (!category) return null;

  const Icon = ICON_MAP[category.icon] || Box;
  const isLg = size === 'lg';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: isLg ? 6 : 4,
      padding: isLg ? '4px 10px' : '2px 7px',
      borderRadius: 20,
      background: `${category.color}18`,
      border: `1px solid ${category.color}30`,
      fontSize: isLg ? 12 : 10,
      fontWeight: 500,
      color: category.color,
      whiteSpace: 'nowrap',
    }}>
      <Icon size={isLg ? 12 : 10} />
      {category.name}
    </span>
  );
}
