import { DevEmailProvider } from './DevEmailProvider.js';
import { SmtpEmailProvider } from './SmtpEmailProvider.js';
import { ResendEmailProvider } from './ResendEmailProvider.js';
import { config } from '../../config/env.js';

/**
 * Factory function to instantiate an email provider based on provider key.
 *
 * @param {string} providerName - Provider key ('development', 'smtp', 'resend')
 * @returns {import('./EmailProvider.js').EmailProvider}
 */
export const createEmailProvider = (providerName = config.emailProvider) => {
  const normalized = (providerName || '').toLowerCase().trim();

  switch (normalized) {
    case 'smtp':
      return new SmtpEmailProvider();
    case 'resend':
      return new ResendEmailProvider();
    case 'development':
    case 'dev':
    default:
      return new DevEmailProvider();
  }
};

let activeEmailProvider = createEmailProvider(config.emailProvider);

/**
 * Returns the currently active email provider.
 */
export const getEmailProvider = () => {
  return activeEmailProvider;
};

/**
 * Override active email provider (useful for testing or switching providers).
 * @param {import('./EmailProvider.js').EmailProvider} provider
 */
export const setEmailProvider = (provider) => {
  activeEmailProvider = provider;
};

export default {
  createEmailProvider,
  getEmailProvider,
  setEmailProvider,
};
