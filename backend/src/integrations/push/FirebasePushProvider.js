import { PushProvider } from './PushProvider.js';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';

let firebaseApp = null;
let firebaseAdmin = null;

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
  if (!firebaseAdmin) {
    ({ default: firebaseAdmin } = await import('firebase-admin'));
  }

  firebaseApp = firebaseAdmin.apps.length
    ? firebaseAdmin.app()
    : firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert({
          projectId: config.firebaseProjectId,
          clientEmail: config.firebaseClientEmail,
          privateKey: formattedPrivateKey,
        }),
      });

  return firebaseApp;
};

/**
 * Firebase Cloud Messaging (FCM) Push Provider implementation.
 * Sends notifications to browser/device registration tokens via firebase-admin.
 */
export class FirebasePushProvider extends PushProvider {
  async sendToTokens({ tokens = [], title, body, data = {} }) {
    if (!tokens.length) {
      return { success: true, provider: 'firebase', invalidTokens: [] };
    }

    try {
      await getFirebaseApp();

      // Stringify all data values - FCM requires a flat map of strings
      const stringData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value)])
      );

      const response = await firebaseAdmin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: stringData,
        webpush: {
          notification: { title, body, icon: '/logo.png' },
          fcmOptions: { link: data?.link || '/' },
        },
      });

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
