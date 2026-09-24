import { STORAGE_KEYS } from '../constants';

export const getRefreshToken = (portal) => {
  try {
    const key = portal === 'admin' ? STORAGE_KEYS.ADMIN_REFRESH_TOKEN : STORAGE_KEYS.REFRESH_TOKEN;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const setRefreshToken = (token, portal) => {
  try {
    const key = portal === 'admin' ? STORAGE_KEYS.ADMIN_REFRESH_TOKEN : STORAGE_KEYS.REFRESH_TOKEN;
    if (token) {
      localStorage.setItem(key, token);
    } else {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.error('Error saving refresh token to storage:', err);
  }
};

export const clearRefreshToken = (portal) => {
  try {
    if (portal === 'admin') {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_REFRESH_TOKEN);
    } else if (portal === 'customer') {
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } else {
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.ADMIN_REFRESH_TOKEN);
    }
  } catch (err) {
    console.error('Error clearing refresh token from storage:', err);
  }
};

// Aliases for compatibility
export const getStoredRefreshToken = getRefreshToken;
export const setStoredRefreshToken = setRefreshToken;
export const clearStoredRefreshToken = clearRefreshToken;
