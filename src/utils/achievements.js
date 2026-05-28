// ── Achievement definitions ──────────────────────────────────────────────────
// Each achievement has a check(stats) function. stats comes from useStats().

export const ACHIEVEMENTS = [
  // First steps
  {
    id:    'first_listed',
    icon:  '📋',
    label: 'Getting Started',
    desc:  'Added your first item to Ledgr',
    check: s => (s.totalItems + s.soldCount) >= 1,
  },
  {
    id:    'first_sale',
    icon:  '🎉',
    label: 'First Sale',
    desc:  'Sold your very first item',
    check: s => s.soldCount >= 1,
  },

  // Selling milestones
  {
    id:    'five_sold',
    icon:  '📦',
    label: '5 Down',
    desc:  '5 items cleared — keep going',
    check: s => s.soldCount >= 5,
  },
  {
    id:    'ten_sold',
    icon:  '💪',
    label: 'On a Roll',
    desc:  '10 items sold',
    check: s => s.soldCount >= 10,
  },
  {
    id:    'twenty_five_sold',
    icon:  '🚀',
    label: 'Unstoppable',
    desc:  '25 items sold',
    check: s => s.soldCount >= 25,
  },
  {
    id:    'fifty_sold',
    icon:  '🏆',
    label: 'Pro Seller',
    desc:  "50 items sold — you're a machine",
    check: s => s.soldCount >= 50,
  },

  // Earnings
  {
    id:    'earn_100',
    icon:  '💵',
    label: 'First Hundred',
    desc:  'Earned $100 from your ledgr',
    check: s => s.totalEarned >= 100,
  },
  {
    id:    'earn_500',
    icon:  '💰',
    label: 'Half a Grand',
    desc:  'Earned $500 from selling',
    check: s => s.totalEarned >= 500,
  },
  {
    id:    'earn_1000',
    icon:  '🤑',
    label: 'Four Digits',
    desc:  'Earned over $1,000',
    check: s => s.totalEarned >= 1000,
  },
  {
    id:    'earn_5000',
    icon:  '💎',
    label: 'Side Hustle',
    desc:  'Earned $5,000 — this is your thing',
    check: s => s.totalEarned >= 5000,
  },

  // Declutter progress
  {
    id:    'half_clear',
    icon:  '🧹',
    label: 'Halfway There',
    desc:  'Sold half of everything you listed',
    check: s => {
      const total = s.totalItems + s.soldCount;
      return total >= 4 && s.soldCount / total >= 0.5;
    },
  },
  {
    id:    'mostly_clear',
    icon:  '✨',
    label: 'Marie Kondo Mode',
    desc:  '80% of your items sold',
    check: s => {
      const total = s.totalItems + s.soldCount;
      return total >= 5 && s.soldCount / total >= 0.8;
    },
  },

  // Profit
  {
    id:    'profit_made',
    icon:  '📈',
    label: 'In the Green',
    desc:  'Made a profit — sold above what you paid',
    check: s => s.totalProfit > 0,
  },
];

// Returns the subset of achievements that are currently unlocked
export function getUnlocked(stats) {
  if (!stats) return [];
  return ACHIEVEMENTS.filter(a => {
    try { return a.check(stats); } catch { return false; }
  });
}

// Returns the declutter score as a 0–100 integer
export function getDeclutterScore(stats) {
  if (!stats) return 0;
  const total = (stats.totalItems || 0) + (stats.soldCount || 0);
  if (total === 0) return 0;
  return Math.round((stats.soldCount / total) * 100);
}

export function getDeclutterLabel(score) {
  if (score === 0)   return 'Just getting started';
  if (score < 20)    return 'Warming up';
  if (score < 40)    return 'Making headway';
  if (score < 60)    return 'Getting there';
  if (score < 80)    return 'On a roll';
  if (score < 100)   return 'Almost free';
  return 'Clutter-free! 🎊';
}

// ── Persistence (localStorage) ───────────────────────────────────────────────
const SEEN_KEY = 'stash:seen_achievements';

export function getSeenIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch { return new Set(); }
}

export function markSeen(ids) {
  const current = getSeenIds();
  ids.forEach(id => current.add(id));
  localStorage.setItem(SEEN_KEY, JSON.stringify([...current]));
}
