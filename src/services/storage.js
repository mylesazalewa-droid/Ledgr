/**
 * Storage abstraction — routes to Electron IPC in the desktop app,
 * or to Firebase Firestore in the web/Vercel version.
 *
 * All consumers import from here rather than calling window.stash directly.
 */

import { createFirestoreAdapter } from './firestoreStorage.js';

// window.stash is injected by the Electron preload script
const isElectron = typeof window !== 'undefined' && typeof window.stash !== 'undefined';

let _storage = null;

function getStorage() {
  if (_storage) return _storage;
  _storage = isElectron ? window.stash : createFirestoreAdapter();
  return _storage;
}

// Export a proxy that lazily delegates to the right backend
export const storage = new Proxy({}, {
  get(_, prop) {
    return (...args) => getStorage()[prop]?.(...args);
  },
});

export { isElectron };
