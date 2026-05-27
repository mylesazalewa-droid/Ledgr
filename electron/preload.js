const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stash', {
  // Items
  getItems:   (filters)         => ipcRenderer.invoke('getItems', filters),
  getItem:    (id)              => ipcRenderer.invoke('getItem', id),
  addItem:    (item)            => ipcRenderer.invoke('addItem', item),
  updateItem: (id, changes)     => ipcRenderer.invoke('updateItem', id, changes),
  deleteItem: (id)              => ipcRenderer.invoke('deleteItem', id),
  markSold:   (id, saleData)    => ipcRenderer.invoke('markSold', id, saleData),

  // Categories
  getCategories:    ()              => ipcRenderer.invoke('getCategories'),
  addCategory:      (cat)           => ipcRenderer.invoke('addCategory', cat),
  updateCategory:   (id, changes)   => ipcRenderer.invoke('updateCategory', id, changes),
  deleteCategory:   (id)            => ipcRenderer.invoke('deleteCategory', id),

  // Photos
  openPhotoDialog:      ()     => ipcRenderer.invoke('openPhotoDialog'),
  copyPhotoToAppData:   (p)    => ipcRenderer.invoke('copyPhotoToAppData', p),
  getPhotoDataUrl:      (p)    => ipcRenderer.invoke('getPhotoDataUrl', p),

  // Stats
  getStats:   () => ipcRenderer.invoke('getStats'),
  getSoldLog: () => ipcRenderer.invoke('getSoldLog'),

  // Settings
  getSetting: (key)         => ipcRenderer.invoke('getSetting', key),
  setSetting: (key, value)  => ipcRenderer.invoke('setSetting', key, value),

  // Utils
  openExternal: (url)       => ipcRenderer.invoke('openExternal', url),
  exportCsv:    (content)   => ipcRenderer.invoke('exportCsv', content),
});
