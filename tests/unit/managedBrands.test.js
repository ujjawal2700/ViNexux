import { afterEach, expect, jest, test } from '@jest/globals';
import { Brand } from '../../backend/src/models/Brand.js';
import { Category } from '../../backend/src/models/Category.js';
import { Product } from '../../backend/src/models/Product.js';
import { getPublicBrands } from '../../backend/src/services/catalog.service.js';
import { invalidateCategoryCache } from '../../backend/src/utils/categoryCache.js';

afterEach(() => { jest.restoreAllMocks(); invalidateCategoryCache(); });

test('public directory contains only active managed brands with linked product counts', async () => {
  invalidateCategoryCache();
  jest.spyOn(Category, 'find').mockReturnValue({ sort: () => ({ lean: async () => [] }) });
  const find = jest.spyOn(Brand, 'find').mockReturnValue({ sort: () => ({ lean: async () => [
    { _id: 'managed', name: 'Managed Brand', slug: 'managed-brand', isActive: true },
  ] }) });
  const aggregate = jest.spyOn(Product, 'aggregate').mockImplementation(async pipeline => {
    // A specification-based aggregation would invent an unmanaged brand.
    return pipeline.some(stage => stage.$group?._id === '$brandKey')
      ? [{ _id: 'HONEYLINK', count: 1 }]
      : [{ _id: 'managed', count: 2 }, { _id: null, count: 1 }];
  });
  expect(await getPublicBrands()).toEqual([
    { _id: 'managed', name: 'Managed Brand', slug: 'managed-brand', isActive: true, count: 2 },
  ]);
  expect(find).toHaveBeenCalledWith({ isActive: true });
  expect(aggregate).toHaveBeenCalledTimes(1);
});
