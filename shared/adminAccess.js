export const ADMIN_SECTIONS = [
  ['campaigns', 'Email & push campaigns', 'Marketing'],
  ['dashboard', 'Overview dashboard', 'Operations'], ['categories', 'Categories', 'Catalog'],
  ['products', 'Products & inventory', 'Catalog'], ['brands', 'Brands', 'Catalog'],
  ['pos', 'Offline POS billing', 'Operations'], ['dealers', 'Dealer verification', 'People'],
  ['customers', 'Customer accounts', 'People'], ['enquiries-customers', 'B2C enquiries', 'Operations'], ['enquiries-dealers', 'B2B enquiries', 'Operations'],
  ['sessions', 'Customer & dealer sessions', 'People'], ['reports', 'Analytics reports', 'Operations'],
  ['themes', 'Seasonal themes', 'Website'], ['website-settings', 'Website & SEO settings', 'Website'],
  ['banners', 'Homepage banners', 'Website'], ['promotional-banners', 'Promotional cards', 'Website'],
  ['pages', 'Static pages', 'Website'], ['footer-content', 'Footer content', 'Website'],
  ['trust-badges', 'Trust badges', 'Website'], ['uploads', 'Shared media uploads', 'Website'],
].map(([key, label, group]) => ({ key, label, group }));

export const isSuperAdmin = user => user?.role === 'admin' && user.isEmployee !== true;
export const sectionForAdminPath = path => {
  const clean = String(path).split('?')[0].replace(/^\/api/, '');
  if (clean === '/upload' || clean.startsWith('/upload/')) return 'uploads';
  if (/^\/products(?:\/|$)/.test(clean)) return 'products';
  if (/^\/categories(?:\/|$)/.test(clean)) return 'categories';
  if (!clean.startsWith('/admin/')) return null;
  const parts = clean.split('/');
  if (parts[2] === 'cms') return ({ 'banner-grid': 'banners', banners: 'banners' })[parts[3]] || parts[3];
  if (parts[2] === 'enquiries' && ['customers', 'dealers'].includes(parts[3])) return `enquiries-${parts[3]}`;
  if (parts[2] === 'upload') return 'uploads';
  return parts[2];
};
export const canAdmin = (user, section, action = 'read') => {
  if (isSuperAdmin(user)) return true;
  if (user?.role !== 'admin' || !user.isEmployee || user.accessRoleActive !== true) return false;
  if (section === 'profile' || section === 'access-self') return true;
  if (!ADMIN_SECTIONS.some(item => item.key === section)) return false;
  return user.permissions?.[section]?.[action] === true;
};
export const canVisitAdmin = (user, path) => {
  const section = sectionForAdminPath(path);
  return canAdmin(user, section, 'read') || canAdmin(user, section, 'write');
};
