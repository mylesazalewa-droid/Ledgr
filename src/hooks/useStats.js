import { useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage.js';

const DEFAULT = {
  totalItems: 0, soldCount: 0,
  totalValue: 0, totalEarned: 0,
  totalCost: 0,  totalProfit: 0, avgMargin: 0,
  monthlyEarnings: [], longestSitting: [],
};

export function useStats() {
  const [stats, setStats] = useState(DEFAULT);

  const fetch = useCallback(async () => {
    try {
      const data = await storage.getStats();
      setStats(data);
    } catch (err) {
      console.error('useStats:', err);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, refetch: fetch };
}
