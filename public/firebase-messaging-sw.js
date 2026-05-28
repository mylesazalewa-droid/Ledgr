// Firebase Messaging Service Worker
// Handles background push notifications when the app is closed / not focused.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyBaw9Plp4Z0nhlybFiMsL6IPUrjHpS3g-E',
  authDomain:        'stash-d4021.firebaseapp.com',
  projectId:         'stash-d4021',
  storageBucket:     'stash-d4021.firebasestorage.app',
  messagingSenderId: '571838876133',
  appId:             '1:571838876133:web:b063d808247806ee79070c',
});

const messaging = firebase.messaging();

// Show a notification when the app is in the background / closed
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'New message';
  const body  = payload.notification?.body  || '';

  self.registration.showNotification(title, {
    body,
    icon:    '/icon-192.png',
    badge:   '/icon-192.png',
    vibrate: [100, 50, 100],
    data:    { url: self.location.origin },
  });
});

// Tap notification → open / focus the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(cs => {
        const existing = cs.find(c => c.url.startsWith(self.location.origin));
        if (existing) return existing.focus();
        return clients.openWindow(self.location.origin);
      })
  );
});
