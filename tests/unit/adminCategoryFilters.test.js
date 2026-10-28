import { afterEach, expect, jest, test } from '@jest/globals';
import { productService } from '../../backend/src/services/product.service.js';
import { Product } from '../../backend/src/models/Product.js';
import { Category } from '../../backend/src/models/Category.js';
import { getProductsQuerySchema } from '../../backend/src/validators/product.validator.js';
import { posSaleSchema } from '../../backend/src/validators/pos.validator.js';
import { posInput } from '../helpers/posFixture.js';

const ids = ['11', '12', '13', '14'].map(suffix => `507f1f77bcf86cd7994390${suffix}`);
afterEach(() => jest.restoreAllMocks());

test('admin category levels combine with AND, including all selected branches and descendants', async () => {
  jest.spyOn(Category, 'find').mockReturnValue({ select: () => ({ lean: async () => [
    { _id: ids[0], parentId: null }, { _id: ids[1], parentId: null },
    { _id: ids[2], parentId: ids[1] }, { _id: ids[3], parentId: ids[2] },
  ] }) });
  const chain = {};
  for (const key of ['populate', 'sort', 'skip', 'limit', 'select']) chain[key] = () => chain;
  chain.lean = async () => [];
  const find = jest.spyOn(Product, 'find').mockReturnValue(chain);
  const count = jest.spyOn(Product, 'countDocuments').mockResolvedValue(0);
  const query = getProductsQuerySchema.query.parse({ headerCategoryIds: ids.slice(0, 2).join(','), mainCategoryIds: ids[2] });
  await productService.getProducts(query);
  const filter = find.mock.calls[0][0];
  expect(filter.$and).toHaveLength(2);
  expect(filter.$and[0].$or[0].categoryId.$in.map(String)).toEqual(expect.arrayContaining(ids));
  expect(filter.$and[1].$or[0].categoryId.$in.map(String).sort()).toEqual(ids.slice(2).sort());
  expect(filter.$and[1].$or[1].categoryIds.$in.map(String).sort()).toEqual(ids.slice(2).sort());
  expect(count).toHaveBeenCalledWith(filter);
});

test('category query rejects malformed IDs', () => {
  expect(getProductsQuerySchema.query.safeParse({ headerCategoryIds: `${ids[0]},invalid` }).success).toBe(false);
});

test('sale validation preserves B2B and defaults older bills to B2C', () => {
  expect(posSaleSchema.parse(posInput({ billType: 'b2b' })).billType).toBe('b2b');
  expect(posSaleSchema.parse(posInput()).billType).toBe('b2c');
  expect(posSaleSchema.safeParse(posInput({ billType: 'other' })).success).toBe(false);
});
