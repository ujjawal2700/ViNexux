import { describe, expect, jest, test } from '@jest/globals';
import { ADMIN_SECTIONS, canAdmin, isSuperAdmin, sectionForAdminPath } from '../../shared/adminAccess.js';
import { authorize } from '../../backend/src/middlewares/auth.middleware.js';
import { auditChanges, readAuditLocation, redactAudit } from '../../backend/src/audit/audit.js';
import { employeeInput, roleInput } from '../../backend/src/routes/adminAccess.routes.js';

describe('employee access control', () => {
  const employee = { role: 'admin', isEmployee: true, accessRoleActive: true, permissions: { products: { read: true, write: false } } };
  test('legacy admins remain super admins; employee access is explicit and fail closed', () => {
    expect(isSuperAdmin({ role: 'admin' })).toBe(true);
    expect(isSuperAdmin(employee)).toBe(false);
    expect(canAdmin(employee, 'products', 'read')).toBe(true);
    expect(canAdmin(employee, 'products', 'write')).toBe(false);
    expect(canAdmin(employee, 'categories', 'read')).toBe(false);
    expect(canAdmin(employee, 'access', 'write')).toBe(false);
    expect(canAdmin(employee, 'logbook', 'read')).toBe(false);
    expect(canAdmin({ ...employee, accessRoleActive: false }, 'products')).toBe(false);
    expect(canAdmin({ ...employee, permissions: { products: { write: true } } }, 'products', 'read')).toBe(false);
    expect(canAdmin({ role: 'customer', permissions: employee.permissions }, 'products')).toBe(false);
  });
  test('public mutation aliases and each CMS section resolve consistently', () => {
    expect(sectionForAdminPath('/api/products/123')).toBe('products');
    expect(sectionForAdminPath('/api/categories/123')).toBe('categories');
    expect(sectionForAdminPath('/api/admin/cms/banner-grid/0/images')).toBe('banners');
    expect(sectionForAdminPath('/admin/enquiries/customers')).toBe('enquiries-customers');
    expect(sectionForAdminPath('/admin/enquiries/dealers')).toBe('enquiries-dealers');
    expect(sectionForAdminPath('/admin/upload/image')).toBe('uploads');
    expect(sectionForAdminPath('/api/admin/cms/footer-content/images/bank-qr')).toBe('footer-content');
    expect(sectionForAdminPath('/api/upload/image')).toBe('uploads');
  });
  test('server middleware rejects writes despite a valid administrator role', () => {
    const req = { user: employee, adminAccess: employee, method: 'PUT', originalUrl: '/api/admin/products/123' };
    const next = jest.fn(); authorize('admin')(req, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
    expect(next.mock.calls[0][0].errorCode).toBe('WRITE_ACCESS_DENIED');
    expect(next.mock.calls[0][0].message).toBe("You don't have write access to this section.");
    req.method = 'GET'; next.mockClear(); authorize('admin')(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });
  test('account creation cannot promote an employee or smuggle an unrecognized permission', () => {
    const payload = { fullName: 'Asha Singh', email: 'asha@example.test', phone: '9888888888', password: 'secure-password', accessRoleId: '507f1f77bcf86cd799439011' };
    expect(employeeInput.safeParse(payload).success).toBe(true);
    expect(employeeInput.safeParse({ ...payload, isEmployee: false }).success).toBe(false);
    expect(employeeInput.safeParse({ ...payload, role: 'admin' }).success).toBe(false);
    expect(roleInput.safeParse({ name: 'Custom role', permissions: { superAdmin: { read: true, write: true } } }).success).toBe(false);
    expect(new Set(ADMIN_SECTIONS.map(s => s.key)).size).toBe(ADMIN_SECTIONS.length);
  });
});
describe('audit privacy and browser location', () => {
  test('nested secrets are redacted while a password change remains visible', () => {
    const diff = auditChanges({ passwordHash: 'old-hash', stock: 10 }, { passwordHash: 'new-hash', stock: 12 });
    expect(diff).toContainEqual({ field: 'passwordHash', before: '[REDACTED]', after: '[REDACTED]' });
    expect(diff).toContainEqual({ field: 'stock', before: 10, after: 12 });
    const document = redactAudit({ rows: [{ password: 'plain-password', refreshTokenHash: 'secret', name: 'Asha' }] });
    expect(JSON.stringify(document)).not.toMatch(/plain-password|secret/);
    expect(document.rows[0].name).toBe('Asha');
  });
  test('stale, invalid or missing coordinates cannot be presented as current location', () => {
    const valid = { status: 'available', latitude: 26.9, longitude: 75.7, accuracy: 10, timestamp: Date.now() };
    expect(readAuditLocation({ 'x-admin-location': JSON.stringify(valid) }).source).toBe('browser-reported');
    for (const patch of [{ latitude: 91 }, { longitude: -181 }, { accuracy: -1 }, { timestamp: Date.now() - 600000 }]) {
      expect(readAuditLocation({ 'x-admin-location': JSON.stringify({ ...valid, ...patch }) }).status).toBe('unavailable');
    }
    expect(readAuditLocation({ 'x-admin-location': '{invalid' }).status).toBe('unavailable');
    expect(readAuditLocation({ 'x-admin-location': '{"status":"denied"}' }).status).toBe('denied');
    expect(readAuditLocation({}).status).toBe('unavailable');
  });
});
