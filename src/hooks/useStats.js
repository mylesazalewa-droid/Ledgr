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

  useEffect(() => {
    // subscribeToStats fires whenever the items snapshot updates (Firestore)
    // or once on mount (localStorage). Returns undefined for Electron.
    const unsubscribe = storage.subscribeToStats((data) => {
      setStats(data);
    });

    if (!unsubscribe) {
      storage.getStats().then(setStats).catch(console.error);
    }

    return () => unsubscribe?.();
  }, []);

  const refetch = useCallback(async () => {
    try {
      const data = await storage.getStats();
      setStats(data);
    } catch (err) {
      console.error('useStats refetch:', err);
    }
  }, []);

  return { stats, refetch };
}
