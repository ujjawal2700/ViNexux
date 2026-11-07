import { publicRequest } from '../utils/publicRequests';
import apiClient from '../api/axios';

export const categoryService = {
  async getCategoryTree(options = {}) {
    if (options.signal) return (await apiClient.get('/categories/tree', options)).data;
    return publicRequest('category-tree', () => apiClient.get('/categories/tree', options).then(response => response.data));
  },
  /**
   * Fetch category listing with optional query parameters.
   * @param {Object} params - { page, limit, parentId, isActive, sortBy, sortOrder }
   */
  async getCategories(params = {}) {
    const response = await apiClient.get('/categories', { params });
    return response.data;
  },

  /**
   * Fetch single category by ID.
   * @param {string} id
   */
  async getCategoryById(id) {
    const response = await apiClient.get(`/categories/${id}`);
    return response.data;
  },
};

export default categoryService;
