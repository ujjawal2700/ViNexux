import { OtpProvider } from './OtpProvider.js';
import { config } from '../../config/env.js';

/**
 * Development OTP Provider implementation.
 * Logs the generated OTP to stdout and returns devOtp in development mode
 * so testing can proceed before paid SMS providers are configured.
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
      // Return devOtp in demo mode or outside production
      devOtp: config.demoMode || config.nodeEnv !== 'production' ? otp : undefined,
    };
  }
}

export default DevOtpProvider;
