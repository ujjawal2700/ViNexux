import api from '../api/axios';
export default {
  list: async params => (await api.get('/pos/my-invoices', { params, portal: 'customer', skipGlobalLoader: true })).data.data,
  pdf: id => api.get(`/pos/my-invoices/${id}/pdf`, { responseType: 'blob', portal: 'customer' }),
};
