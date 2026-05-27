const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let _db = null;

function getDb() {
  if (!_db) {
    const dbPath = path.join(app.getPath('userData'), 'stash.db');
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
    runMigrations(_db);
  }
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      make          TEXT,
      model         TEXT,
      category_id   TEXT,
      condition     TEXT CHECK(condition IN ('New','Like New','Good','Fair','Poor')),
      cost_price    REAL DEFAULT 0,
      est_value     REAL DEFAULT 0,
      asking_price  REAL DEFAULT 0,
      sold_price    REAL,
      sold_at       TEXT,
      sold_platform TEXT,
      listing_url   TEXT,
      status        TEXT DEFAULT 'available' CHECK(status IN ('available','reserved','sold')),
      notes         TEXT,
      photo_path    TEXT,
      photo_url     TEXT,
      added_at      TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now')),
      firebase_id   TEXT,
      synced_at     TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      icon       TEXT,
      color      TEXT,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sold_log (
      id         TEXT PRIMARY KEY,
      item_id    TEXT REFERENCES items(id),
      sold_price REAL,
      platform   TEXT,
      sold_at    TEXT DEFAULT (datetime('now')),
      notes      TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    INSERT OR IGNORE INTO categories (id, name, icon, color, sort_order) VALUES
      ('cat_electronics',  'Electronics',  'Cpu',    '#5b8ef0', 1),
      ('cat_appliances',   'Appliances',   'Zap',    '#d4a853', 2),
      ('cat_furniture',    'Furniture',    'Home',   '#7c6fcd', 3),
      ('cat_clothing',     'Clothing',     'Shirt',  '#4caf7d', 4),
      ('cat_tools',        'Tools',        'Wrench', '#e05c5c', 5),
      ('cat_collectibles', 'Collectibles', 'Star',   '#f07c5b', 6),
      ('cat_sports',       'Sports',       'Bike',   '#5bcfcf', 7),
      ('cat_other',        'Other',        'Box',    '#888891', 99);

    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('FEATURE_LOCAL_STORAGE',   'true'),
      ('FEATURE_UNLIMITED_ITEMS', 'true'),
      ('FEATURE_EXPORT_CSV',      'true'),
      ('FEATURE_FIREBASE_SYNC',   'false'),
      ('FEATURE_CLOUD_PHOTOS',    'false'),
      ('FEATURE_MULTI_DEVICE',    'false');
  `);
}

function runMigrations(db) {
  const cols = db.prepare('PRAGMA table_info(items)').all().map(c => c.name);
  if (!cols.includes('cost_price')) {
    db.exec('ALTER TABLE items ADD COLUMN cost_price REAL DEFAULT 0');
  }
}

function newId() {
  return crypto.randomUUID();
}

// ---- Items ----

function getItems(filters = {}) {
  const db = getDb();
  let query = 'SELECT * FROM items WHERE 1=1';
  const params = [];

  if (filters.category) {
    query += ' AND category_id = ?';
    params.push(filters.category);
  }
  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.search) {
    const s = `%${filters.search}%`;
    query += ' AND (name LIKE ? OR make LIKE ? OR model LIKE ? OR notes LIKE ?)';
    params.push(s, s, s, s);
  }
  query += ' ORDER BY added_at DESC';
  return db.prepare(query).all(...params);
}

function getItem(id) {
  return getDb().prepare('SELECT * FROM items WHERE id = ?').get(id);
}

function addItem(item) {
  const db = getDb();
  const id  = newId();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO items
      (id, name, make, model, category_id, condition,
       cost_price, est_value, asking_price,
       status, notes, photo_path, listing_url, added_at, updated_at)
    VALUES
      (@id, @name, @make, @model, @category_id, @condition,
       @cost_price, @est_value, @asking_price,
       @status, @notes, @photo_path, @listing_url, @added_at, @updated_at)
  `).run({
    id,
    name:         item.name,
    make:         item.make        || null,
    model:        item.model       || null,
    category_id:  item.category_id || null,
    condition:    item.condition   || 'Good',
    cost_price:   item.cost_price  || 0,
    est_value:    item.est_value   || 0,
    asking_price: item.asking_price || 0,
    status:       'available',
    notes:        item.notes       || null,
    photo_path:   item.photo_path  || null,
    listing_url:  item.listing_url || null,
    added_at:     now,
    updated_at:   now,
  });
  return getItem(id);
}

