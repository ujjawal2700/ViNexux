import apiClient from '../api/axios';
const registeredTokens = new Map();
const storageKey = portal => portal === 'admin' ? 'vinexus_admin_fcm_token' : 'vinexus_fcm_token';
const storedToken = portal => {
  try { return localStorage.getItem(storageKey(portal)); }
  catch { return null; }
};
export const pushService = {
  async registerToken(token, portal = 'customer') {
    const response = await apiClient.post('/push/register-token', { token }, { portal });
    registeredTokens.set(portal, token);
    // Mirror only a successfully registered token. Storage restrictions must
    // not prevent database registration or notification delivery.
    try { localStorage.setItem(storageKey(portal), token); } catch { /* storage unavailable */ }
    return response.data;
  },
  async unregisterToken(token, portal = 'customer') {
    token ||= registeredTokens.get(portal) || storedToken(portal);
    if (!token) return;
    try {
      await apiClient.post('/push/unregister-token', { token }, { portal });
    } finally {
      if (registeredTokens.get(portal) === token) registeredTokens.delete(portal);
      // A pending unregister must not erase a newer registration.
      if (storedToken(portal) === token) {
        try { localStorage.removeItem(storageKey(portal)); } catch { /* storage unavailable */ }
      }
    }
  },
};
export default pushService;
