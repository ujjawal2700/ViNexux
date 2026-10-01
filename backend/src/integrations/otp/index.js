import { DevOtpProvider } from './DevOtpProvider.js';
import { Msg91OtpProvider } from './Msg91OtpProvider.js';
import { Fast2SmsOtpProvider } from './Fast2SmsOtpProvider.js';
import { SmsIndiaHubOtpProvider } from './SmsIndiaHubOtpProvider.js';
import { config } from '../../config/env.js';

/**
 * Factory function to create an OTP provider instance based on provider name.
 *
 * @param {string} providerName - Provider key ('development', 'msg91', 'fast2sms', 'smsindiahub')
 * @returns {import('./OtpProvider.js').OtpProvider}
 */
export const createOtpProvider = (providerName = config.smsProvider) => {
  const normalized = (providerName || '').toLowerCase().trim();

  switch (normalized) {
    case 'msg91':
      return new Msg91OtpProvider();
    case 'fast2sms':
      return new Fast2SmsOtpProvider();
    case 'smsindiahub':
      return new SmsIndiaHubOtpProvider();
    case 'development':
    case 'dev':
      return new DevOtpProvider();
    default:
      return new SmsIndiaHubOtpProvider();
  }
};

// The mock flag is the single switch for OTP delivery. When it is off,
// mobile OTPs must use SMSIndiaHub regardless of a stale SMS_PROVIDER value.
let activeOtpProvider = createOtpProvider(config.mockOtpEnabled ? 'development' : 'smsindiahub');

/**
 * Returns the currently active OTP provider.
 */
export const getOtpProvider = () => {
  return activeOtpProvider;
};

/**
 * Utility to override active OTP provider (useful for testing or dynamic switching).
 * @param {import('./OtpProvider.js').OtpProvider} provider
 */
export const setOtpProvider = (provider) => {
  activeOtpProvider = provider;
};

export default {
  createOtpProvider,
  getOtpProvider,
  setOtpProvider,
};
