import apiClient from '../api/axios';

export const enquiryService = {
  async createWhatsAppOrder(payload) { return (await apiClient.post('/enquiries/whatsapp', payload)).data; },
  async createAvailabilityEnquiry(payload) { return (await apiClient.post('/enquiries/availability', payload)).data; },
  async sendMessage(id, message) { return (await apiClient.post(`/enquiries/${id}/messages`, { message })).data; },
  async markRepliesRead(id, replyCount) { return (await apiClient.post(`/enquiries/${id}/read`, { replyCount }, { skipGlobalLoader: true })).data; },
  /**
   * Submit an enquiry from the user's current cart.
   * @param {Object} payload - Editable contact/address snapshot, selected product IDs, WhatsApp number, and optional message.
   */
  async createEnquiry(payload = {}) {
    const response = await apiClient.post('/enquiries', payload);
    return response.data;
  },

  /**
   * Fetch authenticated user's submitted enquiries.
   * @param {Object} params - { page, limit, status, sortBy, sortOrder }
   */
  async getMyEnquiries(params = {}, options = {}) {
    const response = await apiClient.get('/enquiries', { ...options, params });
    return response.data;
  },

  /**
   * Fetch single enquiry detail owned by authenticated user.
   * @param {string} id
   */
  async getMyEnquiryById(id, options = {}) {
    const response = await apiClient.get(`/enquiries/${id}`, options);
    return response.data;
  },
};

export default enquiryService;
