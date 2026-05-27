const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs   = require('fs');

const isDev = !app.isPackaged;

let mainWindow;
let db;

function getDb() {
  if (!db) db = require('./db');
  return db;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0a0a0b',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Helper: delete a photo from userData/photos if it lives there
function safeDeletePhoto(filePath) {
  if (!filePath) return;
  try {
    const photosDir = path.join(app.getPath('userData'), 'photos');
    if (filePath.startsWith(photosDir) && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.warn('Could not delete old photo:', e.message);
  }
}

// ---- IPC: Items ----
ipcMain.handle('getItems',   (_, f)     => getDb().getItems(f));
ipcMain.handle('getItem',    (_, id)    => getDb().getItem(id));
ipcMain.handle('addItem',    (_, item)  => getDb().addItem(item));

ipcMain.handle('updateItem', (_, id, changes) => {
  // If photo is being replaced, clean up the old one
  if (changes.photo_path) {
    const old = getDb().getItem(id);
    if (old?.photo_path && old.photo_path !== changes.photo_path) {
      safeDeletePhoto(old.photo_path);
    }
  }
  return getDb().updateItem(id, changes);
});

ipcMain.handle('deleteItem', (_, id) => {
  const item = getDb().getItem(id);
  const result = getDb().deleteItem(id);
  safeDeletePhoto(item?.photo_path); // clean up photo after delete
  return result;
});

ipcMain.handle('markSold', (_, id, d) => getDb().markSold(id, d));

// ---- IPC: Categories ----
ipcMain.handle('getCategories',  ()         => getDb().getCategories());
ipcMain.handle('addCategory',    (_, cat)   => getDb().addCategory(cat));
ipcMain.handle('updateCategory', (_, id, c) => getDb().updateCategory(id, c));
ipcMain.handle('deleteCategory', (_, id)    => getDb().deleteCategory(id));

// ---- IPC: Photos ----
ipcMain.handle('openPhotoDialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif'] }],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('copyPhotoToAppData', (_, sourcePath) => {
  const photosDir = path.join(app.getPath('userData'), 'photos');
  if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });
  const ext  = path.extname(sourcePath) || '.jpg';
  const dest = path.join(photosDir, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  fs.copyFileSync(sourcePath, dest);
  return dest;
});

ipcMain.handle('getPhotoDataUrl', (_, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const ext  = path.extname(filePath).toLowerCase().replace('.', '');
  const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const data = fs.readFileSync(filePath);
  return `data:${mime};base64,${data.toString('base64')}`;
});

// ---- IPC: Stats ----
ipcMain.handle('getStats',   () => getDb().getStats());
ipcMain.handle('getSoldLog', () => getDb().getSoldLog());

// ---- IPC: Settings ----
ipcMain.handle('getSetting', (_, key)        => getDb().getSetting(key));
ipcMain.handle('setSetting', (_, key, value) => getDb().setSetting(key, value));

// ---- IPC: Utils ----
ipcMain.handle('openExternal', (_, url) => shell.openExternal(url));

ipcMain.handle('exportCsv', async (_, csvContent) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Stash Inventory',
    defaultPath: `stash-export-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (result.canceled) return false;
  fs.writeFileSync(result.filePath, csvContent, 'utf-8');
  return true;
});
