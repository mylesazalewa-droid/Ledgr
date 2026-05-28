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

  const addItem = useCallback(async (item) => {
    const newItem = await storage.addItem(item);
    setItems(prev => [newItem, ...prev]);
    return newItem;
  }, []);

  const updateItem = useCallback(async (id, changes) => {
    const updated = await storage.updateItem(id, changes);
    setItems(prev => prev.map(i => i.id === id ? updated : i));
    return updated;
  }, []);

  const deleteItem = useCallback(async (id) => {
    await storage.deleteItem(id);
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const markSold = useCallback(async (id, saleData) => {
    const updated = await storage.markSold(id, saleData);
    setItems(prev => prev.map(i => i.id === id ? updated : i));
    return updated;
  }, []);

  // refetch is kept for Electron compatibility and manual refresh needs
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
