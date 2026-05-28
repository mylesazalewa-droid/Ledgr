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
  addDoc, writeBatch, onSnapshot,
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

  const totalItems  = available.reduce((s, i) => s + (i.quantity || 1), 0);
  const soldCount   = sold.length;
  const totalValue  = available.reduce((s, i) => s + (i.asking_price || 0) * (i.quantity || 1), 0);
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

// Default homes — seeded on first use
const DEFAULT_HOMES = [
  { id: 'home_default', name: 'My Home', sort_order: 0 },
];

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

// Strip undefined values — Firestore SDK throws if any field is undefined.
// (null is fine; undefined is not.)
function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// Module-level helper so storefront methods can call it without `this` dependency
async function syncStorefrontItemsInternal(u) {
  // Fetch all user items
  const snap = await getDocs(query(collection(firestoreDb, 'users', u, 'items'), orderBy('added_at', 'desc')));
  const allItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const available = allItems.filter(i => i.status === 'available' || i.status === 'reserved');

  const sfItemsCol = collection(firestoreDb, 'storefronts', u, 'items');

  // Replace all storefront items in one batch
  const existingSnap = await getDocs(sfItemsCol);
  const batch = writeBatch(firestoreDb);
  existingSnap.docs.forEach(d => batch.delete(d.ref));
  available.forEach(item => {
    const sfItemRef = doc(firestoreDb, 'storefronts', u, 'items', item.id);
    batch.set(sfItemRef, {
      id:           item.id,
      name:         item.name         || '',
      make:         item.make         || null,
      model:        item.model        || null,
      condition:    item.condition    || null,
      asking_price: item.asking_price || 0,
      photo_url:    item.photo_url    || item.photo_path || null,
      notes:        item.notes        || null,
      status:       item.status,
      quantity:     item.quantity     || 1,
      location:     item.location     || null,
      added_at:     item.added_at     || null,
      category_id:  item.category_id  || null,
    });
  });
  await batch.commit();
}

