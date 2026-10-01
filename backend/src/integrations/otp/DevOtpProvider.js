import { OtpProvider } from './OtpProvider.js';
import { config } from '../../config/env.js';

/**
 * Development OTP Provider implementation.
 * Development-only provider retained for provider-level tests.
 */
export class DevOtpProvider extends OtpProvider {
  async sendOtp({ identifier, otp, purpose }) {
    console.log(`[DevOtpProvider] ----------------------------------------`);
    console.log(`[DevOtpProvider] Target Identifier: ${identifier}`);
    console.log(`[DevOtpProvider] Purpose          : ${purpose}`);
    console.log(`[DevOtpProvider] Generated OTP    : ${otp}`);
    console.log(`[DevOtpProvider] ----------------------------------------`);

    return {
      success: true,
      provider: 'development',
      messageId: `dev-msg-${Date.now()}`,
      mockOtp: config.mockOtpEnabled ? otp : undefined,
    };
  }
}

export default DevOtpProvider;
