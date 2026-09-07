import { DevWhatsAppProvider } from './DevWhatsAppProvider.js';
import { WhatsAppCloudApiProvider } from './WhatsAppCloudApiProvider.js';
import { config } from '../../config/env.js';

/**
 * Factory function to instantiate a WhatsApp provider based on provider key.
 * 
 * @param {string} [providerName] - Provider key ('development', 'dev', 'cloud_api', 'meta', 'production')
 * @returns {import('./WhatsAppProvider.js').WhatsAppProvider}
 */
export const createWhatsAppProvider = (providerName = config.whatsappProvider) => {
  const normalized = (providerName || '').toLowerCase().trim();

  switch (normalized) {
    case 'cloud_api':
    case 'meta':
    case 'whatsapp_cloud_api':
    case 'production':
      return new WhatsAppCloudApiProvider();
    case 'development':
    case 'dev':
    default:
      return new DevWhatsAppProvider();
  }
};

let activeWhatsAppProvider = createWhatsAppProvider(config.whatsappProvider);

/**
 * Returns the currently active WhatsApp provider.
 * @returns {import('./WhatsAppProvider.js').WhatsAppProvider}
 */
export const getWhatsAppProvider = () => {
  return activeWhatsAppProvider;
};

/**
 * Override active WhatsApp provider (useful for unit testing or switching providers).
 * @param {import('./WhatsAppProvider.js').WhatsAppProvider} provider
 */
export const setWhatsAppProvider = (provider) => {
  activeWhatsAppProvider = provider;
};

export default {
  createWhatsAppProvider,
  getWhatsAppProvider,
  setWhatsAppProvider,
};
