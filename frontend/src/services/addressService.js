import apiClient from '../api/axios';

/**
 * Reusable saved-address book, shared by customer and dealer roles.
 * See backend/src/routes/address.routes.js.
 */
export const addressService = {
  listAddresses: async () => {
    const response = await apiClient.get('/addresses');
    return response.data;
  },

  createAddress: async (data) => {
    const response = await apiClient.post('/addresses', data);
    return response.data;
  },

  updateAddress: async (addressId, data) => {
    const response = await apiClient.put(`/addresses/${addressId}`, data);
    return response.data;
  },

  deleteAddress: async (addressId) => {
    const response = await apiClient.delete(`/addresses/${addressId}`);
    return response.data;
  },

  setDefaultAddress: async (addressId) => {
    const response = await apiClient.put(`/addresses/${addressId}/default`);
    return response.data;
  },
};

export default addressService;
