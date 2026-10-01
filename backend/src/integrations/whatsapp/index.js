import { DevWhatsAppProvider } from './DevWhatsAppProvider.js';

/**
 * WhatsApp Business API is not configured for this application. Keep local
 * notification flows on the development provider without making network calls.
 * @returns {import('./WhatsAppProvider.js').WhatsAppProvider}
 */
export const createWhatsAppProvider = () => new DevWhatsAppProvider();

let activeWhatsAppProvider = createWhatsAppProvider();

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
