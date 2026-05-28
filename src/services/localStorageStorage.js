/**
 * Local-first storage adapter.
 * Uses localStorage for item/category/settings data and
 * IndexedDB for photos (binary blobs, no size limit).
 *
 * Used automatically when Firebase is not configured.
 * Implements the same API surface as firestoreStorage.js and window.stash.
 */

const KEY_ITEMS      = 'stash:items';
const KEY_CATEGORIES = 'stash:categories';
const KEY_SETTINGS   = 'stash:settings';
const PHOTO_DB       = 'stash-photos';
const PHOTO_STORE    = 'photos';

const DEFAULT_CATEGORIES = [
  { id: 'cat_electronics',  name: 'Electronics',  icon: 'Cpu',    color: '#5b8ef0' },
  { id: 'cat_appliances',   name: 'Appliances',   icon: 'Zap',    color: '#f0c45b' },
  { id: 'cat_furniture',    name: 'Furniture',    icon: 'Home',   color: '#7c6fcd' },
  { id: 'cat_clothing',     name: 'Clothing',     icon: 'Shirt',  color: '#4caf7d' },
  { id: 'cat_tools',        name: 'Tools',        icon: 'Wrench', color: '#f07c5b' },
  { id: 'cat_collectibles', name: 'Collectibles', icon: 'Star',   color: '#d4a853' },
  { id: 'cat_sports',       name: 'Sports',       icon: 'Bike',   color: '#5bcfcf' },
  { id: 'cat_other',        name: 'Other',        icon: 'Box',    color: '#888891' },
];

// ---- localStorage helpers ----
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---- IndexedDB helpers for photos ----
let _photoDB = null;
function openPhotoDB() {
  if (_photoDB) return Promise.resolve(_photoDB);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PHOTO_DB, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(PHOTO_STORE);
    req.onsuccess  = e => { _photoDB = e.target.result; resolve(_photoDB); };
    req.onerror    = e => reject(e.target.error);
  });
}

