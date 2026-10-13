import { afterEach, expect, jest, test } from '@jest/globals';
import { Product } from '../../backend/src/models/Product.js';
import productService from '../../backend/src/services/product.service.js';
import { createProductSchema, updateProductSchema } from '../../backend/src/validators/product.validator.js';
import { getProductHsnCode } from '../../shared/productHsn.js';
import ExcelJS from '../../backend/node_modules/exceljs/excel.js';
import { Category } from '../../backend/src/models/Category.js';
import { Brand } from '../../backend/src/models/Brand.js';
import { invalidateCategoryCache } from '../../backend/src/utils/categoryCache.js';
import { createProductImportTemplate, prepareProductImport } from '../../backend/src/services/productImport.service.js';

afterEach(() => jest.restoreAllMocks());

test('product HSN validation preserves leading zeros and accepts blank codes', () => {
  for (const schema of [createProductSchema.body.shape.hsnCode, updateProductSchema.body.shape.hsnCode]) {
    expect(schema.parse(' 012345 ')).toBe('012345');
    expect(schema.parse('')).toBe('');
    expect(schema.parse(undefined)).toBeUndefined();
    for (const value of ['123', '123456789', '12AB56']) expect(schema.safeParse(value).success).toBe(false);
  }
  const product = new Product({ sku: 'HSN-TEST', name: 'Test product', hsnCode: '012345' });
  expect(product.validateSync()).toBeUndefined();
  expect(product.hsnCode).toBe('012345');
  product.hsnCode = 'invalid';
  expect(product.validateSync().errors.hsnCode).toBeDefined();
});

test('billing and details prefer the dedicated code and fall back to legacy specifications', () => {
  const specifications = [{ key: 'HSN Code', value: '012345' }];
  expect(getProductHsnCode({ hsnCode: '87654321', specifications })).toBe('87654321');
  expect(getProductHsnCode({ specifications })).toBe('012345');
  expect(getProductHsnCode({ specifications: [{ key: 'HSN/SAC', value: '1234' }] })).toBe('1234');
  expect(getProductHsnCode({})).toBe('');
});

test('editing a product persists and clears its dedicated HSN code', async () => {
  const product = Product.hydrate({ _id: '507f1f77bcf86cd799439011', sku: 'HSN-TEST',
    name: 'Test product', modelNumber: 'HSN-01', specifications: [], images: [], hsnCode: '1234' });
  jest.spyOn(Product, 'findById').mockResolvedValue(product);
  jest.spyOn(product, 'save').mockResolvedValue(product);
  await productService.updateProduct(String(product._id), { hsnCode: ' 012345 ' });
  expect(product.hsnCode).toBe('012345');
  expect(product.save).toHaveBeenCalled();
  await productService.updateProduct(String(product._id), { hsnCode: '' });
  expect(product.hsnCode).toBe('');
});

test('downloaded template imports HSN codes as text and still accepts its previous format', async () => {
  invalidateCategoryCache();
  const query = { lean: async () => [], sort() { return this; } };
  jest.spyOn(Category, 'find').mockReturnValue(query);
  jest.spyOn(Brand, 'find').mockReturnValue(query);
  jest.spyOn(Product, 'find').mockReturnValue(query);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(await createProductImportTemplate()));
  const sheet = workbook.getWorksheet('Products');
  expect(sheet.getCell('O1').value).toBe('HSN Code (Optional)');
  expect(sheet.getColumn('O').numFmt).toBe('@');
  expect(sheet.autoFilter).toEqual('A1:O1');
  const row = (model, code) => [model, 'Test product', 'Test brand', '', '', '', 100, 90, 2, '', '', '', '', '', code];
  sheet.addRow(row('MODEL-1', '012345'));
  sheet.addRow(row('MODEL-2', '12AB'));
  sheet.addRow(row('MODEL-3', ''));
  const prepared = await prepareProductImport(Buffer.from(await workbook.xlsx.writeBuffer()));
  expect(prepared.rows[0].payload.hsnCode).toBe('012345');
  expect(prepared.rows[0].errors).toEqual([]);
  expect(prepared.rows[1].errors.join(' ')).toContain('hsnCode');
  expect(prepared.rows[2].errors).toEqual([]);
  const previousWorkbook = new ExcelJS.Workbook();
  const previousSheet = previousWorkbook.addWorksheet('Products');
  previousSheet.addRow(sheet.getRow(1).values.slice(1, -1));
  previousSheet.addRow(row('OLD-MODEL', '').slice(0, -1));
  const previous = await prepareProductImport(Buffer.from(await previousWorkbook.xlsx.writeBuffer()));
  expect(previous.rows[0].errors).toEqual([]);
  expect(previous.rows[0].payload.hsnCode).toBe('');
  invalidateCategoryCache();
});
