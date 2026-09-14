import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app = null;
if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

/**
 * Requests notification permission, registers the service worker, and
 * returns an FCM device token - or null if unsupported/unconfigured/denied.
 * Never throws; push notifications are an enhancement, not a hard dependency.
 */
export const getPushToken = async () => {
  if (!isFirebaseConfigured || !app) return null;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const supported = await isSupported();
    if (!supported) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token || null;
  } catch (err) {
    console.warn('[Push] Failed to acquire FCM token:', err.message);
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
