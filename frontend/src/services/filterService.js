import apiClient from '../api/axios';
export const filterService = {
  async list() { return (await apiClient.get('/admin/filters')).data; },
  async get(id) { return (await apiClient.get(`/admin/filters/${id}`)).data; },
  async save(id, body) { return (id ? await apiClient.put(`/admin/filters/${id}`, body) : await apiClient.post('/admin/filters', body)).data; },
  async remove(id) { return (await apiClient.delete(`/admin/filters/${id}`)).data; },
  async searchProducts(params, signal) { return (await apiClient.get('/admin/filters/products', { params, signal })).data; },
};
