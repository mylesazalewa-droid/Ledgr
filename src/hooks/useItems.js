import { useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage.js';

export function useItems() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // subscribeToItems returns an unsubscribe fn (Firestore / localStorage).
    // For Electron (window.stash) it returns undefined — fall back to one-shot fetch.
    const unsubscribe = storage.subscribeToItems((data) => {
      setItems(data);
      setLoading(false);
    });

    if (!unsubscribe) {
      storage.getItems({})
        .then((data) => { setItems(data); setLoading(false); })
        .catch((err)  => { console.error('useItems:', err); setLoading(false); });
    }

    return () => unsubscribe?.();
  }, []);

  // With onSnapshot as the source of truth, mutations just fire the write.
  // The subscription delivers the updated list automatically — no local setItems
  // needed (and doing so would cause every entry to appear twice).
  const addItem = useCallback(async (item) => {
    return await storage.addItem(item);
  }, []);

  const updateItem = useCallback(async (id, changes) => {
    return await storage.updateItem(id, changes);
  }, []);

  const deleteItem = useCallback(async (id) => {
    await storage.deleteItem(id);
  }, []);

  const markSold = useCallback(async (id, saleData) => {
    return await storage.markSold(id, saleData);
  }, []);

  // refetch kept for Electron and manual-refresh callers
  const refetch = useCallback(async () => {
    try {
      const data = await storage.getItems({});
      setItems(data);
    } catch (err) {
      console.error('useItems refetch:', err);
    }
  }, []);

  return { items, loading, addItem, updateItem, deleteItem, markSold, refetch };
}
