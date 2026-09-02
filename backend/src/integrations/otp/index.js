import { DevOtpProvider } from './DevOtpProvider.js';

let activeOtpProvider = new DevOtpProvider();

/**
 * Returns the currently active OTP provider.
 * Abstracted so that real SMS providers (e.g. MSG91, Twilio) can be plugged in later
 * without modifying service layer business logic.
 */
export const getOtpProvider = () => {
  return activeOtpProvider;
};

/**
 * Utility to override active OTP provider (useful for testing or switching providers).
 * @param {import('./OtpProvider.js').OtpProvider} provider
 */
export const setOtpProvider = (provider) => {
  activeOtpProvider = provider;
};

export default {
  getOtpProvider,
  setOtpProvider,
};
