import { OtpProvider } from './OtpProvider.js';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';
import { formatWithCountryCode } from '../../utils/phone.util.js';

/**
 * SMSIndiaHub OTP Provider implementation for Indian transactional SMS.
 *
 * NOTE: SMSIndiaHub's HTTP API surface (vendorsms/pushsms.aspx, query-param
 * based) is the commonly documented one for this gateway, but confirm the
 * exact endpoint/param names against your SMSIndiaHub account dashboard -
 * gateway resellers occasionally differ. Adjust `baseUrl`/params below to
 * match what your account's API docs show if delivery fails.
 */
export class SmsIndiaHubOtpProvider extends OtpProvider {
  async sendOtp({ identifier, otp, purpose }) {
    if (!config.smsApiKey) {
      throw new AppError(
        'SMS provider configuration error: API key is missing.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    const mobile = formatWithCountryCode(identifier);
    const baseUrl = config.smsBaseUrl || 'https://cloud.smsindiahub.in/vendorsms/pushsms.aspx';
    const message = `Your Vinexus verification code is ${otp}. Valid for ${config.otpExpiryMinutes} minutes. Do not share this code.`;

    const params = new URLSearchParams({
      APIKey: config.smsApiKey,
      msisdn: mobile,
      sid: config.smsSenderId || 'VNXSMS',
      msg: message,
      fl: '0',
      gwid: '2',
    });

    try {
      const response = await fetch(`${baseUrl}?${params.toString()}`, { method: 'GET' });

      if (!response.ok) {
        throw new Error(`SMSIndiaHub API error with HTTP status ${response.status}`);
      }

      const data = await response.text();

      // SMSIndiaHub typically returns a numeric message ID on success and an
      // "ERR" or negative-prefixed code on failure.
      if (/^err/i.test(data.trim())) {
        throw new Error(`SMSIndiaHub dispatch failed: ${data.trim()}`);
      }

      return {
        success: true,
        provider: 'smsindiahub',
        messageId: data.trim() || `smsindiahub-${Date.now()}`,
      };
    } catch (err) {
      throw new AppError(
        'Failed to deliver OTP SMS via SMSIndiaHub. Please try again later.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }
}

export default SmsIndiaHubOtpProvider;
