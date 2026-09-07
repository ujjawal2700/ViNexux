import apiClient from '../api/axios';

export const categoryService = {
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
