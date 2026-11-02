import { expect, test } from '@jest/globals';
import { filterBody } from '../../backend/src/validators/productFilter.validator.js';
import { getProductsQuerySchema } from '../../backend/src/validators/product.validator.js';
import { readProductFilters } from '../../shared/productFiltering.js';
import { canAdmin, sectionForAdminPath } from '../../shared/adminAccess.js';
const id = '507f1f77bcf86cd799439011', option = '507f1f77bcf86cd799439012';
test('manual filters accept checkbox, radio and dropdown options with explicit product assignments', () => {
  for (const type of ['checkbox', 'radio', 'select']) {
    const body = filterBody.parse({ name: ' Capacity ', type, options: [{ label: ' 64 GB ', productIds: [id] }, { label: '128 GB' }] });
    expect(body.name).toBe('Capacity'); expect(body.options[0]).toEqual({ label: '64 GB', productIds: [id] });
    expect(body.options[1].productIds).toEqual([]);
  }
});
test('invalid and duplicate options and reserved built-in names are rejected', () => {
  const body = { name: 'Capacity', options: [{ label: '64 GB', productIds: [id] }] };
  for (const bad of [{ ...body, name: 'Brands' }, { ...body, name: 'Categories' }, { ...body, options: [] }, { ...body, type: 'invalid' }, { ...body, options: [{ label: '' }] }, { ...body, options: [{ label: '64 GB' }, { label: '64 gb' }] }, { ...body, options: [{ label: '64 GB', productIds: ['invalid'] }] }]) expect(filterBody.safeParse(bad).success).toBe(false);
});
test('selection URLs retain valid IDs, remove duplicates and reject malformed API inputs', () => {
  const value = JSON.stringify({ [id]: [option, option], '__proto__': ['unsafe'], invalid: ['bad'] });
  expect(readProductFilters(value)).toEqual({ [id]: [option] });
  expect(readProductFilters('{bad')).toEqual({});
  expect(getProductsQuerySchema.query.parse({ customFilters: JSON.stringify({ [id]: [option] }) }).customFilters).toBeDefined();
  expect(getProductsQuerySchema.query.safeParse({ customFilters: '{bad' }).success).toBe(false);
  expect(getProductsQuerySchema.query.safeParse({ customFilters: '{"invalid":["bad"]}' }).success).toBe(false);
});
test('filters have independent read/write permissions and routing', () => {
  expect(sectionForAdminPath('/api/admin/filters/products')).toBe('filters');
  const employee = { role: 'admin', isEmployee: true, accessRoleActive: true, permissions: { filters: { read: true, write: false } } };
  expect(canAdmin(employee, 'filters', 'read')).toBe(true); expect(canAdmin(employee, 'filters', 'write')).toBe(false);
});
