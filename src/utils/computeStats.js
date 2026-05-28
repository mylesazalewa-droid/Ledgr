/**
 * Compute dashboard stats from an array of items.
 * Shared by App.jsx (client-side per-home computation) and storage adapters.
 */
export function computeStats(items = []) {
  const available = items.filter(i => i.status !== 'sold');
  const sold      = items.filter(i => i.status === 'sold');

  const totalEarned = sold.reduce((s, i) => s + (i.sold_price  || 0), 0);
  const totalCost   = sold.reduce((s, i) => s + (i.cost_price  || 0), 0);
  const totalProfit = totalEarned - totalCost;
  const avgMargin   = totalEarned > 0 ? Math.round((totalProfit / totalEarned) * 100) : 0;

  const now = Date.now();
  const longestSitting = available
    .filter(i => i.added_at)
    .map(i => ({ ...i, days_listed: Math.floor((now - new Date(i.added_at).getTime()) / 86400000) }))
    .filter(i => i.days_listed >= 30)
    .sort((a, b) => b.days_listed - a.days_listed)
    .slice(0, 5);

  const monthlyMap = {};
  sold.forEach(i => {
    const month = (i.sold_at || '').slice(0, 7);
    if (month) monthlyMap[month] = (monthlyMap[month] || 0) + (i.sold_price || 0);
  });
  const monthlyEarnings = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, total]) => ({ month, total }));

  return {
    totalItems:      available.reduce((s, i) => s + (i.quantity || 1), 0),
    soldCount:       sold.length,
    totalValue:      available.reduce((s, i) => s + (i.asking_price || 0) * (i.quantity || 1), 0),
    totalEarned,
    totalCost,
    totalProfit,
    avgMargin,
    monthlyEarnings,
    longestSitting,
  };
}
