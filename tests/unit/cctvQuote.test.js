import { describe, expect, test } from '@jest/globals';
import { calculateCctvQuote, accessoryDefinitions, cameraOptions } from '../../shared/cctvQuote.js';
import { inferQuotationClassification } from '../../backend/src/services/cctvQuoteCatalog.service.js';
import { createCctvQuoteSchema, quoteSelection } from '../../backend/src/validators/cctvQuote.validator.js';
import { cctvCatalog as catalog, quoteSelectionFixture as selection, quoteSettingsFixture as settings, quoteCustomerFixture as customer } from '../fixtures/cctvQuote.js';

describe('CCTV quotation calculations', () => {
  test('matches the reference WiFi total with separate dome and bullet cameras', () => {
    const result = calculateCctvQuote(catalog, selection, settings);
    expect(result.priced).toBe(true); expect(result.lines).toHaveLength(3);
    expect(result.lines[0]).toMatchObject({ quantity: 2, unitPrice: 2599, amount: 5198 });
    expect(result).toMatchObject({ subtotal: 14520, cgst: 1306.8, sgst: 1306.8, igst: 0, roundOff: .4, total: 17134 });
  });
  test('HD includes a correctly sized recorder, HDD, power supply and rack', () => {
    const result = calculateCctvQuote(catalog, { ...selection, systemType: 'HD' }, settings);
    expect(result.priced).toBe(true);
    expect(result.lines.map(line => line.name)).toEqual(expect.arrayContaining(['CP Plus 4CH DVR', 'Seagate Surveillance 1TB Hard Disk', 'CP Plus Premium 4CH Power Supply', '4U Rack']));
    expect(result.lines.some(line => line.name.includes('Micro SD'))).toBe(false);
    expect(result.subtotal).toBe(12500); expect(result.total).toBe(14750);
  });
  test('IP uses an NVR and PoE with sufficient capacity and no default power supply', () => {
    const result = calculateCctvQuote(catalog, { ...selection, systemType: 'IP', domeCount: 4, bulletCount: 0 }, settings);
    expect(result.priced).toBe(true);
    expect(result.lines.some(line => line.name === 'CP Plus 8CH NVR')).toBe(true);
    expect(result.lines.some(line => line.name === '8 Port PoE Switch')).toBe(true);
    expect(result.lines.some(line => line.name.includes('Power Supply'))).toBe(false);
  });
  test('insufficient stock, missing compatible cameras/recorders and unknown prices become manual requests', () => {
    const low = catalog.map(item => ({ ...item, stock: item.kind === 'camera' ? 3 : 100 }));
    expect(calculateCctvQuote(low, { ...selection, domeKey: catalog[0].key, bulletKey: catalog[0].key }, settings)).toMatchObject({ priced: false, total: null });
    expect(calculateCctvQuote(catalog, { ...selection, systemType: 'HD', domeCount: 5, bulletCount: 0 }, settings).reasons.join(' ')).toContain('recorder');
    expect(calculateCctvQuote(catalog.map(item => ({ ...item, price: 0 })), selection, settings).priced).toBe(false);
    expect(calculateCctvQuote([], selection, settings).priced).toBe(false);
  });
  test('rejects forged cross-system products and invalid quantities', () => {
    expect(calculateCctvQuote(catalog, { ...selection, domeKey: catalog[2].key }, settings).issues).not.toHaveLength(0);
    for (const value of [-1, 1.5, 51]) expect(quoteSelection.safeParse({ ...selection, domeCount: value }).success).toBe(false);
    expect(quoteSelection.safeParse({ ...selection, domeCount: 50, bulletCount: 50 }).success).toBe(false);
    expect(createCctvQuoteSchema.body.safeParse({ selection, customer, requestId: 'valid-request-id-1234', total: 1 }).success).toBe(false);
  });
  test('optional accessories can be removed and standalone SD quantity remains tied to cameras', () => {
    const result = calculateCctvQuote(catalog, { ...selection, systemType: 'HD', accessories: { rack: { included: false } } }, settings);
    expect(result.priced).toBe(true); expect(result.lines.some(line => line.name === '4U Rack')).toBe(false);
    expect(accessoryDefinitions(catalog, selection)[0].fixedQty).toBe(4);
    expect(calculateCctvQuote(catalog, { ...selection, accessories: { storage: { included: false } } }, settings).lines.some(line => line.name.includes('Micro SD'))).toBe(true);
  });
  test('installation is itemized only when configured; interstate tax and fractional rounding are consistent', () => {
    const result = calculateCctvQuote(catalog, { ...selection, state: 'Gujarat' }, { ...settings, installationPerCamera: 100 });
    expect(result.lines.at(-1)).toMatchObject({ name: 'Installation service', quantity: 4, amount: 400 });
    expect(result).toMatchObject({ subtotal: 14920, cgst: 0, sgst: 0, igst: 2685.6, total: 17606 });
  });
  test('guest catalogue has no item prices and cannot produce a priced quote', () => {
    const hidden = catalog.map(({ price, ...row }) => row);
    expect(calculateCctvQuote(hidden, selection, settings)).toMatchObject({ priced: false, total: null });
  });
});

