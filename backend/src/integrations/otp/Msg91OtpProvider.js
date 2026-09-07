import { OtpProvider } from './OtpProvider.js';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';
import { formatWithCountryCode } from '../../utils/phone.util.js';

/**
 * MSG91 SMS OTP Provider implementation for Indian transactional SMS delivery.
 * Uses native fetch API to call MSG91 OTP endpoints safely without leaking credentials.
 */
export class Msg91OtpProvider extends OtpProvider {
  async sendOtp({ identifier, otp, purpose }) {
    if (!config.smsApiKey) {
      throw new AppError(
        'SMS provider configuration error: API key is missing.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    const mobile = formatWithCountryCode(identifier);
    const baseUrl = config.smsBaseUrl || 'https://api.msg91.com/api/v5';
    const endpoint = `${baseUrl.replace(/\/$/, '')}/otp`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': config.smsApiKey,
        },
        body: JSON.stringify({
          mobile,
          otp,
          template_id: config.smsTemplateId || undefined,
          sender: config.smsSenderId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`MSG91 API error with HTTP status ${response.status}`);
      }

      const data = await response.json();

      if (data.type === 'error' || data.type === 'failure') {
        throw new Error(data.message || 'MSG91 returned failure response');
      }

      return {
        success: true,
        provider: 'msg91',
        messageId: data.messageId || data.request_id || `msg91-${Date.now()}`,
      };
    } catch (err) {
      // Return clean, safe application error without leaking credentials or raw request details
      throw new AppError(
        'Failed to deliver OTP SMS. Please try again later.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }
}

export default Msg91OtpProvider;
