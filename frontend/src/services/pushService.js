import apiClient from '../api/axios';

export const pushService = {
  async registerToken(token) {
    const response = await apiClient.post('/push/register-token', { token });
    return response.data;
  },

  async unregisterToken(token) {
    const response = await apiClient.post('/push/unregister-token', { token });
    return response.data;
  },
};

export default pushService;
