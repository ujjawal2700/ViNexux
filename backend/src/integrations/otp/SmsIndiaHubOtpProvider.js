import { OtpProvider } from './OtpProvider.js';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';
import { formatWithCountryCode } from '../../utils/phone.util.js';

/**
 * SMSIndiaHub OTP Provider implementation for Indian transactional SMS.
 *
 * Uses APIKey authentication; no separate API secret is required.
 * API reference: https://www.smsindiahub.in/api/india/
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
    const baseUrl = config.smsBaseUrl || 'https://cloud.smsindiahub.in/api/mt/SendSMS';
    // Match the approved template exactly; only ##var## is replaced by the OTP.
    const message = `Dear customer ${otp} is your mobile OTP verification code .do not share it with anyone.SCHTRD`;

    const params = new URLSearchParams({
      APIKey: config.smsApiKey,
      number: mobile,
      senderid: config.smsSenderId || 'VNXSMS',
      text: message,
      channel: 'Trans',
      DCS: '0',
      flashsms: '0',
    });
    if (config.smsTemplateId) params.set('TemplateId', config.smsTemplateId);

    try {
      const url = new URL(baseUrl);
      for (const [key, value] of params) url.searchParams.set(key, value);
      const response = await fetch(url.toString(), { method: 'GET' });

      if (!response.ok) {
        console.error('[SMSIndiaHub] Gateway HTTP failure:', response.status);
        throw new Error(`SMSIndiaHub API error with HTTP status ${response.status}`);
      }

      const data = await response.json();
      if (data?.ErrorCode !== '000') {
        // Log only the provider code, never raw responses, credentials or OTPs.
        const code = String(data?.ErrorCode ?? '');
        console.error('[SMSIndiaHub] Gateway rejected request. ErrorCode:', /^\d{1,8}$/.test(code) ? code : 'unknown');
        throw new Error('SMSIndiaHub rejected the SMS request.');
      }
      const messageId = data.MessageData?.[0]?.MessageId || data.JobId;
      if (!messageId) throw new Error('SMSIndiaHub did not return a message ID.');

      return {
        success: true,
        provider: 'smsindiahub',
        messageId,
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
