/**
 * Storage abstraction — routes to the right backend:
 *
 *   Electron desktop    →  window.ledgr  (IPC → SQLite)
 *   Web + Firebase      →  firestoreStorage  (Firestore + Storage)
 *   Web (no Firebase)   →  localStorageStorage  (localStorage + IndexedDB)
 *
 * All components import from here. Never call window.ledgr or Firebase directly.
 */

import { isFirebaseConfigured } from '../firebase.js';
import { createFirestoreAdapter }     from './firestoreStorage.js';
import { createLocalStorageAdapter }  from './localStorageStorage.js';

export const isElectron = typeof window !== 'undefined' && typeof window.ledgr !== 'undefined';

let _storage = null;

function getStorage() {
  if (_storage) return _storage;
  if (isElectron) {
    _storage = window.ledgr;
  } else if (isFirebaseConfigured) {
    _storage = createFirestoreAdapter();
  } else {
    _storage = createLocalStorageAdapter();
  }
  return _storage;
}

export const storage = new Proxy({}, {
  get(_, prop) {
    return (...args) => getStorage()[prop]?.(...args);
  },
});
