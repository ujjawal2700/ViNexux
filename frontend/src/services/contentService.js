import { publicRequest } from '../utils/publicRequests';
import apiClient from '../api/axios';

export const contentService = {
  async getBannerGrid(options = {}) {
    if (options.signal) return (await apiClient.get('/content/banner-grid', options)).data;
    return publicRequest('getBannerGrid', () => apiClient.get('/content/banner-grid', options).then(response => response.data), 15000);
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
    if (options.signal) return (await apiClient.get('/content/footer-content', options)).data;
    return publicRequest('getFooterContent', () => apiClient.get('/content/footer-content', options).then(response => response.data), 15000);
  },

  async getWebsiteSettings(options = {}) {
    if (options.signal) return (await apiClient.get('/content/website-settings', options)).data;
    return publicRequest('getWebsiteSettings', () => apiClient.get('/content/website-settings', options).then(response => response.data), 500);
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
