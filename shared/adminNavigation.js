import { canVisitAdmin } from './adminAccess.js';

export const ADMIN_NAV_GROUPS = [
  { label: 'Overview', items: [
    { label: 'Overview Dashboard', path: '/admin/dashboard', icon: 'LayoutDashboard' },
    { label: 'Analytics Reports', path: '/admin/reports', icon: 'BarChart3' },
  ] },
  { label: 'Catalog & Inventory', items: [
    { label: 'Category Management', path: '/admin/categories', icon: 'FolderTree', children: [
      { label: 'Header Category', path: '/admin/categories/header', icon: 'Layers' },
      { label: 'Main Category', path: '/admin/categories/main', icon: 'FolderTree' },
      { label: 'Sub Category', path: '/admin/categories/sub', icon: 'GitBranch' },
    ] },
    { label: 'Product Catalog', path: '/admin/products', icon: 'Package', keywords: 'stock inventory import positioning', children: [
      { label: 'Product Positioning', path: '/admin/products/positioning', icon: 'Layers' },
    ] },
    { label: 'Brand Management', path: '/admin/brands', icon: 'Tags' },
  ] },
  { label: 'Sales & Enquiries', items: [
    { label: 'Offline POS Billing', path: '/admin/pos', icon: 'Receipt', keywords: 'invoice sale payment' },
    { label: 'B2C Enquiries', path: '/admin/enquiries/customers', icon: 'Inbox', keywords: 'customer support' },
    { label: 'B2B Enquiries', path: '/admin/enquiries/dealers', icon: 'Building2', keywords: 'dealer support' },
  ] },
  { label: 'People & Access', items: [
    { label: 'Dealer Verification', path: '/admin/dealers', icon: 'Users', keywords: 'kyc approval' },
    { label: 'Customer Accounts', path: '/admin/customers', icon: 'UserCheck' },
    { label: 'Team & Access', path: '/admin/access', icon: 'Users', keywords: 'employee role permission' },
    { label: 'Active User Sessions', path: '/admin/sessions', icon: 'ShieldAlert', keywords: 'login devices' },
    { label: 'Super Admin Logbook', path: '/admin/logbook', icon: 'BookOpen', keywords: 'audit history changes' },
  ] },
  { label: 'Website & Content', items: [
    { label: 'Seasonal Themes', path: '/admin/cms/themes', icon: 'Sparkles', keywords: 'cms festival' },
    { label: 'Website / SEO Settings', path: '/admin/cms/website-settings', icon: 'Settings2', keywords: 'cms' },
    { label: 'Homepage Banners', path: '/admin/cms/banners', icon: 'Image', keywords: 'cms slides' },
    { label: 'Promotional Cards', path: '/admin/cms/promotional-banners', icon: 'Sparkles', keywords: 'cms promotions' },
    { label: 'CMS Static Pages', path: '/admin/cms/pages', icon: 'FileText' },
    { label: 'Footer Content', path: '/admin/cms/footer-content', icon: 'LayoutList', keywords: 'cms' },
  ] },
  { label: 'Marketing', items: [{ label: 'Email & Push Campaigns', path: '/admin/campaigns', icon: 'Sparkles', keywords: 'notifications firebase promotions marketing mail' }] },
  { label: 'My Account', items: [{ label: 'My Admin Profile', path: '/admin/profile', icon: 'UserCheck' }] },
];

export const visibleAdminNavigation = (user, search = '') => {
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = text => terms.every(term => text.toLowerCase().includes(term));
  return ADMIN_NAV_GROUPS.flatMap(group => {
    const items = group.items.filter(item => canVisitAdmin(user, item.path)).flatMap(item => {
      const children = (item.children || []).filter(child => canVisitAdmin(user, child.path));
      if (matches(`${group.label} ${item.label} ${item.keywords || ''}`)) return [{ ...item, children }];
      const matchingChildren = children.filter(child => matches(`${group.label} ${child.label}`));
      return matchingChildren.length ? [{ ...item, children: matchingChildren }] : [];
    });
    return items.length ? [{ ...group, items }] : [];
  });
};
