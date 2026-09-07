import { WhatsAppProvider } from './WhatsAppProvider.js';

/**
 * Development/Mock WhatsApp Provider.
 * Stores sent messages in memory for inspection during tests.
 * Never makes actual network calls.
 */
export class DevWhatsAppProvider extends WhatsAppProvider {
  constructor() {
    super();
    this.sentMessages = [];
  }

  /**
   * Send mock WhatsApp message.
   * 
   * @param {Object} params
   * @param {string} params.phone - Recipient phone number
   * @param {string} params.event - Event name
   * @param {string} [params.template] - Template identifier
   * @param {Object} [params.variables] - Message variables
   * @returns {Promise<{ success: boolean, provider: string, messageId: string }>}
   */
  async sendMessage({ phone, event, template, variables }) {
    const messageId = `dev-whatsapp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const record = {
      messageId,
      phone,
      event,
      template: template || 'default_template',
      variables: variables || {},
      sentAt: new Date(),
    };

    this.sentMessages.push(record);

    return {
      success: true,
      provider: 'development',
      messageId,
    };
  }

  /**
   * Get all sent mock messages.
   * @returns {Array<Object>}
   */
  getSentMessages() {
    return [...this.sentMessages];
  }

  /**
   * Clear sent messages buffer.
   */
  clearSentMessages() {
    this.sentMessages = [];
  }
}

export default DevWhatsAppProvider;
