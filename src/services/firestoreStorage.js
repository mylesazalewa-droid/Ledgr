/**
 * Firebase Firestore adapter — implements the same API surface as window.stash (Electron IPC).
 * Used when running as a web app (Vercel deployment).
 *
 * Data model:
 *   /users/{uid}/items/{id}
 *   /users/{uid}/categories/{id}
 *   /users/{uid}/sold_log/{id}
 *   /users/{uid}/settings/{key}
 */

import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, query, where, orderBy, serverTimestamp,
  addDoc, writeBatch,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db as firestoreDb, storage as firebaseStorage, auth } from '../firebase.js';
import { nanoid } from 'nanoid';

function uid() {
  return auth?.currentUser?.uid;
}

function col(name) {
  return collection(firestoreDb, 'users', uid(), name);
}

function docRef(colName, id) {
  return doc(firestoreDb, 'users', uid(), colName, id);
}

// ---- Helpers ----

function toItem(snap) {
  return { id: snap.id, ...snap.data() };
}

function computeStats(items) {
  const available = items.filter(i => i.status !== 'sold');
  const sold      = items.filter(i => i.status === 'sold');

  const totalItems  = available.length;
  const soldCount   = sold.length;
  const totalValue  = available.reduce((s, i) => s + (i.asking_price || 0), 0);
  const totalEarned = sold.reduce((s, i) => s + (i.sold_price  || 0), 0);
  const totalCost   = sold.reduce((s, i) => s + (i.cost_price  || 0), 0);
  const totalProfit = totalEarned - totalCost;
  const avgMargin   = totalEarned > 0 ? Math.round((totalProfit / totalEarned) * 100) : 0;

  // Monthly earnings
  const monthlyMap = {};
  sold.forEach(i => {
    const month = (i.sold_at || '').slice(0, 7);
    if (month) monthlyMap[month] = (monthlyMap[month] || 0) + (i.sold_price || 0);
  });
  const monthlyEarnings = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, total]) => ({ month, total }));

  const now = Date.now();
  const longestSitting = available
    .filter(i => i.added_at)
    .map(i => ({
      ...i,
      days_listed: Math.floor((now - new Date(i.added_at).getTime()) / 86400000),
    }))
    .filter(i => i.days_listed >= 30)
    .sort((a, b) => a.days_listed - b.days_listed)
    .slice(0, 5);

  return { totalItems, soldCount, totalValue, totalEarned, totalCost, totalProfit, avgMargin, monthlyEarnings, longestSitting };
}

// Default categories — seeded on first use
const DEFAULT_CATEGORIES = [
  { id: 'cat_electronics',  name: 'Electronics',  icon: 'Cpu',    color: '#5b8ef0', sort_order: 1  },
  { id: 'cat_appliances',   name: 'Appliances',   icon: 'Zap',    color: '#d4a853', sort_order: 2  },
  { id: 'cat_furniture',    name: 'Furniture',    icon: 'Home',   color: '#7c6fcd', sort_order: 3  },
  { id: 'cat_clothing',     name: 'Clothing',     icon: 'Shirt',  color: '#4caf7d', sort_order: 4  },
  { id: 'cat_tools',        name: 'Tools',        icon: 'Wrench', color: '#e05c5c', sort_order: 5  },
  { id: 'cat_collectibles', name: 'Collectibles', icon: 'Star',   color: '#f07c5b', sort_order: 6  },
  { id: 'cat_sports',       name: 'Sports',       icon: 'Bike',   color: '#5bcfcf', sort_order: 7  },
  { id: 'cat_other',        name: 'Other',        icon: 'Box',    color: '#888891', sort_order: 99 },
];

