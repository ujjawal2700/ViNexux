import { WhatsAppProvider } from './WhatsAppProvider.js';
import { config } from '../../config/env.js';

/**
 * Production Meta WhatsApp Cloud API Provider.
 * Sends template messages via Graph API: https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages
 */
export class WhatsAppCloudApiProvider extends WhatsAppProvider {
  constructor(options = {}) {
    super();
    this.apiUrl = options.apiUrl || config.whatsappApiUrl || 'https://graph.facebook.com/v18.0';
    this.accessToken = options.accessToken || config.whatsappAccessToken;
    this.phoneNumberId = options.phoneNumberId || config.whatsappPhoneNumberId;
  }

  /**
   * Send WhatsApp template message using Meta Cloud API.
   * 
   * @param {Object} params
   * @param {string} params.phone - E.164 normalized recipient phone number (without +)
   * @param {string} params.event - Notification event
   * @param {string} [params.template] - Meta template name
   * @param {Object} [params.variables] - Template parameters
   * @returns {Promise<{ success: boolean, provider: string, messageId?: string, error?: string }>}
   */
  async sendMessage({ phone, event, template, variables = {} }) {
    if (!this.accessToken || !this.phoneNumberId) {
      return {
        success: false,
        provider: 'whatsapp_cloud_api',
        error: 'WhatsApp Cloud API credentials missing (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID)',
      };
    }

    const templateName = template || this._getTemplateForEvent(event);
    const endpoint = `${this.apiUrl}/${this.phoneNumberId}/messages`;

    // Build Meta Cloud API template payload
    const body = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: Object.values(variables).map((val) => ({
              type: 'text',
              text: String(val),
            })),
          },
        ],
      },
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        return {
          success: false,
          provider: 'whatsapp_cloud_api',
          error: errorMsg,
        };
      }

      const messageId = data?.messages?.[0]?.id || `wamid-${Date.now()}`;
      return {
        success: true,
        provider: 'whatsapp_cloud_api',
        messageId,
      };
    } catch (err) {
      return {
        success: false,
        provider: 'whatsapp_cloud_api',
        error: err.message || 'Network request failed for WhatsApp Cloud API',
      };
    }
  }

  /**
   * Helper to map business events to default template names
   * @private
   */
  _getTemplateForEvent(event) {
    switch (event) {
      case 'ENQUIRY_CREATED':
        return 'vinexus_enquiry_created';
      case 'ENQUIRY_STATUS_UPDATED':
        return 'vinexus_enquiry_status_update';
      case 'KYC_APPROVED':
        return 'vinexus_kyc_approved';
      case 'KYC_REJECTED':
        return 'vinexus_kyc_rejected';
      default:
        return 'vinexus_general_notification';
    }
  }
}

export default WhatsAppCloudApiProvider;
