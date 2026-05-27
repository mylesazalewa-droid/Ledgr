import { useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage.js';

export function useCategories() {
  const [categories, setCategories] = useState([]);

  const fetch = useCallback(async () => {
    try {
      const data = await storage.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('useCategories:', err);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addCategory = useCallback(async (cat) => {
    const newCat = await storage.addCategory(cat);
    setCategories(prev => [...prev, newCat]);
    return newCat;
  }, []);

  const updateCategory = useCallback(async (id, changes) => {
    await storage.updateCategory(id, changes);
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
  }, []);

  const deleteCategory = useCallback(async (id) => {
    await storage.deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  return { categories, addCategory, updateCategory, deleteCategory, refetch: fetch };
}
