import { useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage.js';

export function useItems() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await storage.getItems({});
      setItems(data);
    } catch (err) {
      console.error('useItems:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

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

  return { items, loading, addItem, updateItem, deleteItem, markSold, refetch: fetch };
}
