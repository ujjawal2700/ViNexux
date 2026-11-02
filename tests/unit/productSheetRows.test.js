import { describe, expect, test } from '@jest/globals';
import { COLUMNS, HEADERS, createReferences, exportProductRow, parseProductRow, productValues, mergeSheetChanges, validateSheetPayload } from '../../backend/src/services/googleSheets/productSheetRows.js';
import { spreadsheetIdFrom } from '../../backend/src/services/googleSheets/productSheet.service.js';
const id = '507f1f77bcf86cd799439011';
const child = '507f1f77bcf86cd799439012';
const refs = createReferences([{ _id: id, name: 'Camera Brand', slug: 'camera-brand', isActive: true }], [{ _id: id, name: 'Security', slug: 'security' }, { _id: child, name: 'Cameras', slug: 'cameras', parentId: id }]);
const base = { _id: id, sku: 'CAM-1', name: 'Camera', modelNumber: 'MODEL-1', model: 'Mini', brandId: id, categoryId: child, categoryIds: [id, child],
  description: 'Camera details', standardPrice: 1500, dealerPrice: 1200, stockQuantity: 5, isActive: true,
  images: [{ url: 'https://example.com/camera.webp', publicId: 'stored-camera', altText: 'Front' }],
  specifications: [{ key: 'Resolution', value: '3MP' }], hsnCode: '012345', isNewArrival: true, warranty: '1 YEAR', updatedAt: new Date('2026-11-02T10:00:00Z') };
const set = (row, field, value) => { row[COLUMNS.findIndex(([, key]) => key === field)] = value; return row; };

describe('product Google Sheet row format', () => {
  test('round-trips every editable field, leading zeros, categories and selection flags', () => {
    const row = exportProductRow(base, refs);
    expect(row).toHaveLength(HEADERS.length);
    expect(row).toContain('Security / Cameras');
    expect(row).toContain('012345');
    const parsed = parseProductRow(row, refs);
    expect(parsed.id).toBe(id);
    expect(parsed.payload).toEqual(productValues(base));
    expect(validateSheetPayload(parsed.payload, base).images[0]).toMatchObject(base.images[0]);
  });
  test('exports blank draft identifiers without leaking generated values into the editable columns', () => {
    const values = productValues({ isActive: false, sku: `__DRAFT__${id}`, modelNumber: `__DRAFT__${id}` });
    expect(values.sku).toBe(''); expect(values.modelNumber).toBe('');
  });
  test('merges independent catalogue edits, skips unchanged prices and detects overlapping changes', () => {
    const baseline = productValues(base);
    const incoming = { ...baseline, standardPrice: 1800 };
    const current = { ...baseline, description: 'Edited in catalogue' };
    expect(mergeSheetChanges(current, baseline, incoming)).toEqual({ standardPrice: 1800 });
    expect(() => mergeSheetChanges({ ...current, standardPrice: 1600 }, baseline, incoming)).toThrow('Standard Price');
    expect(mergeSheetChanges(incoming, baseline, incoming)).toEqual({});
  });
  test('blank new rows default to draft but require a stable SKU for safe retries', () => {
    const row = Array(HEADERS.length).fill('');
    const payload = parseProductRow(set(row, 'sku', 'new-1'), refs).payload;
    expect(payload.isActive).toBe(false); expect(payload.standardPrice).toBe(0);
    expect(validateSheetPayload(payload).sku).toBe('NEW-1');
    expect(() => validateSheetPayload({ ...payload, sku: '' })).toThrow('unique SKU');
  });
  test.each([['stockQuantity', '1.5'], ['dealerPrice', 'oops'], ['standardPrice', '-1'], ['isActive', 'maybe'], ['isTrending', 'perhaps'], ['specifications', '{'], ['brandId', 'Unknown brand'], ['id', 'invalid']])('rejects malformed %s without modifying the product', (field, value) => {
    expect(() => parseProductRow(set(exportProductRow(base, refs), field, value), refs)).toThrow();
  });
  test('only new image URLs must be HTTP links and retained image metadata survives reordering', () => {
    expect(() => validateSheetPayload({ images: ['javascript:bad'] }, base)).toThrow('http');
    const legacy = { ...base, images: [{ url: '/legacy/camera.webp', publicId: 'legacy' }] };
    expect(validateSheetPayload({ images: ['/legacy/camera.webp'] }, legacy).images[0].publicId).toBe('legacy');
  });
  test('accepts only real Google Sheets URLs or IDs', () => {
    const sheet = 'example-spreadsheet-id-12345';
    expect(spreadsheetIdFrom(sheet)).toBe(sheet);
    expect(spreadsheetIdFrom(`https://docs.google.com/spreadsheets/d/${sheet}/edit#gid=1`)).toBe(sheet);
    expect(() => spreadsheetIdFrom(`https://evil.example/spreadsheets/d/${sheet}/edit`)).toThrow();
    expect(() => spreadsheetIdFrom('http://127.0.0.1')).toThrow();
  });
});