export function createFirestoreAdapter() {
  // Cache items in memory to power getStats without extra round trips
  let _cachedItems = null;

  // Listeners that want live stat updates whenever items snapshot fires
  const _statsListeners = new Set();
  function _notifyStats() {
    if (_cachedItems && _statsListeners.size > 0) {
      const s = computeStats(_cachedItems);
      _statsListeners.forEach(fn => fn(s));
    }
  }

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
      const data = clean({
        ...item,
        id,
        status:     'available',
        added_at:   now,
        updated_at: now,
      });
      await setDoc(docRef('items', id), data);
      if (_cachedItems) _cachedItems = [data, ..._cachedItems];
      return data;
    },

    async updateItem(id, changes) {
      const ref  = docRef('items', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      const updated = { ...snap.data(), ...changes, updated_at: new Date().toISOString() };
      await updateDoc(ref, clean(changes));
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

      const item       = snap.data();
      const currentQty = item.quantity || 1;

      // Always log the individual sale unit
      const logId = nanoid();
      await setDoc(docRef('sold_log', logId), {
        id: logId, item_id: id,
        sold_price:    saleData.soldPrice,
        net_proceeds:  saleData.netProceeds ?? saleData.soldPrice,
        platform:      saleData.platform    || null,
        sold_at:       now,
        notes:         saleData.notes       || null,
        sold_fee_pct:  saleData.feePct      || 0,
        sold_shipping: saleData.shippingCost || 0,
      });

      let changes;
      if (currentQty > 1) {
        // More units remain — decrement and stay available
        changes = { quantity: currentQty - 1, updated_at: now };
      } else {
        // Last unit — mark as sold
        changes = {
          status:        'sold',
          sold_price:    saleData.soldPrice,
          net_proceeds:  saleData.netProceeds ?? saleData.soldPrice,
          sold_at:       now,
          sold_platform: saleData.platform    || null,
          sold_fee_pct:  saleData.feePct      || 0,
          sold_shipping: saleData.shippingCost || 0,
          updated_at:    now,
        };
      }

      await updateDoc(ref, clean(changes));
      const updated = { ...item, ...changes };
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

    // ---- Homes ----
    async getHomes() {
      const snap = await getDocs(query(col('homes'), orderBy('sort_order', 'asc')));
      if (snap.empty) {
        const batch = writeBatch(firestoreDb);
        DEFAULT_HOMES.forEach(h => batch.set(docRef('homes', h.id), h));
        await batch.commit();
        return DEFAULT_HOMES;
      }
      return snap.docs.map(toItem);
    },

    async addHome(home) {
      const id   = nanoid();
      const data = { id, name: home.name, sort_order: home.sort_order || 99 };
      await setDoc(docRef('homes', id), data);
      return data;
    },

    async updateHome(id, changes) {
      await updateDoc(docRef('homes', id), changes);
    },

    async deleteHome(id) {
      // Reassign items that belong to this home to home_default (or first available)
      const homesSnap = await getDocs(query(col('homes'), orderBy('sort_order', 'asc')));
      const first = homesSnap.docs.map(toItem).find(h => h.id !== id);
      if (first) {
        const itemsSnap = await getDocs(query(col('items'), where('home_id', '==', id)));
        if (!itemsSnap.empty) {
          const batch = writeBatch(firestoreDb);
          itemsSnap.docs.forEach(d => batch.update(d.ref, { home_id: first.id, updated_at: new Date().toISOString() }));
          await batch.commit();
        }
      }
      await deleteDoc(docRef('homes', id));
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

    // ---- Real-time subscriptions ----

    /**
     * Subscribe to live item updates via Firestore onSnapshot.
     * Returns an unsubscribe function — call it in useEffect cleanup.
     * Also notifies any subscribeToStats listeners on every change.
     */
    subscribeToItems(callback) {
      const q = query(col('items'), orderBy('added_at', 'desc'));
      return onSnapshot(q, (snap) => {
        const items = snap.docs.map(toItem);
        _cachedItems = items;
        callback(items);
        _notifyStats();
      }, (err) => {
        console.error('subscribeToItems error:', err);
      });
    },

    /**
     * Subscribe to live stat updates derived from the items snapshot.
     * The callback fires immediately if items are already cached,
     * then again whenever subscribeToItems delivers a new snapshot.
     * Returns an unsubscribe function.
     */
    subscribeToStats(callback) {
      _statsListeners.add(callback);
      // Deliver current stats right away if we already have items
      if (_cachedItems) callback(computeStats(_cachedItems));
      return () => _statsListeners.delete(callback);
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

      // Try Firebase Storage first — best for CDN delivery & bandwidth
      if (firebaseStorage && uid()) {
        try {
          const ext  = (file.name?.split('.').pop()) || 'jpg';
          const name = `${nanoid()}.${ext}`;
          const ref  = storageRef(firebaseStorage, `users/${uid()}/photos/${name}`);
          await uploadBytes(ref, file, { contentType: file.type || 'image/jpeg' });
          return await getDownloadURL(ref);
        } catch (err) {
          console.warn('Firebase Storage upload failed, falling back to base64:', err.message);
        }
      }

      // Base64 fallback — stores photo inline in Firestore document.
      // Photos are compressed to ~60–150 KB by PhotoUpload, well within Firestore's 1 MB limit.
      // This path NEVER rejects — worst case it returns null.
      return new Promise((resolve) => {
        try {
          const reader = new FileReader();
          reader.onload  = () => resolve(reader.result);
          reader.onerror = () => resolve(null); // never reject
          reader.readAsDataURL(file);
        } catch {
          resolve(null);
        }
      });
    },

    async getPhotoDataUrl(urlOrPath) {
      // In web mode, photo_path IS the Firebase Storage URL
      return urlOrPath || null;
    },

    // ---- Public Storefront ----

    /**
     * Enable (or update) this user's public storefront.
     * Writes a public document at storefronts/{uid} and mirrors
     * all currently-available items to storefronts/{uid}/items/.
     */
    async enableStorefront({ displayName, bio, contactInfo }) {
      const u = uid();
      if (!u) throw new Error('Not signed in');

      // Write the public profile
      await setDoc(doc(firestoreDb, 'storefronts', u), {
        enabled:     true,
        displayName: displayName || '',
        bio:         bio         || '',
        contactInfo: contactInfo || '',
        updatedAt:   new Date().toISOString(),
      });

      // Mirror available items (inline to avoid `this` binding issues through Proxy)
      await syncStorefrontItemsInternal(u);
      return true;
    },

    async updateStorefrontProfile({ displayName, bio, contactInfo }) {
      const u = uid();
      if (!u) throw new Error('Not signed in');
      await updateDoc(doc(firestoreDb, 'storefronts', u), {
        displayName: displayName || '',
        bio:         bio         || '',
        contactInfo: contactInfo || '',
        updatedAt:   new Date().toISOString(),
      });
    },

    async disableStorefront() {
      const u = uid();
      if (!u) throw new Error('Not signed in');
      // Mark as disabled — keeps data but hides the page
      await updateDoc(doc(firestoreDb, 'storefronts', u), {
        enabled:   false,
        updatedAt: new Date().toISOString(),
      }).catch(() => {}); // ignore if doc doesn't exist yet
    },

    async syncStorefrontItems() {
      const u = uid();
      if (!u) return;
      await syncStorefrontItemsInternal(u);
    },

    async getStorefrontStatus() {
      const u = uid();
      if (!u) return null;
      try {
        const snap = await getDoc(doc(firestoreDb, 'storefronts', u));
        return snap.exists() ? snap.data() : null;
      } catch {
        return null;
      }
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
