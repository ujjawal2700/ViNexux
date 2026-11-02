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

  // Fetch every selected product through bounded API pages, without a section cap.
  async getMerchandisingProducts(flag) {
    const params = { [flag]: true, sortBy: 'updatedAt', sortOrder: 'desc', limit: 100, includeFacets: false };
    const first = await this.getProducts({ ...params, page: 1 });
    const products = [...(first.data?.products || [])];
    const totalPages = first.data?.pagination?.totalPages || 1;
    for (let page = 2; page <= totalPages; page++) {
      const response = await this.getProducts({ ...params, page });
      products.push(...(response.data?.products || []));
    }
    return { ...first, data: { ...first.data, products: [...new Map(products.map(product => [product._id, product])).values()] } };
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
  async getProductById(id, options = {}) {
    const response = await apiClient.get(`/products/${id}`, options);
    return response.data;
  },
};

export default productService;
