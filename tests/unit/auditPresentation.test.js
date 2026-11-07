import { expect, test } from '@jest/globals';
import { presentAuditLog } from '../../shared/auditPresentation.js';
import { auditRequestParams } from '../../shared/auditFilters.js';
import { buildAuditFilter, logQuery } from '../../backend/src/services/auditReport.service.js';

const log = changes => ({ entity: 'Product', operation: 'updateOne', status: 'applied', section: 'products', actor: { name: 'Asha Singh' }, createdAt: '2026-11-07T07:00:00Z', documents: [{ id: '507f1f77bcf86cd799439011', before: { name: 'Ethernet cable', modelNumber: 'CAT6' }, after: { name: 'Ethernet cable', modelNumber: 'CAT6' }, changes }] });
test('describes the person, product model, price and stock without technical field names', () => {
  const view = presentAuditLog(log([{ field: 'standardPrice', before: 150, after: 175 }, { field: 'stockQuantity', before: 10, after: 25 }]));
  expect(view.actor).toBe('Asha Singh'); expect(view.summary).toBe('Updated Ethernet cable (CAT6)');
  expect(view.records[0].changes).toEqual([{ field: 'Retail price', before: 'INR 150', after: 'INR 175' }, { field: 'Stock quantity', before: '10', after: '25' }]);
  expect(view.time).toContain('12:30:00'); expect(view.time).toContain('IST');
});
test('expands variant arrays and access permissions into named field changes', () => {
  const view = presentAuditLog(log([{ field: 'variants', before: [{ _id: 'v1', name: '5m', standardPrice: 150, stockQuantity: 5 }], after: [{ _id: 'v1', name: '5m', standardPrice: 175, stockQuantity: 7 }] }, { field: 'permissions.products.write', before: false, after: true }]));
  expect(view.records[0].changes).toContainEqual({ field: 'Variants / 5m / Retail price', before: 'INR 150', after: 'INR 175' });
  expect(view.records[0].changes).toContainEqual({ field: 'Permissions / Products & inventory / Manage access', before: 'No', after: 'Yes' });
  expect(JSON.stringify(view)).not.toContain('"_id"');
});
test('creation and deletion flatten business snapshots while omitting internal fields and redacting secrets', () => {
  const snapshot = { _id: 'internal-id', __v: 2, name: 'Ethernet cable', passwordHash: 'private-hash', updatedAt: 'internal-date', variants: [{ name: '5m', standardPrice: 10 }] };
  for (const removing of [false, true]) {
    const source = log([{ field: '$document', before: removing ? snapshot : null, after: removing ? null : snapshot }]);
    source.documents[0].before = removing ? snapshot : null; source.documents[0].after = removing ? null : snapshot;
    const view = presentAuditLog(source); expect(view.action).toBe(removing ? 'Deleted' : 'Created');
    const text = JSON.stringify(view); expect(text).not.toContain('private-hash'); expect(text).not.toContain('internal-date'); expect(text).not.toContain('internal-id');
    expect(view.records[0].changes.some(c => c.field === 'Password')).toBe(true);
  }
});
test('references resolve to record names and product names survive deletion', () => {
  const source = log([{ field: 'categoryId', before: '507f1f77bcf86cd799439012', after: '507f1f77bcf86cd799439013' }]);
  source.documents[0].after = null;
  const view = presentAuditLog(source, { '507f1f77bcf86cd799439012': 'Cables', '507f1f77bcf86cd799439013': 'Networking' });
  expect(view.summary).toBe('Deleted Ethernet cable (CAT6)');
  expect(view.records[0].changes[0]).toEqual({ field: 'Category', before: 'Cables', after: 'Networking' });
});
test('IST date filters are independent of the browser timezone and daily hour filters are preserved', () => {
  expect(auditRequestParams({ search: 'Cable', from: '2026-11-07', to: '2026-11-07', startTime: '12:00', endTime: '18:00' }, 2)).toEqual({ page: 2, search: 'Cable', from: '2026-11-06T18:30:00.000Z', to: '2026-11-07T18:29:59.999Z', startTime: '12:00', endTime: '18:00' });
  expect(() => auditRequestParams({ from: '2026-11-08', to: '2026-11-07' })).toThrow();
});
test('backend daily time windows use IST with inclusive minute bounds, including overnight ranges', () => {
  const filter = buildAuditFilter(logQuery.parse({ startTime: '12:00', endTime: '18:00', search: 'Ethernet.*' }));
  expect(filter.$expr.$and).toHaveLength(2);
  expect(filter.$expr.$and[0].$gte[0].$dateToString.timezone).toBe('Asia/Kolkata');
  expect(filter.$expr.$and[0].$gte[1]).toBe('12:00'); expect(filter.$expr.$and[1].$lte[1]).toBe('18:00');
  expect(filter.$or.some(condition => condition['documents.before.name'])).toBe(true);
  expect(filter.$or[0]['actor.name'].source).toBe('Ethernet\\.\\*');
  expect(buildAuditFilter(logQuery.parse({ startTime: '22:00', endTime: '06:00' })).$expr.$or).toHaveLength(2);
});
test('malformed times, dates, actor IDs and inverted date ranges are rejected', () => {
  for (const query of [{ startTime: '24:00' }, { endTime: '12:60' }, { from: 'yesterday' }, { actorId: 'bad' }, { from: '2026-11-08T00:00:00Z', to: '2026-11-07T00:00:00Z' }]) expect(logQuery.safeParse(query).success).toBe(false);
});

test('bulk changes have compact summaries and avoid repeating model numbers in product names', () => {
  const source = log([]); source.documents = Array.from({ length: 91 }, (_, n) => ({ id: String(n), before: { name: `Camera ${n} (MODEL${n})`, modelNumber: `MODEL${n}` }, after: { name: `Camera ${n} (MODEL${n})`, modelNumber: `MODEL${n}` }, changes: [] }));
  const view = presentAuditLog(source); expect(view.recordCount).toBe(91); expect(view.summary).toBe('Updated 91 product records');
  expect(view.summary.length).toBeLessThan(70); expect(view.records[0].label).toBe('Camera 0 (MODEL0)');
});
