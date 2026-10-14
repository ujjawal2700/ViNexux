import { PushProvider } from './PushProvider.js';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';

let firebaseApp = null;


const getFirebaseApp = async () => {
  if (firebaseApp) return firebaseApp;

  if (!config.firebaseProjectId || !config.firebaseClientEmail || !config.firebasePrivateKey) {
    throw new AppError(
      'Push provider configuration error: Missing Firebase service account credentials.',
      HTTP_STATUS.BAD_GATEWAY,
      ERROR_CODES.INTERNAL_ERROR
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
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const code = res.error?.code;
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      return {
        success: true,
        provider: 'firebase',
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }

      throw new AppError(
        'Failed to deliver push notification via Firebase.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }
}

export default FirebasePushProvider;
