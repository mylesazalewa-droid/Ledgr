import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            'AIzaSyBaw9Plp4Z0nhlybFiMsL6IPUrjHpS3g-E',
  authDomain:        'stash-d4021.firebaseapp.com',
  projectId:         'stash-d4021',
  storageBucket:     'stash-d4021.firebasestorage.app',
  messagingSenderId: '571838876133',
  appId:             '1:571838876133:web:b063d808247806ee79070c',
  measurementId:     'G-D8N1F9G2TW',
};

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
export const isFirebaseConfigured = true;
