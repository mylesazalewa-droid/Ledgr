import { useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage.js';

const FALLBACK = [{ id: 'home_default', name: 'My Home', sort_order: 0 }];

export function useHomes() {
  const [homes, setHomes] = useState(FALLBACK);

  const fetch = useCallback(async () => {
    try {
      const data = await storage.getHomes();
      setHomes(data?.length ? data : FALLBACK);
    } catch {
      setHomes(FALLBACK);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addHome = useCallback(async (home) => {
    const newHome = await storage.addHome(home);
    setHomes(prev => [...prev, newHome]);
    return newHome;
  }, []);

  const updateHome = useCallback(async (id, changes) => {
    await storage.updateHome(id, changes);
    setHomes(prev => prev.map(h => h.id === id ? { ...h, ...changes } : h));
  }, []);

  const deleteHome = useCallback(async (id) => {
    await storage.deleteHome(id);
    setHomes(prev => prev.filter(h => h.id !== id));
  }, []);

  return { homes, addHome, updateHome, deleteHome };
}
