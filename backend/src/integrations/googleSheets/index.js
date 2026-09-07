import { DevGoogleSheetsProvider } from './DevGoogleSheetsProvider.js';
import { GoogleSheetsApiProvider } from './GoogleSheetsApiProvider.js';
import { config } from '../../config/env.js';

/**
 * Factory function to instantiate a Google Sheets provider based on provider key.
 * 
 * @param {string} providerName - Provider key ('development', 'google_api')
 * @returns {import('./GoogleSheetsProvider.js').GoogleSheetsProvider}
 */
export const createGoogleSheetsProvider = (providerName = config.googleSheetsProvider) => {
  const normalized = (providerName || '').toLowerCase().trim();

  switch (normalized) {
    case 'google_api':
    case 'google':
      return new GoogleSheetsApiProvider();
    case 'development':
    case 'dev':
    default:
      return new DevGoogleSheetsProvider();
  }
};

let activeGoogleSheetsProvider = createGoogleSheetsProvider(config.googleSheetsProvider);

/**
 * Returns the currently active Google Sheets provider.
 */
export const getGoogleSheetsProvider = () => {
  return activeGoogleSheetsProvider;
};

/**
 * Override active Google Sheets provider (useful for testing or switching providers).
 * @param {import('./GoogleSheetsProvider.js').GoogleSheetsProvider} provider
 */
export const setGoogleSheetsProvider = (provider) => {
  activeGoogleSheetsProvider = provider;
};

export default {
  createGoogleSheetsProvider,
  getGoogleSheetsProvider,
  setGoogleSheetsProvider,
};
