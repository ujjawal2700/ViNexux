import { describe, expect, test } from '@jest/globals';
import { slugify, cleanCategorySlug } from '../../frontend/src/utils/categoryUrls.js';
import { sanitizeCategorySlug } from '../../backend/src/services/category.service.js';
import { createProductSchema, updateProductSchema } from '../../backend/src/validators/product.validator.js';

describe('Category slug generation and cleaning', () => {
  test('slugify generates kebab-case slug from name', () => {
    expect(slugify('Network Switches')).toBe('network-switches');
    expect(slugify('IP Cameras & NVRs')).toBe('ip-cameras-and-nvrs');
    expect(slugify('PoE Switches 24-Port')).toBe('poe-switches-24-port');
    expect(slugify('Access Points (Wi-Fi 6)')).toBe('access-points-wi-fi-6');
  });

  test('cleanCategorySlug removes URLs, protocols, and leading slashes', () => {
    expect(cleanCategorySlug('https://example.com/network-switches')).toBe('network-switches');
    expect(cleanCategorySlug('/catalog/switches/')).toBe('switches');
    expect(cleanCategorySlug('http://localhost:5173/products')).toBe('products');
    expect(cleanCategorySlug('my-custom-slug')).toBe('my-custom-slug');
  });

  test('backend sanitizeCategorySlug handles arbitrary input and full URLs', () => {
    expect(sanitizeCategorySlug('CCTV Cameras', 'https://example.com/cctv-cameras')).toBe('cctv-cameras');
    expect(sanitizeCategorySlug('Network Routers & Firewalls', '')).toBe('network-routers-and-firewalls');
    expect(sanitizeCategorySlug('Servers', '/hardware/servers/')).toBe('servers');
    expect(sanitizeCategorySlug('', '')).toBe('');
    expect(sanitizeCategorySlug(null, null)).toBe('');
  });
});

describe('Product multi-category schema validation', () => {
  const validMongoId1 = '507f1f77bcf86cd799439011';
  const validMongoId2 = '507f1f77bcf86cd799439012';
  const validMongoId3 = '507f1f77bcf86cd799439013';

  test('createProductSchema accepts categoryIds array', () => {
    const validData = {
      sku: 'TEST-SKU-01',
      name: 'High Performance Switch',
      modelNumber: 'SW-100',
      brandId: validMongoId1,
      categoryId: validMongoId1,
      categoryIds: [validMongoId1, validMongoId2, validMongoId3],
    };

    const parsed = createProductSchema.body.safeParse(validData);
    expect(parsed.success).toBe(true);
    expect(parsed.data.categoryIds).toEqual([validMongoId1, validMongoId2, validMongoId3]);
  });

  test('createProductSchema rejects invalid ObjectId in categoryIds', () => {
    const invalidData = {
      sku: 'TEST-SKU-02',
      name: 'High Performance Router',
      modelNumber: 'RT-200',
      brandId: validMongoId1,
      categoryIds: ['invalid-mongo-id'],
    };

    const parsed = createProductSchema.body.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });

  test('updateProductSchema accepts optional categoryIds array', () => {
    const validUpdate = {
      params: { id: validMongoId1 },
      body: {
        categoryIds: [validMongoId2, validMongoId3],
      },
    };

    const parsedParams = updateProductSchema.params.safeParse(validUpdate.params);
    const parsedBody = updateProductSchema.body.safeParse(validUpdate.body);
    expect(parsedParams.success).toBe(true);
    expect(parsedBody.success).toBe(true);
  });
});
