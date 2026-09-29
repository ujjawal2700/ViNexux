import apiClient from '../api/axios';

export const contentService = {
  /**
   * Fetch active hero carousel banners for homepage.
   */
  async getBanners(options = {}) {
    const response = await apiClient.get('/content/banners', options);
    return response.data;
  },

  /**
   * Fetch active promotional banners.
   */
  async getPromotionalBanners() {
    const response = await apiClient.get('/content/promotional-banners');
    return response.data;
  },

  /**
   * Fetch active trust badges / "Why Vinexus" blocks.
   */
  async getTrustBadges() {
    const response = await apiClient.get('/content/trust-badges');
    return response.data;
  },

  /**
   * Fetch public footer contact info & quick links.
   */
  async getFooterContent(options = {}) {
    const response = await apiClient.get('/content/footer-content', options);
    return response.data;
  },

  async getWebsiteSettings(options = {}) {
    const response = await apiClient.get('/content/website-settings', options);
    return response.data;
  },

  async getWebsiteSettings(options = {}) {
    const response = await apiClient.get('/content/website-settings', options);
    return response.data;
  },

  /**
   * Fetch published static CMS page by slug.
   */
  async getCmsPageBySlug(slug) {
    const response = await apiClient.get(`/content/pages/${slug}`);
    return response.data;
  },
};

export default contentService;
