import { ADMIN_SECTIONS } from './adminAccess.js';

export const auditDateTime = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(date) + ' IST';
};
const hidden = /password|token|secret|credential|otp|privatekey|authorization|cookie/i;
const internal = new Set(['_id', '__v', 'updatedAt', 'currentSessionId']);
const names = {
  fullName: 'Full name', standardPrice: 'Retail price', dealerPrice: 'Dealer price', stockQuantity: 'Stock quantity',
  applicablePrice: 'Selling price', sku: 'SKU', modelNumber: 'Model number', isActive: 'Available', accountStatus: 'Account status',
  gstin: 'GSTIN', pan: 'PAN', moq: 'Minimum order quantity', kycVerifiedBy: 'Verified by', kycVerifiedAt: 'Verified at',
  kycReviewedBy: 'Reviewed by', kycReviewedAt: 'Reviewed at', kycReviewAction: 'Verification decision',
  companyName: 'Company name', userId: 'Account', productId: 'Product', variantId: 'Variant', categoryId: 'Category',
  brandId: 'Brand', dealerId: 'Dealer', accessRoleId: 'Access role', isEmployee: 'Employee account',
  isPhoneVerified: 'Phone verified', isEmailVerified: 'Email verified', createdBy: 'Created by',
  sortOrder: 'Display order', msmeNumber: 'Udyam number', fcmTokens: 'Notification registrations',
  passwordHash: 'Password', refreshTokenHash: 'Sign-in credential', kycDocuments: 'Verification documents',
};
export const auditFieldLabel = path => String(path).split('.').filter(part => !['$document'].includes(part)).map((part, i, all) => {
  if (part === 'permissions') return 'Permissions';
  if (all.includes('permissions')) {
    if (part === 'read') return 'View access'; if (part === 'write') return 'Manage access';
    const section = ADMIN_SECTIONS.find(s => s.key === part); if (section) return section.label;
  }
  return names[part] || (/^\d+$/.test(part) ? `Item ${Number(part) + 1}` : part.replace(/([a-z\d])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, c => c.toUpperCase()));
}).join(' / ') || 'Record';
const entities = { Product: 'Product', DealerProfile: 'Dealer account', User: 'User account', AccessRole: 'Team role', Session: 'Sign-in session', DealerPricing: 'Dealer price', Cart: 'Cart', PosSale: 'POS invoice', Enquiry: 'Enquiry', WebsiteSettings: 'Website settings', OtpVerification: 'Sign-in verification', PushDevice: 'Notification device' };
export const auditEntityLabel = entity => entities[entity] || auditFieldLabel(entity || 'Record');
export const auditSectionLabel = key => ADMIN_SECTIONS.find(s => s.key === key)?.label || ({ access: 'Teams and access', auth: 'Sign-in and profile', profile: 'Admin profile', enquiries: 'Enquiries' })[key] || auditFieldLabel(key || 'Account');
export const auditStatusLabel = status => ({ applied: 'Saved', pending: 'In progress', failed: 'Not saved' })[status] || 'Status unavailable';
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
const ref = (value, references) => references[String(value)] || (/^[a-f\d]{24}$/i.test(String(value)) ? `Record ending ${String(value).slice(-6)}` : String(value));
export function auditValue(value, field = '', references = {}) {
  if (hidden.test(field) || value === '[REDACTED]') return 'Hidden for security';
  if (value === null || value === undefined || value === '') return 'Not set';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    const amount = value.toLocaleString('en-IN', { maximumFractionDigits: 4 });
    return /price|amount|total|balance|paid|refund/i.test(field) && !/percent|quantity|count/i.test(field) ? `INR ${amount}` : amount;
  }
  if (Array.isArray(value)) return value.length ? value.map(item => auditValue(item, field, references)).join('; ') : 'None';
  if (isObject(value)) return Object.entries(value).filter(([key]) => !internal.has(key)).map(([key, entry]) => `${auditFieldLabel(key)}: ${auditValue(entry, key, references)}`).join('; ') || 'No details';
  if (/^\d{4}-\d\d-\d\dT/.test(String(value))) return auditDateTime(value);
  return ref(value, references);
}
const identity = (value, index) => String(value?._id || value?.key || value?.name || value?.type || index);
function readableChanges(before, after, path, references, rows, depth = 0) {
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  if (internal.has(path.split('.').at(-1))) return;
  if (hidden.test(path) || before === '[REDACTED]' || after === '[REDACTED]') {
    rows.push({ field: auditFieldLabel(path), before: 'Hidden for security', after: 'Changed securely' }); return;
  }
  if (depth < 15 && ((isObject(before) && (isObject(after) || after == null)) || (isObject(after) && before == null))) {
    for (const key of new Set([...Object.keys(before || {}), ...Object.keys(after || {})])) {
      readableChanges(before?.[key], after?.[key], path === '$document' ? key : `${path}.${key}`, references, rows, depth + 1);
    }
    return;
  }
  if (depth < 15 && (Array.isArray(before) || Array.isArray(after)) && [...(before || []), ...(after || [])].some(isObject)) {
    const old = new Map((before || []).map((item, i) => [identity(item, i), item]));
    const current = new Map((after || []).map((item, i) => [identity(item, i), item]));
    for (const key of new Set([...old.keys(), ...current.keys()])) {
      const a = old.get(key), b = current.get(key), item = b || a;
      const title = item?.name || item?.key || item?.type || references[String(item?.productId)] || `Item ${[...new Set([...old.keys(), ...current.keys()])].indexOf(key) + 1}`;
      readableChanges(a, b, `${path}.${title}`, references, rows, depth + 1);
    }
    return;
  }
  rows.push({ field: auditFieldLabel(path), before: auditValue(before, path, references), after: auditValue(after, path, references) });
}
export function auditRecordLabel(doc, entity, references = {}) {
  if (doc.label) return doc.label;
  const value = doc.after || doc.before || {};
  const name = value.name || value.fullName || value.companyName || value.invoiceNumber || value.enquiryNumber || references[String(value.productId)] || references[String(value.userId)];
  const model = value.modelNumber || value.sku;
  return name ? `${name}${model && !String(name).toLowerCase().includes(String(model).toLowerCase()) ? ` (${model})` : ''}` : `${auditEntityLabel(entity)} record ending ${String(doc.id || '').slice(-6) || 'unknown'}`;
}
export function presentAuditLog(log, references = {}) {
  if (log.display) return log.display;
  const records = (log.documents || []).map(doc => {
    const changes = [];
    for (const change of doc.changes || []) readableChanges(change.before, change.after, change.field, references, changes);
    const action = doc.before === null ? 'Created' : doc.after === null ? 'Deleted' : /delete/i.test(log.operation) ? 'Deleted' : /insert/i.test(log.operation) ? 'Created' : 'Updated';
    return { id: doc.id, label: auditRecordLabel(doc, log.entity, references), action, changes };
  });
  const action = records.length && records.every(r => r.action === records[0].action) ? records[0].action : 'Updated';
  return {
    actor: log.actor?.name || log.actor?.email || 'Administrator', email: log.actor?.email || '', role: log.actor?.roleName || 'Super admin',
    section: auditSectionLabel(log.section), entity: auditEntityLabel(log.entity), status: auditStatusLabel(log.status),
    time: auditDateTime(log.createdAt), action,
    recordCount: records.length,
    summary: records.length > 2 ? `${action} ${records.length} ${auditEntityLabel(log.entity).toLowerCase()} records` : records.length ? `${action} ${records.map(r => r.label).join(', ')}` : `${action} ${auditEntityLabel(log.entity).toLowerCase()}`,
    records,
  };
}
