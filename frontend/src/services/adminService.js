import apiClient from '../api/axios';

export const adminService = {
  // --- DASHBOARD ---
  /**
   * Fetch aggregate admin dashboard counters.
   */
  async getDashboardSummary() {
    const response = await apiClient.get('/admin/dashboard');
    return response.data;
  },

  // --- CATEGORY MANAGEMENT ---
  /**
   * Fetch paginated category list with optional parentId/isActive filters.
   */
  async getCategories(params = {}) {
    const response = await apiClient.get('/admin/categories', { params });
    return response.data;
  },

  /**
   * Create a new product category.
   */
  async createCategory(categoryData) {
    const response = await apiClient.post('/admin/categories', categoryData);
    return response.data;
  },

  /**
   * Get category details by ID.
   */
  async getCategoryById(id) {
    const response = await apiClient.get(`/admin/categories/${id}`);
    return response.data;
  },

  /**
   * Update existing category.
   */
  async updateCategory(id, categoryData) {
    const response = await apiClient.put(`/admin/categories/${id}`, categoryData);
    return response.data;
  },

  /**
   * Deactivate/delete category.
   */
  async deleteCategory(id) {
    const response = await apiClient.delete(`/admin/categories/${id}`);
    return response.data;
  },

  // --- PRODUCT MANAGEMENT ---
  /**
   * Fetch paginated product catalog for admin with search & filters.
   */
  async getProducts(params = {}) {
    const response = await apiClient.get('/admin/products', { params });
    return response.data;
  },

  /**
   * Create a new product entry.
   */
  async createProduct(productData) {
    const response = await apiClient.post('/admin/products', productData);
    return response.data;
  },

  /**
   * Get product detail by ID.
   */
  async getProductById(id) {
    const response = await apiClient.get(`/admin/products/${id}`);
    return response.data;
  },

  /**
   * Update existing product entry.
   */
  async updateProduct(id, productData) {
    const response = await apiClient.put(`/admin/products/${id}`, productData);
    return response.data;
  },

  /**
   * Deactivate product entry.
   */
  async deleteProduct(id) {
    const response = await apiClient.delete(`/admin/products/${id}`);
    return response.data;
  },

  /**
   * Upload image to product gallery.
   */
  async uploadProductImage(id, file, altText = '') {
    const formData = new FormData();
    formData.append('file', file);
    if (altText) {
      formData.append('altText', altText);
    }

    const response = await apiClient.post(`/admin/products/${id}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Delete image from product gallery by publicId.
   */
  async deleteProductImage(id, publicId) {
    const encodedPublicId = encodeURIComponent(publicId);
    const response = await apiClient.delete(`/admin/products/${id}/images/${encodedPublicId}`);
    return response.data;
  },

  // --- DEALER & KYC MANAGEMENT ---
  /**
   * Fetch paginated dealer accounts & KYC status list.
   */
  async getDealers(params = {}) {
    const response = await apiClient.get('/admin/dealers', { params });
    return response.data;
  },

  /**
   * Get full dealer profile inspection details by ID.
   */
  async getDealerById(id) {
    const response = await apiClient.get(`/admin/dealers/${id}`);
    return response.data;
  },

  /**
   * Approve dealer KYC submission & unlock wholesale pricing.
   */
  async approveDealerKyc(id) {
    const response = await apiClient.put(`/admin/dealers/${id}/kyc/approve`);
    return response.data;
  },

  /**
   * Reject dealer KYC submission with mandatory rejection reason.
   */
  async rejectDealerKyc(id, rejectionReason) {
    const response = await apiClient.put(`/admin/dealers/${id}/kyc/reject`, { rejectionReason });
    return response.data;
  },

  /**
   * Revoke approved dealer status.
   */
  async revokeDealer(id, reason = '') {
    const response = await apiClient.put(`/admin/dealers/${id}/revoke`, { reason, rejectionReason: reason });
    return response.data;
  },

  // --- ENQUIRY / LEAD MANAGEMENT ---
  /**
   * Fetch paginated enquiries/leads list with search and filters.
   */
  async getEnquiries(params = {}) {
    const response = await apiClient.get('/admin/enquiries', { params });
    return response.data;
  },

  /**
   * Get single enquiry details by ID.
   */
  async getEnquiryById(id) {
    const response = await apiClient.get(`/admin/enquiries/${id}`);
    return response.data;
  },

  /**
   * Update enquiry status, append internal admin note, or assign admin owner.
   */
  async updateEnquiryStatus(id, updateData) {
    const response = await apiClient.put(`/admin/enquiries/${id}`, updateData);
    return response.data;
  },

  /**
   * Trigger manual Google Sheet sync for enquiry.
   */
  async syncGoogleSheet(id) {
    const response = await apiClient.post(`/admin/enquiries/${id}/sync-google-sheet`);
    return response.data;
  },

  /**
   * Trigger manual WhatsApp notification resend for enquiry.
   */
  async resendWhatsApp(id) {
    const response = await apiClient.post(`/admin/enquiries/${id}/resend-whatsapp`);
    return response.data;
  },

  // --- CUSTOMER MANAGEMENT ---
  /**
   * Fetch paginated customer accounts list (role: customer).
   */
  async getCustomers(params = {}) {
    const response = await apiClient.get('/admin/customers', { params });
    return response.data;
  },

  /**
   * Get single customer details by ID.
   */
  async getCustomerById(id) {
    const response = await apiClient.get(`/admin/customers/${id}`);
    return response.data;
  },

  /**
   * Update customer account status (active/blocked/pending).
   */
  async updateCustomerStatus(id, accountStatus) {
    const response = await apiClient.put(`/admin/customers/${id}/status`, { accountStatus, status: accountStatus });
    return response.data;
  },

  // --- SESSION MANAGEMENT ---
  /**
   * Fetch paginated active/revoked user sessions directory.
   */
  async getSessions(params = {}) {
    const response = await apiClient.get('/admin/sessions', { params });
    return response.data;
  },

  /**
   * Get single session details by ID or sessionId.
   */
  async getSessionById(id) {
    const response = await apiClient.get(`/admin/sessions/${id}`);
    return response.data;
  },

  /**
   * Force terminate/revoke an active user session.
   */
  async revokeSession(id) {
    const response = await apiClient.put(`/admin/sessions/${id}/revoke`);
    return response.data;
  },

  // --- CMS MANAGEMENT ---
  // Banners
  async getBannersAdmin() {
    const response = await apiClient.get('/admin/cms/banners');
    return response.data;
  },

  async getBannerByIdAdmin(id) {
    const response = await apiClient.get(`/admin/cms/banners/${id}`);
    return response.data;
  },

  async createBannerAdmin(bannerData) {
    const response = await apiClient.post('/admin/cms/banners', bannerData);
    return response.data;
  },

  async updateBannerAdmin(id, bannerData) {
    const response = await apiClient.put(`/admin/cms/banners/${id}`, bannerData);
    return response.data;
  },

  async deleteBannerAdmin(id) {
    const response = await apiClient.delete(`/admin/cms/banners/${id}`);
    return response.data;
  },

  async uploadBannerImageAdmin(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/admin/cms/banners/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Promotional Banners
  async getPromoBannersAdmin() {
    const response = await apiClient.get('/admin/cms/promotional-banners');
    return response.data;
  },

  async getPromoBannerByIdAdmin(id) {
    const response = await apiClient.get(`/admin/cms/promotional-banners/${id}`);
    return response.data;
  },

  async createPromoBannerAdmin(promoData) {
    const response = await apiClient.post('/admin/cms/promotional-banners', promoData);
    return response.data;
  },

  async updatePromoBannerAdmin(id, promoData) {
    const response = await apiClient.put(`/admin/cms/promotional-banners/${id}`, promoData);
    return response.data;
  },

  async deletePromoBannerAdmin(id) {
    const response = await apiClient.delete(`/admin/cms/promotional-banners/${id}`);
    return response.data;
  },

  async uploadPromoBannerImageAdmin(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/admin/cms/promotional-banners/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Static CMS Pages
  async getCmsPagesAdmin() {
    const response = await apiClient.get('/admin/cms/pages');
    return response.data;
  },

  async getCmsPageByIdAdmin(id) {
    const response = await apiClient.get(`/admin/cms/pages/${id}`);
    return response.data;
  },

  async createCmsPageAdmin(pageData) {
    const response = await apiClient.post('/admin/cms/pages', pageData);
    return response.data;
  },

  async updateCmsPageAdmin(id, pageData) {
    const response = await apiClient.put(`/admin/cms/pages/${id}`, pageData);
    return response.data;
  },

  async deleteCmsPageAdmin(id) {
    const response = await apiClient.delete(`/admin/cms/pages/${id}`);
    return response.data;
  },

  // Trust Badges
  async getTrustBadgesAdmin() {
    const response = await apiClient.get('/admin/cms/trust-badges');
    return response.data;
  },

  async getTrustBadgeByIdAdmin(id) {
    const response = await apiClient.get(`/admin/cms/trust-badges/${id}`);
    return response.data;
  },

  async createTrustBadgeAdmin(badgeData) {
    const response = await apiClient.post('/admin/cms/trust-badges', badgeData);
    return response.data;
  },

  async updateTrustBadgeAdmin(id, badgeData) {
    const response = await apiClient.put(`/admin/cms/trust-badges/${id}`, badgeData);
    return response.data;
  },

  async deleteTrustBadgeAdmin(id) {
    const response = await apiClient.delete(`/admin/cms/trust-badges/${id}`);
    return response.data;
  },

  async uploadTrustBadgeIconAdmin(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/admin/cms/trust-badges/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Footer Content
  async getFooterContentAdmin() {
    const response = await apiClient.get('/admin/cms/footer-content');
    return response.data;
  },

  async updateFooterContentAdmin(footerData) {
    const response = await apiClient.put('/admin/cms/footer-content', footerData);
    return response.data;
  },

  // --- REPORTS & ANALYTICS ---
  async getReportSummary() {
    const response = await apiClient.get('/admin/reports/summary');
    return response.data;
  },

  async getEnquiryReport(params = {}) {
    const response = await apiClient.get('/admin/reports/enquiries', { params });
    return response.data;
  },

  async getDealerReport(params = {}) {
    const response = await apiClient.get('/admin/reports/dealers', { params });
    return response.data;
  },

  async getCustomerReport(params = {}) {
    const response = await apiClient.get('/admin/reports/customers', { params });
    return response.data;
  },
};

export default adminService;
