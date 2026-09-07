/**
 * Abstract interface for WhatsApp message providers.
 * Concrete providers (DevWhatsAppProvider, WhatsAppCloudApiProvider) must extend this class.
 */
export class WhatsAppProvider {
  /**
   * Send a WhatsApp message.
   * 
   * @param {Object} params
   * @param {string} params.phone - Recipient phone number
   * @param {string} params.event - Event type (e.g., 'ENQUIRY_CREATED', 'ENQUIRY_STATUS_UPDATED', 'KYC_APPROVED', 'KYC_REJECTED')
   * @param {string} [params.template] - Optional template name
   * @param {Object} [params.variables] - Template variables or message parameters
   * @returns {Promise<{ success: boolean, provider: string, messageId?: string, error?: string }>}
   */
  async sendMessage({ phone, event, template, variables }) {
    throw new Error('WhatsAppProvider.sendMessage must be implemented by concrete provider subclasses');
  }
}

export default WhatsAppProvider;
