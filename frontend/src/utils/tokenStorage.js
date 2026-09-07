import { STORAGE_KEYS } from '../constants';

export const getRefreshToken = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch {
    return null;
  }
};

export const setRefreshToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    }
  } catch (err) {
    console.error('Error saving refresh token to storage:', err);
  }
};

export const clearRefreshToken = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (err) {
    console.error('Error clearing refresh token from storage:', err);
  }
};

// Aliases for compatibility
export const getStoredRefreshToken = getRefreshToken;
export const setStoredRefreshToken = setRefreshToken;
export const clearStoredRefreshToken = clearRefreshToken;
