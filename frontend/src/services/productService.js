import apiClient from '../api/axios';

export const productService = {
  async getBrands() {
    const response = await apiClient.get('/products/brands');
    return response.data;
  },
  /**
   * Fetch catalog product listing with search, filtering, and pagination.
   * @param {Object} params - { search, categoryId, isFeatured, isActive, page, limit, sortBy, sortOrder }
   */
  async getProducts(params = {}, options = {}) {
    const response = await apiClient.get('/products', { ...options, params });
    return response.data;
  },

  /**
   * Newest product from each root category (home page section), in one request.
   */
  async getCategoryHighlights(options = {}) {
    const response = await apiClient.get('/products/category-highlights', options);
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
