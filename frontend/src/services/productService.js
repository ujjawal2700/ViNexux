import apiClient from '../api/axios';

export const productService = {
  /**
   * Fetch catalog product listing with search, filtering, and pagination.
   * @param {Object} params - { search, categoryId, isFeatured, isActive, page, limit, sortBy, sortOrder }
   */
  async getProducts(params = {}) {
    const response = await apiClient.get('/products', { params });
    return response.data;
  },

  /**
   * Fetch single product detail view by ID.
   * @param {string} id
   */
  async getProductById(id) {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },
};

export default productService;
