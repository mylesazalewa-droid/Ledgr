import { useState, useEffect, useCallback, useRef } from 'react';
import { storage, isElectron } from '../services/storage.js';
import { isFirebaseConfigured } from '../firebase.js';

// Firestore (web + Firebase) delivers live updates via onSnapshot.
// Electron (SQLite) and localStorage have no live subscription —
// mutations must update local state immediately or the UI stays stale
// until the app is restarted.
const hasLiveSubscription = isFirebaseConfigured && !isElectron;

export function useItems() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  // Track whether onSnapshot is the active source of truth
  const liveRef = useRef(false);

  useEffect(() => {
    setLoading(true);

    // subscribeToItems returns an unsubscribe fn (Firestore / localStorage).
    // For Electron (window.ledgr) it returns undefined — fall back to one-shot fetch.
    const unsubscribe = storage.subscribeToItems((data) => {
      liveRef.current = true;
      setItems(data);
      setLoading(false);
    });

    if (!unsubscribe) {
      storage.getItems({})
        .then((data) => { setItems(data); setLoading(false); })
        .catch((err)  => { console.error('useItems:', err); setLoading(false); });
    }

    return () => { liveRef.current = false; unsubscribe?.(); };
  }, []);

  const addItem = useCallback(async (item) => {
    const newItem = await storage.addItem(item);
    // For Firestore, onSnapshot delivers the update automatically.
    // For Electron + localStorage there is no live subscription — update immediately.
    if (!hasLiveSubscription) {
      setItems(prev => [newItem, ...prev]);
    }
    return newItem;
  }, []);

  const updateItem = useCallback(async (id, changes) => {
    const updated = await storage.updateItem(id, changes);
    if (!hasLiveSubscription && updated) {
      setItems(prev => prev.map(i => i.id === id ? updated : i));
    }
    return updated;
  }, []);

  const deleteItem = useCallback(async (id) => {
    await storage.deleteItem(id);
    if (!hasLiveSubscription) {
      setItems(prev => prev.filter(i => i.id !== id));
    }
  }, []);

  const markSold = useCallback(async (id, saleData) => {
    const updated = await storage.markSold(id, saleData);
    if (!hasLiveSubscription && updated) {
      setItems(prev => prev.map(i => i.id === id ? updated : i));
    }
    return updated;
  }, []);

  // refetch kept for manual-refresh callers
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
