import { User } from '../../models/User.js';
import { getPushProvider } from '../../integrations/push/index.js';

/**
 * Centralized Push Notification Service facade.
 * Decouples business logic from the underlying push provider (Firebase, dev, etc.)
 * and handles per-user device token storage/pruning.
 */
export const pushService = {
  /**
   * Registers a device/browser FCM token against a user account.
   * De-duplicates automatically.
   */
  async registerToken(userId, token) {
    if (!token) return;
    await User.updateOne({ _id: userId }, { $addToSet: { fcmTokens: token } });
  },

  /**
   * Removes a device/browser FCM token from a user account (e.g. on logout).
   */
  async unregisterToken(userId, token) {
    if (!token) return;
    await User.updateOne({ _id: userId }, { $pull: { fcmTokens: token } });
  },

  /**
   * Sends a push notification to every registered device of a user.
   * Silently no-ops if the user has no tokens. Prunes tokens Firebase
   * reports as invalid/unregistered so they stop being retried.
   *
   * @param {string} userId
   * @param {Object} params
   * @param {string} params.title
   * @param {string} params.body
   * @param {Object} [params.data]
   */
  async sendToUser(userId, { title, body, data }) {
    const user = await User.findById(userId).select('fcmTokens');
    if (!user || !user.fcmTokens?.length) {
      return { success: true, sent: 0 };
    }

    const provider = getPushProvider();
    const result = await provider.sendToTokens({ tokens: user.fcmTokens, title, body, data });

    if (result.invalidTokens?.length) {
      await User.updateOne(
        { _id: userId },
        { $pull: { fcmTokens: { $in: result.invalidTokens } } }
      );
    }

    return { success: true, sent: user.fcmTokens.length - (result.invalidTokens?.length || 0) };
  },
};

export default pushService;