export function createFirestoreAdapter() {
  // Cache items in memory to power getStats without extra round trips
  let _cachedItems = null;

  return {
    // ---- Items ----
    async getItems(filters = {}) {
      const snap  = await getDocs(query(col('items'), orderBy('added_at', 'desc')));
      let items   = snap.docs.map(toItem);
      _cachedItems = items;

      if (filters.category) items = items.filter(i => i.category_id === filters.category);
      if (filters.status)   items = items.filter(i => i.status === filters.status);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        items = items.filter(i =>
          i.name?.toLowerCase().includes(q) ||
          i.make?.toLowerCase().includes(q) ||
          i.model?.toLowerCase().includes(q)
        );
      }
      return items;
    },

    async getItem(id) {
      const snap = await getDoc(docRef('items', id));
      return snap.exists() ? toItem(snap) : null;
    },

    async addItem(item) {
      const id  = nanoid();
      const now = new Date().toISOString();
      const data = {
        ...item,
        id,
        status:     'available',
        added_at:   now,
        updated_at: now,
      };
      await setDoc(docRef('items', id), data);
      if (_cachedItems) _cachedItems = [data, ..._cachedItems];
      return data;
    },

    async updateItem(id, changes) {
      const ref  = docRef('items', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      const updated = { ...snap.data(), ...changes, updated_at: new Date().toISOString() };
      await updateDoc(ref, changes);
      if (_cachedItems) _cachedItems = _cachedItems.map(i => i.id === id ? updated : i);
      return updated;
    },

    async deleteItem(id) {
      await deleteDoc(docRef('items', id));
      if (_cachedItems) _cachedItems = _cachedItems.filter(i => i.id !== id);
      return { success: true };
    },

    async markSold(id, saleData) {
      const now  = new Date().toISOString();
      const ref  = docRef('items', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;

      const changes = {
        status:        'sold',
        sold_price:    saleData.soldPrice,
        sold_at:       saleData.soldAt || now,
        sold_platform: saleData.platform || null,
        updated_at:    now,
      };
      await updateDoc(ref, changes);

      const logId = nanoid();
      await setDoc(docRef('sold_log', logId), {
        id: logId, item_id: id,
        sold_price: saleData.soldPrice,
        platform:   saleData.platform || null,
        sold_at:    saleData.soldAt || now,
        notes:      saleData.notes || null,
      });

      const updated = { ...snap.data(), ...changes };
      if (_cachedItems) _cachedItems = _cachedItems.map(i => i.id === id ? updated : i);
      return updated;
    },

    // ---- Categories ----
    async getCategories() {
      const snap = await getDocs(query(col('categories'), orderBy('sort_order', 'asc')));
      if (snap.empty) {
        // Seed defaults on first use
        const batch = writeBatch(firestoreDb);
        DEFAULT_CATEGORIES.forEach(cat => {
          batch.set(docRef('categories', cat.id), cat);
        });
        await batch.commit();
        return DEFAULT_CATEGORIES;
      }
      return snap.docs.map(toItem);
    },

    async addCategory(cat) {
      const id = nanoid();
      const data = { id, name: cat.name, icon: cat.icon || 'Box', color: cat.color || '#888891', sort_order: cat.sort_order || 99 };
      await setDoc(docRef('categories', id), data);
      return data;
    },

    async updateCategory(id, changes) {
      await updateDoc(docRef('categories', id), changes);
    },

    async deleteCategory(id) {
      // Reassign items to "Other" first
      const snap = await getDocs(query(col('items'), where('category_id', '==', id)));
      if (!snap.empty) {
        const batch = writeBatch(firestoreDb);
        snap.docs.forEach(d => batch.update(d.ref, { category_id: 'cat_other', updated_at: new Date().toISOString() }));
        await batch.commit();
        if (_cachedItems) {
          _cachedItems = _cachedItems.map(i => i.category_id === id ? { ...i, category_id: 'cat_other' } : i);
        }
      }
      await deleteDoc(docRef('categories', id));
      return { success: true };
    },

    // ---- Stats ----
    async getStats() {
      if (!_cachedItems) {
        const snap = await getDocs(col('items'));
        _cachedItems = snap.docs.map(toItem);
      }
      return computeStats(_cachedItems);
    },

    async getSoldLog() {
      const snap = await getDocs(query(col('sold_log'), orderBy('sold_at', 'desc')));
      return snap.docs.map(toItem);
    },

    // ---- Settings ----
    async getSetting(key) {
      const snap = await getDoc(docRef('settings', key));
      return snap.exists() ? snap.data().value : null;
    },

    async setSetting(key, value) {
      await setDoc(docRef('settings', key), { key, value: String(value) });
      return { key, value };
    },

    // ---- Photos (web: upload to Firebase Storage) ----
    async openPhotoDialog() {
      return null; // Not supported in web — PhotoUpload uses a file input instead
    },

    async copyPhotoToAppData(file) {
      if (typeof file === 'string') return file; // already a URL
      const ext  = file.name?.split('.').pop() || 'jpg';
      const name = `${nanoid()}.${ext}`;
      // Path must match Storage rules: users/{uid}/{allPaths=**}
      const ref  = storageRef(firebaseStorage, `users/${uid()}/photos/${name}`);
      await uploadBytes(ref, file);
      return await getDownloadURL(ref);
    },

    async getPhotoDataUrl(urlOrPath) {
      // In web mode, photo_path IS the Firebase Storage URL
      return urlOrPath || null;
    },

    // ---- Utils ----
    async openExternal(url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    },

    async exportCsv(content) {
      const blob = new Blob([content], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `stash-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    },
  };
}
