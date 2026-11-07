import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { config } from '../../backend/src/config/env.js';
import { Product } from '../../backend/src/models/Product.js';
import { Brand } from '../../backend/src/models/Brand.js';
import { Category } from '../../backend/src/models/Category.js';
import { ProductSheetConnection, ProductSheetRecord } from '../../backend/src/models/ProductSheetConnection.js';
import { productService } from '../../backend/src/services/product.service.js';
import { productSheetService } from '../../backend/src/services/googleSheets/productSheet.service.js';
import { COLUMNS, HEADERS, createReferences, exportProductRow, productValues } from '../../backend/src/services/googleSheets/productSheetRows.js';
const id = '507f1f77bcf86cd799439011', nextId = '507f1f77bcf86cd799439012';
const originalEmail = config.googleServiceAccountEmail, originalKey = config.googleServiceAccountPrivateKey;
afterEach(() => { jest.restoreAllMocks(); config.googleServiceAccountEmail = originalEmail; config.googleServiceAccountPrivateKey = originalKey; });
function setup() {
  config.googleServiceAccountEmail = 'test@example.test'; config.googleServiceAccountPrivateKey = 'test';
  const refs = createReferences([{ _id: id, name: 'Brand', isActive: true }], [{ _id: id, name: 'Cameras', slug: 'cameras', isActive: true }]);
  const products = [{ _id: id, sku: 'CAM-1', name: 'Camera', modelNumber: 'CAM-1', brandId: id, categoryId: id, categoryIds: [id], images: [{ url: 'https://example.com/camera.webp' }], standardPrice: 100, dealerPrice: 80, stockQuantity: 5, isActive: true, updatedAt: new Date('2026-11-02T10:00:00Z') }];
  const state = { spreadsheetId: 'spreadsheet-test-id-12345', sheetTitle: 'ViNexus Products', sheetId: 1, referenceTitle: 'References', guideTitle: 'Guide', referenceSheetId: 2, guideSheetId: 3, initializedAt: new Date(), save: jest.fn().mockResolvedValue() };
  const baselines = new Map([[id, productValues(products[0])]]);
  const rows = [HEADERS, exportProductRow(products[0], refs)];
  jest.spyOn(ProductSheetConnection, 'updateOne').mockResolvedValue({ matchedCount: 1 });
  jest.spyOn(ProductSheetConnection, 'findOneAndUpdate').mockResolvedValue(state);
  jest.spyOn(ProductSheetRecord, 'find').mockImplementation(() => ({ lean: async () => [...baselines].map(([productId, baseline]) => ({ productId, baseline })) }));
  jest.spyOn(ProductSheetRecord, 'updateOne').mockImplementation(async (filter, update) => { baselines.set(String(filter.productId), update.$set.baseline); return {}; });
  jest.spyOn(ProductSheetRecord, 'bulkWrite').mockImplementation(async ops => { for (const { updateOne } of ops) baselines.set(String(updateOne.filter.productId), updateOne.update.$set.baseline); return {}; });
  jest.spyOn(Brand, 'find').mockReturnValue({ lean: async () => refs.brands });
  jest.spyOn(Category, 'find').mockReturnValue({ lean: async () => refs.categories });
  jest.spyOn(Product, 'find').mockImplementation(() => { const query = { lean: async () => products, sort: () => query }; return query; });
  const read = jest.fn(async () => ({ data: { values: rows.map(row => [...row]) } }));
  const write = jest.fn(async ({ requestBody }) => {
    for (const range of requestBody.data) {
      if (!range.range.startsWith("'ViNexus Products'!")) continue;
      const match = range.range.match(/!([A-Z]+)(\d+)/);
      const start = Number(match[2]) - 1;
      range.values.forEach((values, index) => {
        if (match[1] === 'AA') rows[start + index][26] = values[0];
        else rows[start + index] = [...values];
      });
    }
    return { data: {} };
  });
  const client = { spreadsheets: { values: { get: read, batchUpdate: write },
    get: jest.fn(async () => ({ data: { sheets: [{ properties: { sheetId: 1, title: state.sheetTitle, gridProperties: { rowCount: 1000 } } }] } })),
    batchUpdate: jest.fn(async () => ({ data: { replies: [1, 2, 3].map(sheetId => ({ addSheet: { properties: { sheetId } } })) } })),
  } };
  jest.spyOn(productSheetService, 'getClient').mockResolvedValue(client);
  const update = jest.spyOn(productService, 'updateProduct').mockImplementation(async (productId, payload) => {
    const product = products.find(item => item._id === productId);
    const { expectedUpdatedAt, expectedImages, ...changes } = payload;
    Object.assign(product, changes, { updatedAt: new Date() }); return product;
  });
  const create = jest.spyOn(productService, 'createProduct').mockImplementation(async payload => {
    const product = { ...payload, _id: nextId, updatedAt: new Date() }; products.push(product); return product;
  });
  const edit = (field, value, row = 1) => { rows[row][COLUMNS.findIndex(([, key]) => key === field)] = value; };
  return { products, state, baselines, rows, client, write, update, create, edit };
}

