// Firebase Cloud Messaging background service worker.
//
// IMPORTANT: this file is served as a static asset at /firebase-messaging-sw.js
// and therefore CANNOT read Vite env vars (import.meta.env) - it runs outside
// the app bundle. Firebase's client config values below are not secret (they're
// public identifiers, not credentials - the real security boundary is Firebase
// Security Rules), so fill them in directly here, matching the same
// VITE_FIREBASE_* values you set in your .env file.
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'REPLACE_WITH_VITE_FIREBASE_API_KEY',
  authDomain: 'REPLACE_WITH_VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'REPLACE_WITH_VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'REPLACE_WITH_VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'REPLACE_WITH_VITE_FIREBASE_APP_ID',
});

const messaging = firebase.messaging();

// Handles notifications that arrive while the site is closed/backgrounded.
// Foreground messages (tab open & focused) are handled in src/lib/firebase.js instead.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'Vinexus';
  const body = payload.notification?.body || payload.data?.body || '';
  const link = payload.data?.link || '/';

  self.registration.showNotification(title, {
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: { link },
  });
});

// Focus/open the relevant page when the user clicks the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(link) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(link);
      }
    })
  );
});
