import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase.js';

const VAPID_KEY = 'dMLijoMdjYLd3wPCMU0L6E6-d8A8vzd44SsdhXf_pbU';

/**
 * Ask the user for notification permission and, if granted, register the FCM
 * token in Firestore so Cloud Functions can target this device.
 */
export async function requestPushPermission() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const messaging    = getMessaging();
    const token        = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    const user = auth.currentUser;
    if (token && user) {
      await setDoc(
        doc(db, `users/${user.uid}/fcmTokens/${token}`),
        { createdAt: serverTimestamp(), platform: 'web' },
        { merge: true }
      );
    }

    return token;
  } catch (err) {
    // Non-fatal: missing icon, permissions changed mid-session, etc.
    console.warn('[notifications] Push setup skipped:', err.message);
  }
}

/**
 * Subscribe to foreground FCM messages (app open and focused).
 * Returns an unsubscribe function.
 */
export function listenForeground(callback) {
  try {
    const messaging = getMessaging();
    return onMessage(messaging, callback);
  } catch {
    return () => {};
  }
}
