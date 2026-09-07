import { getWhatsAppProvider } from '../../integrations/whatsapp/index.js';
import { Enquiry } from '../../models/Enquiry.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';

export class WhatsAppService {
  /**
   * Normalize phone number to standard format (E.164 digits without + prefix).
   * Default country code is '91' (India) for 10-digit phone numbers.
   * 
   * @param {string} phone
   * @returns {string} Normalized phone number string
   */
  normalizePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
      return '';
    }

    // Strip all non-digit characters
    let digits = phone.replace(/\D/g, '');

    // Handle 10-digit Indian numbers
    if (digits.length === 10) {
      digits = `91${digits}`;
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = `91${digits.slice(1)}`;
    }

    return digits;
  }

  /**
   * Validate recipient phone number.
   * 
   * @param {string} phone
   * @returns {boolean}
   */
  validateRecipient(phone) {
    const normalized = this.normalizePhoneNumber(phone);
    // Valid phone numbers must contain 10-15 digits
    return Boolean(normalized && normalized.length >= 10 && normalized.length <= 15);
  }

  /**
   * Send WhatsApp notification with safe error isolation.
   * Never throws errors or exposes access tokens.
   * 
   * @param {Object} params
   * @param {string} params.phone - Recipient phone number
   * @param {string} params.event - Event type
   * @param {string} [params.template] - Meta template name
   * @param {Object} [params.variables] - Template variables
   * @returns {Promise<{ success: boolean, provider: string, messageId?: string, error?: string }>}
   */
  async sendNotification({ phone, event, template, variables = {} }) {
    try {
      if (!phone || !this.validateRecipient(phone)) {
        return {
          success: false,
          provider: 'none',
          error: `Invalid phone number format: '${phone}'`,
        };
      }

      const normalizedPhone = this.normalizePhoneNumber(phone);
      const provider = getWhatsAppProvider();

      const result = await provider.sendMessage({
        phone: normalizedPhone,
        event,
        template,
        variables,
      });

      if (!result.success) {
        console.error(`[WhatsApp] Notification failed for event '${event}': ${result.error || 'Unknown error'}`);
      }

      return result;
    } catch (err) {
      console.error(`[WhatsApp] Unexpected failure sending '${event}' notification:`, err.message);
      return {
        success: false,
        provider: 'unknown',
        error: err.message || 'WhatsApp notification process failed',
      };
    }
  }

  /**
   * Send WhatsApp notification when a new Enquiry is created.
   * 
   * @param {Object} enquiry
   * @returns {Promise<Object>}
   */
  async sendEnquiryCreatedNotification(enquiry) {
    if (!enquiry || !enquiry.contactPhone) {
      return { success: false, error: 'Enquiry contact phone missing' };
    }

    return await this.sendNotification({
      phone: enquiry.contactPhone,
      event: 'ENQUIRY_CREATED',
      template: 'vinexus_enquiry_created',
      variables: {
        customer_name: enquiry.contactName || 'Valued Customer',
        enquiry_number: enquiry.enquiryNumber || 'VNX-000000',
      },
    });
  }

  /**
   * Send WhatsApp notification when Enquiry status is updated.
   * 
   * @param {Object} enquiry
   * @param {string} oldStatus
   * @param {string} newStatus
   * @returns {Promise<Object>}
   */
  async sendEnquiryStatusUpdatedNotification(enquiry, oldStatus, newStatus) {
    if (!enquiry || !enquiry.contactPhone) {
      return { success: false, error: 'Enquiry contact phone missing' };
    }

    return await this.sendNotification({
      phone: enquiry.contactPhone,
      event: 'ENQUIRY_STATUS_UPDATED',
      template: 'vinexus_enquiry_status_update',
      variables: {
        customer_name: enquiry.contactName || 'Valued Customer',
        enquiry_number: enquiry.enquiryNumber || 'VNX-000000',
        new_status: newStatus,
      },
    });
  }

  /**
   * Send WhatsApp notification when Dealer KYC is approved.
   * 
   * @param {Object} dealerProfile
   * @returns {Promise<Object>}
   */
  async sendDealerKycApprovedNotification(dealerProfile) {
    const phone = dealerProfile?.userId?.phone || dealerProfile?.phone;
    if (!phone) {
      return { success: false, error: 'Dealer phone missing' };
    }

    return await this.sendNotification({
      phone,
      event: 'KYC_APPROVED',
      template: 'vinexus_kyc_approved',
      variables: {
        company_name: dealerProfile.companyName || 'Valued Dealer',
      },
    });
  }

  /**
   * Send WhatsApp notification when Dealer KYC is rejected.
   * 
   * @param {Object} dealerProfile
   * @param {string} reason
   * @returns {Promise<Object>}
   */
  async sendDealerKycRejectedNotification(dealerProfile, reason) {
    const phone = dealerProfile?.userId?.phone || dealerProfile?.phone;
    if (!phone) {
      return { success: false, error: 'Dealer phone missing' };
    }

    return await this.sendNotification({
      phone,
      event: 'KYC_REJECTED',
      template: 'vinexus_kyc_rejected',
      variables: {
        company_name: dealerProfile.companyName || 'Valued Dealer',
        reason: reason || 'Submitted documents did not pass validation.',
      },
    });
  }

  /**
   * Resend WhatsApp notification for an Enquiry (Admin only).
   * 
   * @param {string} enquiryId
   * @returns {Promise<Object>}
   */
  async resendEnquiryWhatsApp(enquiryId) {
    const enquiry = await Enquiry.findById(enquiryId);
    if (!enquiry) {
      throw new AppError('Enquiry not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    const result = await this.sendEnquiryCreatedNotification(enquiry);
    return {
      enquiryId: enquiry._id,
      enquiryNumber: enquiry.enquiryNumber,
      result,
      message: result.success
        ? 'WhatsApp notification sent successfully'
        : `WhatsApp notification failed: ${result.error || 'Unknown error'}`,
    };
  }
}

export const whatsAppService = new WhatsAppService();
export default whatsAppService;