describe('Google product sheet sync', () => {
  test('applies sheet edits with actor and concurrency guard, merges unrelated catalogue changes', async () => {
    const { products, edit, update, rows } = setup();
    products[0].description = 'Changed in catalogue'; edit('standardPrice', 150);
    const actor = { _id: nextId, fullName: 'Admin' };
    const response = await productSheetService.sync(actor);
    expect(response.result).toMatchObject({ updated: 1, created: 0, failed: 0 });
    expect(update).toHaveBeenCalledWith(id, { standardPrice: 150, expectedUpdatedAt: expect.any(Date) }, actor);
    expect(rows[1][8]).toBe('Changed in catalogue'); expect(rows[1][9]).toBe(150);
    expect(response.busy).toBe(false);
  });
  test('conflicting edits are skipped, reported by row and never overwrite the catalogue', async () => {
    const { products, edit, update, rows } = setup(); products[0].standardPrice = 125; edit('standardPrice', 150);
    const response = await productSheetService.sync({});
    expect(response.result.failed).toBe(1); expect(response.result.errors[0]).toMatchObject({ row: 2, sku: 'CAM-1' });
    expect(update).not.toHaveBeenCalled(); expect(rows[1][26]).toContain('Also edited in the catalogue');
  });
  test('new rows create products once; subsequent syncs are idempotent', async () => {
    const { rows, create } = setup(); const row = Array(HEADERS.length).fill(''); row[1] = 'NEW-1'; row[2] = 'New Camera'; rows.push(row);
    expect((await productSheetService.sync({})).result.created).toBe(1);
    expect(rows[2][0]).toBe(nextId); expect(rows[2][12]).toBe('Draft');
    expect((await productSheetService.sync({})).result.created).toBe(0);
    expect(create).toHaveBeenCalledTimes(1);
  });
  test('Google write failure after saving a product can be retried without duplicate changes', async () => {
    const { edit, write, update } = setup(); edit('standardPrice', 150); write.mockRejectedValueOnce(new Error('network failure'));
    await expect(productSheetService.sync({})).rejects.toThrow('Google Sheets could not be reached');
    expect((await productSheetService.sync({})).result).toMatchObject({ failed: 0, unchanged: 1 });
    expect(update).toHaveBeenCalledTimes(1);
  });
  test('a new product retries Google failures without treating server defaults as sheet edits', async () => {
    const { rows, create, update, write, products } = setup();
    const row = Array(HEADERS.length).fill(''); row[1] = 'NEW-1'; row[2] = 'New Camera'; rows.push(row);
    create.mockImplementation(async payload => {
      const product = { ...payload, _id: nextId, model: 'Standard Model', specifications: [{ key: 'Brand', value: 'Server Brand' }], updatedAt: new Date() };
      products.push(product); return product;
    });
    write.mockRejectedValueOnce(new Error('Google unavailable'));
    await expect(productSheetService.sync({})).rejects.toThrow('Google Sheets could not be reached');
    await productSheetService.sync({});
    expect(create).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
    expect(rows[2][4]).toBe('Standard Model');
    expect(rows[2][23]).toBe('[{"key":"Brand","value":"Server Brand"}]');
  });

  test('new catalogue products and removed rows are exported rather than deleted', async () => {
    const { products, rows } = setup(); rows.splice(1);
    const result = await productSheetService.sync({});
    expect(result.result.appended).toBe(1); expect(rows[1][0]).toBe(id); expect(products).toHaveLength(1);
  });
  test('duplicate IDs/SKUs abort before product mutation', async () => {
    const { rows, update, create } = setup(); rows.push([...rows[1]]);
    await expect(productSheetService.sync({})).rejects.toThrow('Duplicate Product ID or SKU');
    expect(update).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
  });
  test('bad headers abort before any product mutation', async () => {
    const { rows, update } = setup(); rows[0] = ['Wrong header'];
    await expect(productSheetService.sync({})).rejects.toThrow('headers changed'); expect(update).not.toHaveBeenCalled();
  });
  test('bad numeric rows are reported without blocking valid rows', async () => {
    const { edit, update } = setup(); edit('stockQuantity', 'invalid');
    expect((await productSheetService.sync({})).result.failed).toBe(1); expect(update).not.toHaveBeenCalled();
  });
  test('initialization creates isolated tabs and exports every current product, retaining the existing workbook', async () => {
    const { state, client, write, products } = setup(); state.initializedAt = null; state.sheetId = undefined;
    const response = await productSheetService.initialize('spreadsheet-test-id-12345');
    expect(client.spreadsheets.batchUpdate.mock.calls[0][0].requestBody.requests).toHaveLength(3);
    expect(write.mock.calls[0][0].requestBody.valueInputOption).toBe('RAW');
    expect(response.lastResult.exported).toBe(products.length); expect(response.connected).toBe(true);
  });
  test('concurrent sync attempts are rejected by the database lock', async () => {
    setup(); ProductSheetConnection.findOneAndUpdate.mockResolvedValue(null);
    await expect(productSheetService.sync({})).rejects.toMatchObject({ statusCode: 409 });
  });
  test('missing real credentials cannot silently use the development provider', async () => {
    setup(); config.googleServiceAccountPrivateKey = '';
    await expect(productSheetService.sync({})).rejects.toMatchObject({ statusCode: 503 });
    expect(productSheetService.getClient).not.toHaveBeenCalled();
  });
});


test('an older connected sheet gains the variants column without clearing products or applying blank option edits', async () => {
  const { rows, client, update, products } = setup();
  rows[0] = HEADERS.slice(0, -1); rows[1] = rows[1].slice(0, -1);
  const sku = products[0].sku;
  const result = await productSheetService.sync({ _id: id });
  expect(client.spreadsheets.batchUpdate).toHaveBeenCalledWith(expect.objectContaining({ requestBody: { requests: [{ appendDimension: { sheetId: 1, dimension: 'COLUMNS', length: 1 } }] } }), expect.anything());
  expect(result.result.failed).toBe(0); expect(products[0].sku).toBe(sku); expect(update).not.toHaveBeenCalled();
});
