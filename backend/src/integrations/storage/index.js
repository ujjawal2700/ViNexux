import { DevStorageProvider } from './DevStorageProvider.js';
import { CloudinaryStorageProvider } from './CloudinaryStorageProvider.js';
import { config } from '../../config/env.js';

/**
 * Factory function to instantiate a storage provider based on provider key.
 * 
 * @param {string} providerName - Provider key ('development', 'cloudinary')
 * @returns {import('./StorageProvider.js').StorageProvider}
 */
export const createStorageProvider = (providerName = config.storageProvider) => {
  const normalized = (providerName || '').toLowerCase().trim();

  switch (normalized) {
    case 'cloudinary':
    case 'cloud':
      return new CloudinaryStorageProvider();
    case 'development':
    case 'dev':
    default:
      return new DevStorageProvider();
  }
};

let activeStorageProvider = createStorageProvider(config.storageProvider);

/**
 * Returns the currently active Storage provider.
 */
export const getStorageProvider = () => {
  return activeStorageProvider;
};

/**
 * Override active Storage provider (useful for testing or switching providers).
 * @param {import('./StorageProvider.js').StorageProvider} provider
 */
export const setStorageProvider = (provider) => {
  activeStorageProvider = provider;
};

export default {
  createStorageProvider,
  getStorageProvider,
  setStorageProvider,
};
