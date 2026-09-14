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
    default:
      return new DevOtpProvider();
  }
};

let activeOtpProvider = createOtpProvider(config.smsProvider);

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
