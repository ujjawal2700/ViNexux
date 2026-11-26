import api from '../api/axios';
const options = { portal: 'admin', skipGlobalLoader: true };
const base = '/auth/admin-privacy';
const post = async (path, data) => (await api.post(base + path, data, options)).data.data;
export const adminPrivacyService = {
  status: async () => (await api.get(`${base}/status`, options)).data.data,
  lock: () => post('/lock', {}),
  unlock: pin => post('/unlock', { pin }),
  setPin: async data => (await api.put(`${base}/pin`, data, options)).data.data,
  requestReset: (data, login = false) => post(login ? '/recovery/request' : '/reset/request', data),
  resetPin: (data, login = false) => post(login ? '/recovery/reset' : '/reset/confirm', data),
};
