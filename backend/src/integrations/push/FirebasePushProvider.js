import { PushProvider } from './PushProvider.js';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';

let firebaseApp = null;

// Never expose raw Firebase messages: they can contain credentials or tokens.
export const pushFailureReason = code => ({
  'messaging/mismatched-credential': 'The browser token belongs to a different Firebase project. Use matching frontend and server Firebase settings, rebuild the frontend, and enable notifications again.',
  'messaging/authentication-error': 'Firebase could not authenticate the server. Check its service account and Firebase Cloud Messaging API access.',
  'app/invalid-credential': 'Firebase rejected the server service account credentials.',
  'messaging/third-party-auth-error': 'The browser push service rejected authentication. Check the Firebase Web Push certificate (VAPID key) used by the frontend.',
  'messaging/registration-token-not-registered': 'This browser subscription has expired or was revoked. The customer must enable notifications again.',
  'messaging/invalid-registration-token': 'The saved browser token is invalid. The customer must enable notifications again.',
  'messaging/invalid-argument': 'Firebase rejected the push message or browser token. Check the notification content and re-register the browser.',
  'messaging/server-unavailable': 'Firebase is temporarily unavailable. Try sending again later.',
  'messaging/quota-exceeded': 'Firebase push quota was exceeded. Try sending again later.',
  'messaging/message-rate-exceeded': 'Firebase push rate limit was exceeded. Try sending again later.',
})[code] || 'Firebase could not accept the push notification. Check the server Firebase configuration and Cloud Messaging API access.';

const getFirebaseApp = async () => {
  if (firebaseApp) return firebaseApp;

  if (!config.firebaseProjectId || !config.firebaseClientEmail || !config.firebasePrivateKey) {
    throw new AppError(
      'Push provider configuration error: Missing Firebase service account credentials.',
      HTTP_STATUS.BAD_GATEWAY,
      'PUSH_DELIVERY_ERROR'
    );
  }

  const formattedPrivateKey = config.firebasePrivateKey.replace(/\\n/g, '\n');
  const { cert, getApps, initializeApp } = await import('firebase-admin/app');
  firebaseApp = getApps().find(app => app.name === 'vinexus-push') || initializeApp({
    credential: cert({ projectId: config.firebaseProjectId, clientEmail: config.firebaseClientEmail, privateKey: formattedPrivateKey }),
  }, 'vinexus-push');

  return firebaseApp;
};

export const firebaseMessage = ({ tokens, title, body, data = {}, campaign = false, ttl = 86400 }) => ({
  tokens,
  ...(campaign ? {} : { notification: { title, body } }),
  data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)])),
  webpush: campaign ? { headers: { TTL: String(ttl) } } : {
    notification: { title, body, icon: '/logo.png' },
    ...(data.link?.startsWith('https://') ? { fcmOptions: { link: data.link } } : {}),
  },
});

/**
 * Firebase Cloud Messaging (FCM) Push Provider implementation.
 * Sends notifications to browser/device registration tokens via firebase-admin.
 */
export class FirebasePushProvider extends PushProvider {
  async sendToTokens({ tokens = [], title, body, data = {}, campaign = false, ttl = 86400 }) {
    if (!tokens.length) {
      return { success: true, provider: 'firebase', invalidTokens: [] };
    }

    try {
      const app = await getFirebaseApp();
      const { getMessaging } = await import('firebase-admin/messaging');
      const response = await getMessaging(app).sendEachForMulticast(
        firebaseMessage({ tokens, title, body, data, campaign, ttl })
      );

      // Collect tokens Firebase reports as invalid/unregistered so callers can prune them
      const invalidTokens = [];
      const failureReasons = new Set();
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const code = res.error?.code;
          failureReasons.add(pushFailureReason(code));
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      return {
        success: response.successCount > 0,
        provider: 'firebase',
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
        failureReasons: [...failureReasons],
      };
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }

      throw new AppError(
        `Failed to deliver push notification via Firebase. ${pushFailureReason(err.code)}`,
        HTTP_STATUS.BAD_GATEWAY,
        'PUSH_DELIVERY_ERROR'
      );
    }
  }
}

export default FirebasePushProvider;
