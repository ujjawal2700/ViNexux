import { getOtpProvider } from '../../integrations/otp/index.js';
import { normalizePhoneNumber } from '../../utils/phone.util.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';

/**
 * Higher-level SMS Service facade.
 * Decouples rest of the application from specific OTP provider mechanisms.
 */
export const smsService = {
  /**
   * Dispatches an OTP via SMS to the specified phone number.
   * 
   * @param {Object} params
   * @param {string} params.phone - Target phone number
   * @param {string} params.otp - Plaintext numeric OTP
   * @param {string} params.purpose - Purpose of OTP ('signup', 'login', 'phone-change')
   * @returns {Promise<{ success: boolean, messageId?: string, devOtp?: string }>}
   */
  async sendOtpSms({ phone, otp, purpose = 'login' }) {
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
      throw new AppError(
        'Invalid phone number provided for SMS dispatch.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const provider = getOtpProvider();
    return await provider.sendOtp({
      identifier: normalizedPhone,
      otp,
      purpose,
    });
  },
};

export default smsService;
