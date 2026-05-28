import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../firebase.js';

/**
 * Real-time listener for buyer messages sent via the public storefront.
 * Firestore path: messages/{sellerId}/inbox/{messageId}
 *
 * Required Firestore security rules (deploy via Firebase console):
 *   match /messages/{userId}/inbox/{msgId} {
 *     allow write: if true;                          // public — any buyer can send
 *     allow read, update: if request.auth.uid == userId;  // only the seller can read
 *   }
 */
export function useMessages() {
  const [messages, setMessages] = useState([]);
  const isElectron = !!window.ledgr;

  useEffect(() => {
    if (!isFirebaseConfigured || isElectron) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, 'messages', uid, 'inbox'),
      orderBy('timestamp', 'desc')
    );

    // Swallow permission errors — rules may not be deployed yet
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
  }, [isElectron]);

  const markRead = useCallback(async (messageId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await updateDoc(doc(db, 'messages', uid, 'inbox', messageId), { read: true });
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read: true } : m));
  }, []);

  const markAllRead = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unread = messages.filter(m => !m.read);
    await Promise.all(
      unread.map(m => updateDoc(doc(db, 'messages', uid, 'inbox', m.id), { read: true }))
    );
    setMessages(prev => prev.map(m => ({ ...m, read: true })));
  }, [messages]);

  return {
    messages,
    unreadCount: messages.filter(m => !m.read).length,
    markRead,
    markAllRead,
  };
}
