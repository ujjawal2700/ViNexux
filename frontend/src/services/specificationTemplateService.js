import apiClient from '../api/axios';
const path = '/admin/products/specification-templates';
export const specificationTemplateService = {
  async list(params, options = {}) { return (await apiClient.get(path, { params, ...options })).data; },
  async create(payload) { return (await apiClient.post(path, payload)).data; },
  async update(id, payload) { return (await apiClient.put(`${path}/${id}`, payload)).data; },
  async remove(id) { return (await apiClient.delete(`${path}/${id}`)).data; },
};
