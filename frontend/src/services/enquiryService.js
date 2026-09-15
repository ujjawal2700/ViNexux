import apiClient from '../api/axios';

export const enquiryService = {
  /**
   * Submit formal quotation enquiry from user's current cart.
   * @param {Object} payload - { addressId: string (a saved address from addressService), whatsappNumber: string (10-digit), message }
   */
  async createEnquiry(payload = {}) {
    const response = await apiClient.post('/enquiries', payload);
    return response.data;
  },

  /**
   * Fetch authenticated user's submitted enquiries.
   * @param {Object} params - { page, limit, status, sortBy, sortOrder }
   */
  async getMyEnquiries(params = {}) {
    const response = await apiClient.get('/enquiries', { params });
    return response.data;
  },

  /**
   * Fetch single enquiry detail owned by authenticated user.
   * @param {string} id
   */
  async getMyEnquiryById(id) {
    const response = await apiClient.get(`/enquiries/${id}`);
    return response.data;
  },
};

export default enquiryService;
