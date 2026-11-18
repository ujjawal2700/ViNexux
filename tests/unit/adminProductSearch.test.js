import { afterEach, expect, jest, test } from '@jest/globals';
import { productService } from '../../backend/src/services/product.service.js';
import { Product } from '../../backend/src/models/Product.js';
import { Category } from '../../backend/src/models/Category.js';
afterEach(() => jest.restoreAllMocks());
for (const search of ['HL-106', 'Solar Triple Camera', 'OEM-9553', 'HoneyLink', 'CAM.[1]']) test(`admin catalogue searches names, SKUs and model fields for literal query ${search}`, async () => {
  jest.spyOn(Category, 'find').mockReturnValue({ select() { return this; }, lean: async () => [] });
  jest.spyOn(Product, 'find').mockReturnValue({ populate() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, select() { return this; }, lean: async () => [] });
  jest.spyOn(Product, 'countDocuments').mockResolvedValue(0);
  await productService.getProducts({ search });
  const conditions = Product.find.mock.calls[0][0].$and[0].$or;
  for (const key of ['name', 'sku', 'modelNumber', 'model', 'variants.sku', 'variants.modelNumber', 'variants.name']) {
    const expression = conditions.find(row => row[key])[key];
    expect(expression.test(`prefix ${search.toLowerCase()} suffix`)).toBe(true);
    if (search === 'CAM.[1]') expect(expression.test('CAMx1')).toBe(false);
  }
});
