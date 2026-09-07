import apiClient from '../api/axios';

export const cartService = {
  /**
   * Fetch current user's cart.
   */
  async getCart() {
    const response = await apiClient.get('/cart');
    return response.data;
  },

  /**
   * Add item to cart or increment quantity.
   * @param {string} productId
   * @param {number} quantity
   */
  async addItem(productId, quantity = 1) {
    const response = await apiClient.post('/cart/items', { productId, quantity });
    return response.data;
  },

  /**
   * Update item quantity in cart.
   * @param {string} productId
   * @param {number} quantity
   */
  async updateItemQuantity(productId, quantity) {
    const response = await apiClient.put(`/cart/items/${productId}`, { quantity });
    return response.data;
  },

  /**
   * Remove item from cart.
   * @param {string} productId
   */
  async removeItem(productId) {
    const response = await apiClient.delete(`/cart/items/${productId}`);
    return response.data;
  },

  /**
   * Clear entire cart.
   */
  async clearCart() {
    const response = await apiClient.delete('/cart');
    return response.data;
  },
};

export default cartService;
