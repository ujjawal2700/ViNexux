import { ensurePushDeviceIndexes } from './deviceIndexes.js';
import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import { PushDevice } from '../../models/PushDevice.js';
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
    await ensurePushDeviceIndexes();
    for (let attempt = 0; ; attempt++) {
      try {
        return await mongoose.connection.transaction(async session => {
          await PushDevice.findOneAndUpdate({ _id: createHash('sha256').update(token).digest('hex') }, { $set: { userId } }, { upsert: true, session });
          await User.updateMany({ _id: { $ne: userId }, fcmTokens: token }, { $pull: { fcmTokens: token } }, { session });
          await User.updateOne({ _id: userId }, { $addToSet: { fcmTokens: token } }, { session });
        });
      } catch (error) { if (error.code !== 11000 || attempt >= 2) throw error; }
    }
  },

  /**
   * Removes a device/browser FCM token from a user account (e.g. on logout).
   */
  async unregisterToken(userId, token) {
    if (!token) return;
    await mongoose.connection.transaction(async session => {
      await PushDevice.deleteOne({ _id: createHash('sha256').update(token).digest('hex'), userId }, { session });
      await User.updateOne({ _id: userId }, { $pull: { fcmTokens: token } }, { session });
    });
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

    const sent = result.successCount ?? (result.provider === 'development' ? 0 : result.success ? user.fcmTokens.length - (result.invalidTokens?.length || 0) : 0);
    return { success: result.success, sent, failed: result.failureCount || 0, simulated: result.provider === 'development' };
  },
};

export default pushService;