function updateItem(id, changes) {
  const db = getDb();
  const allowed = [
    'name', 'make', 'model', 'category_id', 'condition',
    'cost_price', 'est_value', 'asking_price',
    'status', 'notes', 'photo_path', 'photo_url', 'listing_url',
  ];
  const fields = Object.keys(changes).filter(k => allowed.includes(k));
  if (fields.length === 0) return getItem(id);

  const set    = fields.map(f => `${f} = @${f}`).join(', ');
  const params = { id, updated_at: new Date().toISOString() };
  fields.forEach(f => { params[f] = changes[f]; });

  db.prepare(`UPDATE items SET ${set}, updated_at = @updated_at WHERE id = @id`).run(params);
  return getItem(id);
}

function deleteItem(id) {
  getDb().prepare('DELETE FROM items WHERE id = ?').run(id);
  return { success: true };
}

function markSold(id, saleData) {
  const db  = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE items
    SET status = 'sold', sold_price = @sold_price, sold_at = @sold_at,
        sold_platform = @platform, updated_at = @updated_at
    WHERE id = @id
  `).run({
    id,
    sold_price: saleData.soldPrice,
    sold_at:    saleData.soldAt || now,
    platform:   saleData.platform || null,
    updated_at: now,
  });

  db.prepare(`
    INSERT INTO sold_log (id, item_id, sold_price, platform, sold_at, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(newId(), id, saleData.soldPrice, saleData.platform || null, saleData.soldAt || now, saleData.notes || null);

  return getItem(id);
}

// ---- Categories ----

function getCategories() {
  return getDb().prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
}

function addCategory(cat) {
  const db      = getDb();
  const id      = newId();
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM categories').get().m || 0;
  db.prepare(`INSERT INTO categories (id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)`)
    .run(id, cat.name, cat.icon || 'Box', cat.color || '#888891', maxOrder + 1);
  return { id, name: cat.name, icon: cat.icon || 'Box', color: cat.color || '#888891', sort_order: maxOrder + 1 };
}

function updateCategory(id, changes) {
  const allowed = ['name', 'icon', 'color', 'sort_order'];
  const fields  = Object.keys(changes).filter(k => allowed.includes(k));
  if (fields.length === 0) return;
  const set    = fields.map(f => `${f} = @${f}`).join(', ');
  const params = { id };
  fields.forEach(f => { params[f] = changes[f]; });
  getDb().prepare(`UPDATE categories SET ${set} WHERE id = @id`).run(params);
}

function deleteCategory(id) {
  const db  = getDb();
  const now = new Date().toISOString();
  // Reassign any items in this category to "Other" — never orphan items
  db.prepare("UPDATE items SET category_id = 'cat_other', updated_at = ? WHERE category_id = ?").run(now, id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  return { success: true };
}

// ---- Stats ----

function getStats() {
  const db = getDb();

  const totalItems  = db.prepare("SELECT COUNT(*) as c FROM items WHERE status != 'sold'").get().c;
  const soldCount   = db.prepare("SELECT COUNT(*) as c FROM items WHERE status = 'sold'").get().c;
  const totalValue  = db.prepare("SELECT COALESCE(SUM(asking_price),0) as s FROM items WHERE status != 'sold'").get().s;
  const totalEarned = db.prepare("SELECT COALESCE(SUM(sold_price),0)  as s FROM items WHERE status = 'sold'").get().s;
  const totalCost   = db.prepare("SELECT COALESCE(SUM(cost_price),0)  as s FROM items WHERE status = 'sold'").get().s;
  const totalProfit = totalEarned - totalCost;
  const avgMargin   = totalEarned > 0 ? Math.round((totalProfit / totalEarned) * 100) : 0;

  const monthlyEarnings = db.prepare(`
    SELECT strftime('%Y-%m', sold_at) as month, SUM(sold_price) as total
    FROM items WHERE status = 'sold' AND sold_at IS NOT NULL
    GROUP BY month ORDER BY month DESC LIMIT 12
  `).all().reverse();

  const longestSitting = db.prepare(`
    SELECT *, CAST((julianday('now') - julianday(added_at)) AS INTEGER) as days_listed
    FROM items WHERE status = 'available'
    ORDER BY added_at ASC LIMIT 5
  `).all();

  return { totalItems, soldCount, totalValue, totalEarned, totalCost, totalProfit, avgMargin, monthlyEarnings, longestSitting };
}

function getSoldLog() {
  return getDb().prepare(`
    SELECT sl.*, i.name as item_name, i.category_id, i.photo_path
    FROM sold_log sl JOIN items i ON sl.item_id = i.id
    ORDER BY sl.sold_at DESC
  `).all();
}

// ---- Settings ----

function getSetting(key) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
  return { key, value };
}

module.exports = {
  getItems, getItem, addItem, updateItem, deleteItem, markSold,
  getCategories, addCategory, updateCategory, deleteCategory,
  getStats, getSoldLog,
  getSetting, setSetting,
};
