import { OtpProvider } from './OtpProvider.js';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';
import { normalizePhoneNumber } from '../../utils/phone.util.js';

/**
 * Fast2SMS OTP Provider implementation for Indian transactional SMS.
 */
export class Fast2SmsOtpProvider extends OtpProvider {
  async sendOtp({ identifier, otp, purpose }) {
    if (!config.smsApiKey) {
      throw new AppError(
        'SMS provider configuration error: API key is missing.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    const numbers = normalizePhoneNumber(identifier);
    const baseUrl = config.smsBaseUrl || 'https://www.fast2sms.com/dev/bulkV2';

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'authorization': config.smsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables_values: otp,
          route: 'otp',
          numbers,
        }),
      });

      if (!response.ok) {
        throw new Error(`Fast2SMS API error with HTTP status ${response.status}`);
      }

      const data = await response.json();

      if (!data.return) {
        throw new Error(data.message?.[0] || 'Fast2SMS dispatch failed');
      }

      return {
        success: true,
        provider: 'fast2sms',
        messageId: data.request_id || `fast2sms-${Date.now()}`,
      };
    } catch (err) {
      throw new AppError(
        'Failed to deliver OTP SMS via Fast2SMS. Please try again later.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }
}

export default Fast2SmsOtpProvider;
