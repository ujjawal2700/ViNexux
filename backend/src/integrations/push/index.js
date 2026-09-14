import { DevPushProvider } from './DevPushProvider.js';
import { FirebasePushProvider } from './FirebasePushProvider.js';
import { config } from '../../config/env.js';

/**
 * Factory function to instantiate a push provider based on provider key.
 *
 * @param {string} providerName - Provider key ('development', 'firebase')
 * @returns {import('./PushProvider.js').PushProvider}
 */
export const createPushProvider = (providerName = config.pushProvider) => {
  const normalized = (providerName || '').toLowerCase().trim();

  switch (normalized) {
    case 'firebase':
      return new FirebasePushProvider();
    case 'development':
    case 'dev':
    default:
      return new DevPushProvider();
  }
};

let activePushProvider = createPushProvider(config.pushProvider);

export const getPushProvider = () => activePushProvider;

export const setPushProvider = (provider) => {
  activePushProvider = provider;
};

export default {
  createPushProvider,
  getPushProvider,
  setPushProvider,
};
