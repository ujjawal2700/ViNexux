import { describe, expect, test } from '@jest/globals';
import { createProductSchema, updateProductSchema } from '../../backend/src/validators/product.validator.js';
import { Product } from '../../backend/src/models/Product.js';

const base = { name: 'Camera', sku: 'CAM-1', modelNumber: 'CAM-1', brandId: '507f1f77bcf86cd799439011' };
const details = [{ key: ' Country of origin ', value: ' India ' }];

describe('Additional product fields', () => {
  test('create and update accept and trim fields; clearing is explicit and omission preserves existing fields', () => {
    expect(createProductSchema.body.parse({ ...base, additionalDetails: details }).additionalDetails).toEqual([{ key: 'Country of origin', value: 'India' }]);
    expect(updateProductSchema.body.parse({ additionalDetails: details }).additionalDetails).toEqual([{ key: 'Country of origin', value: 'India' }]);
    expect(updateProductSchema.body.parse({ additionalDetails: [] }).additionalDetails).toEqual([]);
    expect(updateProductSchema.body.parse({ name: 'New camera' })).not.toHaveProperty('additionalDetails');
    expect(createProductSchema.body.parse(base).additionalDetails).toEqual([]);
  });
  test('rejects incomplete, oversized or excessive fields', () => {
    for (const additionalDetails of [[{ key: ' ', value: 'India' }], [{ key: 'Origin', value: '' }],
      [{ key: 'x'.repeat(101), value: 'India' }], [{ key: 'Origin', value: 'x'.repeat(2001) }],
      Array.from({ length: 31 }, () => ({ key: 'Origin', value: 'India' }))]) {
      expect(updateProductSchema.body.safeParse({ additionalDetails }).success).toBe(false);
    }
  });
  test('database schema retains fields and defaults legacy products to an empty list', () => {
    const product = new Product({ ...base, additionalDetails: details });
    expect(product.validateSync()).toBeUndefined();
    expect(product.toObject().additionalDetails).toEqual([{ key: 'Country of origin', value: 'India' }]);
    expect(new Product(base).toObject().additionalDetails).toEqual([]);
  });
});
