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

export const getStoredUser = (portal) => {
  try {
    const key = portal === 'admin' ? STORAGE_KEYS.ADMIN_USER : STORAGE_KEYS.USER;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user, portal) => {
  try {
    const key = portal === 'admin' ? STORAGE_KEYS.ADMIN_USER : STORAGE_KEYS.USER;
    if (user) {
      localStorage.setItem(key, JSON.stringify(user));
    } else {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.error('Error saving user profile to storage:', err);
  }
};

export const clearStoredUser = (portal) => {
  try {
    if (portal === 'admin') {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_USER);
    } else if (portal === 'customer') {
      localStorage.removeItem(STORAGE_KEYS.USER);
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.ADMIN_USER);
    }
  } catch (err) {
    console.error('Error clearing user profile from storage:', err);
  }
};

// Aliases for compatibility
export const getStoredRefreshToken = getRefreshToken;
export const setStoredRefreshToken = setRefreshToken;
export const clearStoredRefreshToken = clearRefreshToken;
