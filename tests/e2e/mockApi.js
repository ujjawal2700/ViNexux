import { presetConfig } from '../../shared/seasonalThemes.js';
const objectId = '507f1f77bcf86cd799439011';
const testTheme = { _id: objectId, name: 'E2E Diwali', preset: 'diwali', draft: presetConfig('diwali'), schedule: { enabled: false, startAt: null, endAt: null, priority: 0 }, revision: 0 };

const customer = { _id: objectId, name: 'E2E Customer', email: 'customer@example.com', phone: '9876543210', role: 'customer', isActive: true };
const admin = { _id: objectId, name: 'E2E Admin', email: 'admin@example.com', phone: '9876543211', role: 'admin', isActive: true };
const product = {
  _id: objectId,
  name: 'E2E Product',
  slug: 'e2e-product',
  sku: 'E2E-001',
  description: 'Product used by the browser test suite.',
  price: 100,
  standardPrice: 100,
  dealerPrice: 90,
  stock: 10,
  isActive: true,
  images: [],
  brand: 'Acme',
  brandId: { _id: objectId, name: 'Acme', slug: 'acme' },
  category: 'Electronics',
  categoryId: { _id: objectId, name: 'Electronics', slug: 'electronics' },
};
const pagination = { page: 1, limit: 20, total: 0, pages: 0, totalPages: 0 };

const responseFor = (url, method, postData) => {
  const pathname = new URL(url).pathname;
  if (pathname.endsWith('/content/theme')) return { success: true, data: { theme: { id: null, name: 'Store default', config: presetConfig(), nextChangeAt: null } } };
  if (pathname.endsWith('/admin/cms/themes')) return { success: true, data: { themes: [testTheme], active: { id: null, name: 'Store default' } } };
  if (pathname.includes('/admin/cms/themes/')) return { success: true, data: { theme: testTheme } };

  if (pathname.endsWith('/auth/refresh-token')) {
    const isAdmin = postData?.includes('admin-refresh');
    const user = isAdmin ? admin : customer;
    return { success: true, data: { accessToken: 'e2e-access', refreshToken: isAdmin ? 'admin-refresh' : 'customer-refresh', user, session: { expiresAt: new Date(Date.now() + 86_400_000).toISOString() } } };
  }
  if (pathname.endsWith('/auth/me')) return { success: true, data: { user: customer } };
  if (/\/products\/[0-9a-f]{24}$/.test(pathname)) return { success: true, data: { product } };
  if (pathname.endsWith('/products/brands') || pathname.endsWith('/admin/brands')) return { success: true, data: { brands: [], pagination } };
  if (pathname.includes('/products')) return { success: true, data: { products: [product], facets: { brands: [], availability: [], specs: [] }, pagination } };
  if (pathname.endsWith('/categories/tree')) return { success: true, data: { categories: [], categoryTree: [] } };
  if (pathname.includes('/categories')) return { success: true, data: { categories: [], pagination } };
  if (pathname.endsWith('/cart')) return { success: true, data: { cart: { items: [], subtotal: 0, total: 0, itemCount: 0 } } };
  if (/\/enquiries\/[0-9a-f]{24}$/.test(pathname)) return { success: true, data: { enquiry: { _id: objectId, enquiryNumber: 'ENQ-E2E', status: 'new', items: [], user: customer, createdAt: new Date().toISOString() } } };
  if (pathname.includes('/enquiries')) return { success: true, data: { enquiries: [], pagination } };
  if (/\/dealers\/[0-9a-f]{24}/.test(pathname) || pathname.endsWith('/dealers/profile')) return { success: true, data: { profile: { user: customer, businessName: 'E2E Dealer', documents: [] } } };
  if (pathname.includes('/dealers')) return { success: true, data: { dealers: [], pagination } };
  if (/\/customers\/[0-9a-f]{24}$/.test(pathname)) return { success: true, data: { customer } };
  if (pathname.includes('/customers')) return { success: true, data: { customers: [], pagination } };
  if (pathname.includes('/sessions')) return { success: true, data: { sessions: [], pagination } };
  if (pathname.includes('/reports')) return { success: true, data: { summary: {}, series: [], rows: [], pagination } };
  if (pathname.includes('/dashboard')) return { success: true, data: { stats: {}, recentEnquiries: [], pendingDealers: [] } };
  if (pathname.endsWith('/content/banners') || pathname.endsWith('/admin/cms/banners')) return { success: true, data: { banners: [] } };
  if (pathname.endsWith('/content/banner-grid')) return { success: true, data: { grid: null } };
  if (pathname.endsWith('/admin/cms/banner-grid')) return { success: true, data: { grid: { sections: Array.from({ length: 4 }, () => ({ images: [] })), revision: 0, configured: false } } };
  if (pathname.includes('promotional')) return { success: true, data: { promotionalBanners: [], settings: {} } };
  if (pathname.includes('footer')) return { success: true, data: { footer: { quickLinks: [], legalLinks: [], socialLinks: [], isActive: true } } };
  if (pathname.includes('website-settings')) return { success: true, data: { settings: {} } };
  if (pathname.endsWith('/admin/cms/pages')) return { success: true, data: { pages: [] } };
  if (pathname.includes('/content/pages/') || pathname.includes('/cms/pages/')) return { success: true, data: { page: { _id: objectId, title: 'E2E Page', slug: 'about-us', content: '<p>E2E content</p>', isActive: true }, pages: [] } };
  if (pathname.includes('/addresses')) return { success: true, data: { addresses: [] } };
  if (pathname.includes('/profile')) return { success: true, data: { user: pathname.includes('/admin') ? admin : customer, profile: customer } };
  if (method !== 'GET') return { success: true, data: {} };
  return { success: true, data: { items: [], pagination } };
};

export const mockApi = async (page) => {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    // Vite serves the Axios module at /src/api/axios.js; the broad glob also
    // sees that asset, so only mock genuine backend URLs rooted at /api/.
    if (!new URL(request.url()).pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responseFor(request.url(), request.method(), request.postData())),
    });
  });
};

export const seedBrowserSession = async (page, section) => {
  await page.addInitScript(({ requestedSection, customerData, adminData }) => {
    localStorage.setItem('vinexus_storage_choices_v1', JSON.stringify({ preferences: false, updatedAt: new Date().toISOString() }));
    if (requestedSection === 'account' || requestedSection === 'legacy-redirect') {
      localStorage.setItem('vinexus_refresh_token', 'customer-refresh');
      localStorage.setItem('vinexus_user', JSON.stringify(customerData));
      localStorage.setItem('vinexus_customer_session_expires_at', new Date(Date.now() + 86_400_000).toISOString());
    }
    if (requestedSection === 'admin') {
      localStorage.setItem('vinexus_admin_refresh_token', 'admin-refresh');
      localStorage.setItem('vinexus_admin_user', JSON.stringify(adminData));
    }
  }, { requestedSection: section, customerData: customer, adminData: admin });
};
