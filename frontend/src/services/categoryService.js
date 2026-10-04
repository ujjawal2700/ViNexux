import apiClient from '../api/axios';

let categoryTreeRequest = null;

export const categoryService = {
  async getCategoryTree(options = {}) {
    // PublicLayout and the current page commonly mount together. Share their
    // request instead of downloading the same category tree twice.
    if (!categoryTreeRequest) {
      categoryTreeRequest = apiClient.get('/categories/tree', options)
        .then((response) => response.data)
        .finally(() => {
          categoryTreeRequest = null;
        });
    }
    return categoryTreeRequest;
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
