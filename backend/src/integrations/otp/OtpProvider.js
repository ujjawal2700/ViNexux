/**
 * Abstract OTP Provider interface contract for Vinexus backend.
 * Concrete implementations (DevOtpProvider, Msg91OtpProvider, SendGridOtpProvider, etc.)
 * must implement the `sendOtp` method.
 */
export class OtpProvider {
  /**
   * Send an OTP to the given target identifier (email or phone).
   * @param {Object} params
   * @param {string} params.identifier - Email address or phone number
   * @param {string} params.otp - Plaintext OTP to send
   * @param {string} params.purpose - Purpose of OTP ('signup', 'login', 'reset')
   * @returns {Promise<{ success: boolean, messageId?: string, devOtp?: string }>}
   */
  async sendOtp({ identifier, otp, purpose }) {
    throw new Error('Method sendOtp() must be implemented by concrete OTP provider.');
  }
}

export default OtpProvider;
