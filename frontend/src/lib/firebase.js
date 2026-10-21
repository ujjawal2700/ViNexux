import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app = null;
if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

/**
 * Requests notification permission, registers the service worker, and
 * returns an FCM device token - or null if unsupported/unconfigured/denied.
 * Explicit registration reports errors; automatic registration remains optional.
 */
export const getPushToken = async (requestPermission = false) => {
  if (!isFirebaseConfigured || !app) return null;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    if (!('Notification' in window)) return null;
    // Call directly from the Enable button, before asynchronous SDK checks
    // can consume the browser's transient user activation.
    const permission = requestPermission && Notification.permission === 'default'
      ? await Notification.requestPermission() : Notification.permission;
    if (permission !== 'granted') return null;
    if (!await isSupported()) return null;

    const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?config=${encodeURIComponent(JSON.stringify(firebaseConfig))}`);
    await navigator.serviceWorker.ready;
    const messaging = getMessaging(app);

    const options = {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    };
    // Reuse valid subscriptions. Revoking on every enable can invalidate a
    // token that the server still has if the replacement request fails.
    const token = await getToken(messaging, options);

    return token || null;
  } catch (err) {
    console.warn('[Push] Failed to acquire FCM token:', err.message);
    if (requestPermission) {
      if (/API key not valid|API_KEY_INVALID/i.test(err.message || '')) throw new Error('Firebase rejected the browser API key. Update the Firebase web app configuration.');
      if (/SENDER_ID_MISMATCH|mismatched-credential/i.test(err.message || '')) throw new Error('The Firebase browser and server settings must use the same project.');
      throw new Error('This browser could not register with Firebase. Check your connection and Firebase configuration, then try again.');
    }
    return null;
  }
};

/**
 * Subscribes to foreground push messages (tab is open/focused).
 * Background messages while the tab is closed/hidden are handled by the
 * service worker itself. Returns an unsubscribe function, or a no-op.
 */
export const onForegroundPush = (callback) => {
  if (!isFirebaseConfigured || !app) return () => {};
  try {
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      callback({
        title: payload.notification?.title || payload.data?.title,
        body: payload.notification?.body || payload.data?.body,
        data: payload.data,
      });
    });
  } catch (err) {
    console.warn('[Push] Failed to attach foreground message listener:', err.message);
    return () => {};
  }
};

export { isFirebaseConfigured };
