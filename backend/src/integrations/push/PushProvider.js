/**
 * Abstract Push Notification Provider interface contract for Vinexus backend.
 * Concrete implementations (DevPushProvider, FirebasePushProvider, etc.)
 * must implement the `sendToTokens` method.
 */
export class PushProvider {
  /**
   * Send a push notification to one or more device tokens.
   * @param {Object} params
   * @param {string[]} params.tokens - FCM/device registration tokens
   * @param {string} params.title - Notification title
   * @param {string} params.body - Notification body text
   * @param {Object} [params.data] - Arbitrary key/value payload (all string values)
   * @returns {Promise<{ success: boolean, invalidTokens: string[] }>}
   */
  async sendToTokens({ tokens, title, body, data }) {
    throw new Error('Method sendToTokens() must be implemented by concrete Push provider.');
  }
}

export default PushProvider;
