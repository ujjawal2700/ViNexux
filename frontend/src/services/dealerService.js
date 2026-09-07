import apiClient from '../api/axios';

export const dealerService = {
  /**
   * Fetch authenticated dealer's profile and KYC document details.
   */
  async getDealerProfile() {
    const response = await apiClient.get('/dealers/profile');
    return response.data;
  },

  /**
   * Create a new dealer profile.
   * @param {Object} data - { companyName, gstin, pan, address, city, state, pincode, kycDocuments }
   */
  async createDealerProfile(data) {
    const response = await apiClient.post('/dealers/profile', data);
    return response.data;
  },

  /**
   * Update existing dealer profile.
   * @param {Object} data - { companyName, gstin, pan, address, city, state, pincode, kycDocuments }
   */
  async updateDealerProfile(data) {
    const response = await apiClient.put('/dealers/profile', data);
    return response.data;
  },

  /**
   * Upload a KYC document (GST, PAN, or Aadhaar).
   * @param {string} type - 'gst' | 'pan' | 'aadhaar'
   * @param {File} file - File object
   */
  async uploadKycDocument(type, file) {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('file', file);

    const response = await apiClient.post('/dealers/kyc/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Delete a uploaded KYC document by type.
   * @param {string} type - 'gst' | 'pan' | 'aadhaar'
   */
  async deleteKycDocument(type) {
    const response = await apiClient.delete(`/dealers/kyc/documents/${type}`);
    return response.data;
  },
};

export default dealerService;
