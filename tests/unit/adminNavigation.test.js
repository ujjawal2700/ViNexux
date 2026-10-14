import { expect, test } from '@jest/globals';
import { visibleAdminNavigation } from '../../shared/adminNavigation.js';

const posEmployee = { role: 'admin', isEmployee: true, accessRoleActive: true, permissions: { pos: { read: true, write: true } } };
test('sidebar omits unauthorized items and empty category headings', () => {
  const groups = visibleAdminNavigation(posEmployee);
  expect(groups.map(group => group.label)).toEqual(['Sales & Enquiries', 'My Account']);
  expect(groups[0].items.map(item => item.path)).toEqual(['/admin/pos']);
  expect(visibleAdminNavigation(posEmployee, 'cms')).toEqual([]);
  expect(visibleAdminNavigation(posEmployee, 'billing')[0].items[0].path).toBe('/admin/pos');
});
test('search matches labels, aliases, groups and nested category sections', () => {
  const owner = { role: 'admin' };
  expect(visibleAdminNavigation(owner, 'employee')[0].items[0].path).toBe('/admin/access');
  expect(visibleAdminNavigation(owner, 'inventory').flatMap(group => group.items).some(item => item.path === '/admin/products')).toBe(true);
  const category = visibleAdminNavigation(owner, 'main category')[0].items[0];
  expect(category.path).toBe('/admin/categories');
  expect(category.children.map(child => child.path)).toEqual(['/admin/categories/main']);
  expect(visibleAdminNavigation(owner, 'does-not-exist')).toEqual([]);
});