test.each([
  ['4CH DVR H.265', 'dvr', 4], ['NVR 16 Channel', 'nvr', 16], ['8 Port PoE Switch', 'poe', 8], ['Surveillance HDD 2TB', 'hdd', 2000], ['Micro SD Card 128GB', 'memory', 128], ['4CH CCTV Power Supply', 'power', 4],
])('recognizes %s and preserves its capacity', (name, kind, capacity) => {
  expect(inferQuotationClassification({ name })).toMatchObject({ kind, capacity });
});

test('automatic recommendations search across brands instead of locking to the first brand', () => {
  const firstBrandBullet = { ...catalog[3], key: 'first-bullet', brand: 'AAA Cameras', style: 'bullet', systemTypes: ['HD'] };
  const result = calculateCctvQuote([firstBrandBullet, ...catalog], { ...selection, systemType: 'HD', domeCount: 2, bulletCount: 0, brand: '' }, settings);
  expect(result.lines.some(line => line.name === catalog[2].name)).toBe(true);
  expect(result.reasons.some(reason => reason.startsWith('Dome camera'))).toBe(false);
  const restricted = calculateCctvQuote([firstBrandBullet, ...catalog], { ...selection, systemType: 'HD', domeCount: 2, bulletCount: 0, brand: 'AAA Cameras' }, settings);
  expect(restricted.reasons.join(' ')).toContain('Dome camera');
});

test.each([
  [{ name: 'Dahua Starlight IP Dome' }, [], 'IP', 'dome'],
  [{ name: 'Hikvision PoE Turret Camera' }, [], 'IP', 'dome'],
  [{ name: 'IR Dome', modelNumber: 'DS-2CE76D0T-ITPFS' }, [], 'HD', 'dome'],
  [{ name: 'IR Bullet', modelNumber: 'IPC-HFW1230S' }, [], 'IP', 'bullet'],
  [{ name: '2MP Dome Camera' }, ['HD Cameras'], 'HD', 'dome'],
  [{ name: '2MP Dome Camera', specifications: [{ key: 'Signal', value: 'AHD' }] }, [], 'HD', 'dome'],
  [{ name: '4G Camera' }, ['IP Cameras'], '4G', 'other'],
])('classifies model/specification/category evidence for %j', (product, categories, system, style) => {
  expect(inferQuotationClassification(product, categories)).toMatchObject({ kind: 'camera', systemTypes: [system], style });
});
test('does not guess analogue technology from Full HD resolution alone', () => {
  expect(inferQuotationClassification({ name: '2MP Dome', specifications: [{ key: 'Resolution', value: 'Full HD 1080p' }] })).toMatchObject({ kind: 'camera', systemTypes: [] });
});

test.each(['FYBER Mini UPS (Li-Ion)', '128GB SD Card for 4G Camera', 'MicroSD Memory Card', '4CH NVR for IP Cameras', '8CH DVR', '4G Router', 'Camera Power Adapter', 'Camera Junction Box'])('never treats accessory %s as a camera even in a 4G camera category', name => {
  expect(inferQuotationClassification({ name }, ['4G Dome Cameras'])?.kind).not.toBe('camera');
  const mistaken = { ...catalog[0], name, style: 'dome', kind: 'camera', systemTypes: ['4G'] };
  expect(cameraOptions([mistaken], { systemType: '4G' }, 'dome')).toEqual([]);
  const result = calculateCctvQuote([mistaken], { ...selection, systemType: '4G', domeCount: 1, bulletCount: 0, domeKey: mistaken.key }, settings);
  expect(result.issues).not.toHaveLength(0);
  expect(result.lines).toEqual([]);
});
test('unknown style and opposite camera styles are not substituted into dome or bullet choices', () => {
  const unknown = { ...catalog[0], style: 'other' };
  expect(cameraOptions([unknown], selection, 'dome')).toEqual([]);
  expect(cameraOptions([unknown], selection, 'bullet')).toEqual([]);
  expect(cameraOptions([catalog[0]], selection, 'bullet')).toEqual([]);
  expect(cameraOptions([catalog[0]], selection, 'dome')).toEqual([catalog[0]]);
});
test('camera storage specifications do not turn the actual camera into a memory card', () => {
  expect(inferQuotationClassification({ name: '4G Dome Camera', specifications: [{ key: 'Storage', value: 'Supports Micro SD Card' }] })).toMatchObject({ kind: 'camera', style: 'dome', systemTypes: ['4G'] });
  expect(inferQuotationClassification({ name: 'Unknown device' }, ['4G Cameras'])).toBeNull();
});