async function storePhoto(file) {
  const id = `photo_${crypto.randomUUID()}`;
  const db = await openPhotoDB();
  await new Promise((resolve, reject) => {
    const tx  = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).put(file, id);
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
  return id;
}

async function loadPhoto(id) {
  if (!id) return null;
  // Already a URL (Firebase Storage URL, blob:, data:, or http)
  if (id.startsWith('http') || id.startsWith('data:') || id.startsWith('blob:')) return id;
  try {
    const db = await openPhotoDB();
    const blob = await new Promise((resolve) => {
      const tx  = db.transaction(PHOTO_STORE, 'readonly');
      const req = tx.objectStore(PHOTO_STORE).get(id);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = ()  => resolve(null);
    });
    return blob ? URL.createObjectURL(blob) : null;
  } catch { return null; }
}

// ---- Stats computation ----
function computeStats(items) {
  const available = items.filter(i => i.status !== 'sold');
  const sold      = items.filter(i => i.status === 'sold');
  const totalEarned  = sold.reduce((s, i) => s + (i.sold_price  || 0), 0);
  const totalCost    = sold.reduce((s, i) => s + (i.cost_price  || 0), 0);
  const totalProfit  = totalEarned - totalCost;
  const soldWithCost = sold.filter(i => i.cost_price > 0);
  const avgMargin    = soldWithCost.length
    ? soldWithCost.reduce((s, i) => s + (i.sold_price - i.cost_price) / i.cost_price * 100, 0) / soldWithCost.length
    : 0;

  const now = new Date();
  const longestSitting = available
    .map(i => ({ ...i, days_listed: Math.floor((now - new Date(i.added_at)) / 86400000) }))
    .filter(i => i.days_listed >= 30)
    .sort((a, b) => b.days_listed - a.days_listed)
    .slice(0, 4);

  const monthly = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthly[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
  }
  sold.forEach(item => {
    if (!item.sold_at) return;
    const key = item.sold_at.slice(0, 7);
    if (key in monthly) monthly[key] += (item.sold_price || 0);
  });

  return {
    totalItems: available.reduce((s, i) => s + (i.quantity || 1), 0),
    totalValue: available.reduce((s, i) => s + (i.est_value || i.asking_price || 0) * (i.quantity || 1), 0),
    soldCount: sold.length,
    totalEarned,
    totalCost,
    totalProfit,
    avgMargin,
    longestSitting,
    monthlyEarnings: Object.entries(monthly).map(([month, total]) => ({ month, total })),
  };
}

// ---- Adapter ----
export function createLocalStorageAdapter() {
  return {
    // ---- Items ----
    async getItems() {
      return load(KEY_ITEMS, []);
    },

    async addItem(data) {
      const items = load(KEY_ITEMS, []);
      const item  = {
        ...data,
        id:         crypto.randomUUID(),
        status:     data.status || 'available',
        added_at:   new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      save(KEY_ITEMS, [...items, item]);
      return item;
    },

    async updateItem(id, changes) {
      const items   = load(KEY_ITEMS, []);
      const updated = items.map(i =>
        i.id === id ? { ...i, ...changes, updated_at: new Date().toISOString() } : i
      );
      save(KEY_ITEMS, updated);
      return updated.find(i => i.id === id);
    },

    async deleteItem(id) {
      save(KEY_ITEMS, load(KEY_ITEMS, []).filter(i => i.id !== id));
      return { success: true };
    },

    async markSold(id, saleData) {
      const items = load(KEY_ITEMS, []);
      const item  = items.find(i => i.id === id);
      if (!item) return null;
      const now        = new Date().toISOString();
      const currentQty = item.quantity || 1;

      let changes;
      if (currentQty > 1) {
        changes = { quantity: currentQty - 1, updated_at: now };
      } else {
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

      const updated = items.map(i => i.id === id ? { ...i, ...changes } : i);
      save(KEY_ITEMS, updated);
      return updated.find(i => i.id === id);
    },

    // ---- Categories ----
    async getCategories() {
      const stored = load(KEY_CATEGORIES, null);
      if (!stored) {
        save(KEY_CATEGORIES, DEFAULT_CATEGORIES);
        return DEFAULT_CATEGORIES;
      }
      return stored;
    },

    async addCategory(data) {
      const cats = load(KEY_CATEGORIES, DEFAULT_CATEGORIES);
      const cat  = { ...data, id: `cat_${crypto.randomUUID()}` };
      save(KEY_CATEGORIES, [...cats, cat]);
      return cat;
    },

    async updateCategory(id, changes) {
      const cats = load(KEY_CATEGORIES, DEFAULT_CATEGORIES);
      save(KEY_CATEGORIES, cats.map(c => c.id === id ? { ...c, ...changes } : c));
    },

    async deleteCategory(id) {
      save(KEY_CATEGORIES, load(KEY_CATEGORIES, DEFAULT_CATEGORIES).filter(c => c.id !== id));
      const items = load(KEY_ITEMS, []);
      save(KEY_ITEMS, items.map(i => i.category_id === id ? { ...i, category_id: 'cat_other' } : i));
      return { success: true };
    },

    // ---- Real-time subscriptions (one-shot for localStorage — no live updates) ----
    subscribeToItems(callback) {
      this.getItems().then(callback).catch(console.error);
      return () => {}; // no-op unsubscribe
    },
    subscribeToStats(callback) {
      this.getStats().then(callback).catch(console.error);
      return () => {};
    },

    // ---- Stats ----
    async getStats() {
      return computeStats(load(KEY_ITEMS, []));
    },

    async getSoldLog() {
      return load(KEY_ITEMS, [])
        .filter(i => i.status === 'sold')
        .sort((a, b) => new Date(b.sold_at) - new Date(a.sold_at));
    },

    // ---- Settings ----
    async getSetting(key) {
      return load(KEY_SETTINGS, {})[key] ?? null;
    },

    async setSetting(key, value) {
      const settings = load(KEY_SETTINGS, {});
      save(KEY_SETTINGS, { ...settings, [key]: String(value) });
      return { key, value };
    },

    // ---- Photos ----
    async copyPhotoToAppData(file) {
      if (typeof file === 'string') return file;
      try {
        return await storePhoto(file);
      } catch (err) {
        // IndexedDB unavailable (iOS private mode, quota exceeded, etc.)
        // Fall back to base64 — never rejects, returns null on total failure.
        console.warn('IndexedDB photo storage failed, falling back to base64:', err);
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
      }
    },

    async getPhotoDataUrl(path) {
      return loadPhoto(path);
    },

    // ---- Utils ----
    async openExternal(url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    },

    async exportCsv(content) {
      const blob = new Blob([content], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), {
        href: url,
        download: `stash-export-${new Date().toISOString().slice(0, 10)}.csv`,
      });
      a.click();
      URL.revokeObjectURL(url);
    },
  };
}
