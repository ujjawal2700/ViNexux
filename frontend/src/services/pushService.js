import apiClient from '../api/axios';
const registeredTokens = new Map();
export const pushService = {
  async registerToken(token, portal = 'customer') {
    const response = await apiClient.post('/push/register-token', { token }, { portal });
    registeredTokens.set(portal, token);
    return response.data;
  },
  async unregisterToken(token, portal = 'customer') {
    token ||= registeredTokens.get(portal);
    if (!token) return;
    await apiClient.post('/push/unregister-token', { token }, { portal });
    if (registeredTokens.get(portal) === token) registeredTokens.delete(portal);
  },
};
export default pushService;
