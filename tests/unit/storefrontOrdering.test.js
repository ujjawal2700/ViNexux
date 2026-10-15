import { afterEach, expect, jest, test } from '@jest/globals';
import { categoryProductPriorities } from '../../backend/src/utils/storefrontOrdering.js';
import { getPublicProducts } from '../../backend/src/services/catalog.service.js';
import { Category } from '../../backend/src/models/Category.js';
import { Product } from '../../backend/src/models/Product.js';
import { ProductPositionCounter } from '../../backend/src/models/ProductPositionCounter.js';
import { updateProductPositioning } from '../../backend/src/services/productPositioning.service.js';
import { invalidateCategoryCache } from '../../backend/src/utils/categoryCache.js';
import { productPositioningSchema, getProductsQuerySchema, updateProductSchema } from '../../backend/src/validators/product.validator.js';
import { updateCategorySchema } from '../../backend/src/validators/category.validator.js';
import { compareHeaderProductPositions } from '../../shared/headerProductPositioning.js';

const id = () => new Product.base.Types.ObjectId();
const root = id(), child = id(), leaf = id(), other = id(), last = id();
const categories = [
  { _id: root, name: 'Cameras', slug: 'cameras', productPriority: 1, productPositionSequence: 20 },
  { _id: child, parentId: root, name: 'Indoor', slug: 'indoor' },
  { _id: leaf, parentId: { _id: child }, name: 'Dome', slug: 'dome', productPriority: 0 },
  { _id: other, name: 'Cables', slug: 'cables', productPriority: 1, productPositionSequence: 10 },
  { _id: last, name: 'Storage', slug: 'storage' },
];
afterEach(() => { jest.restoreAllMocks(); invalidateCategoryCache(); });

test('same-number headers follow assignment order and all descendants follow only their header', () => {
  expect(categoryProductPriorities(categories).map(row => row.priority)).toEqual([1, 1, 1, 0, 3]);
  expect([...categories.filter(row => !row.parentId)].sort(compareHeaderProductPositions).map(row => row.name)).toEqual(['Cables', 'Cameras', 'Storage']);
  const changed = categories.map(row => row._id === root ? { ...row, productPriority: 0 } : row);
  expect(categoryProductPriorities(changed).map(row => row.priority)).toEqual([0, 0, 0, 1, 3]);
  expect(categoryProductPriorities([{ _id: root, parentId: child }, { _id: child, parentId: root }])).toHaveLength(2);
});

test.each([-1, 0.5, 1000001, '2', undefined])('rejects invalid position %s', value => {
  expect(productPositioningSchema.body.safeParse({ productPriority: value }).success).toBe(false);
});
test.each([0, 1, null])('accepts a position or clearing: %s', value => {
  expect(productPositioningSchema.body.parse({ productPriority: value }).productPriority).toBe(value);
});
test('generic product/category editors cannot change product positioning', () => {
  expect(updateProductSchema.body.parse({ homepageOrder: 1 })).toEqual({});
  expect(updateCategorySchema.body.parse({ productPriority: 1, productPositionSequence: 1 })).toEqual({});
  expect(getProductsQuerySchema.query.parse({ sortBy: 'categoryPriority' }).sortBy).toBe('categoryPriority');
});

test('unchanged position preserves assignment order', async () => {
  const category = categories[0];
  jest.spyOn(Category, 'findOne').mockReturnValue({ lean: async () => category });
  const counter = jest.spyOn(ProductPositionCounter, 'findOneAndUpdate');
  const update = jest.spyOn(Category, 'findOneAndUpdate');
  expect(await updateProductPositioning(root, 1)).toBe(category);
  expect(counter).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});

test('changing position allocates a new atomic assignment sequence and guards concurrent edits', async () => {
  const category = categories[0];
  jest.spyOn(Category, 'findOne').mockReturnValue({ lean: async () => category });
  const counter = jest.spyOn(ProductPositionCounter, 'findOneAndUpdate').mockResolvedValue({ sequence: 21 });
  const update = jest.spyOn(Category, 'findOneAndUpdate').mockResolvedValue({ ...category, productPriority: 2, productPositionSequence: 21 });
  expect((await updateProductPositioning(root, 2)).productPositionSequence).toBe(21);
  expect(counter).toHaveBeenCalledWith({ _id: 'header-product-position' }, { $inc: { sequence: 1 } }, { upsert: true, new: true });
  expect(update).toHaveBeenCalledWith({ _id: root, parentId: null, productPriority: 1, productPositionSequence: 20 }, { $set: { productPriority: 2, productPositionSequence: 21 } }, { new: true, runValidators: true });
});

test('clearing removes the position and sequence without allocating a new one', async () => {
  jest.spyOn(Category, 'findOne').mockReturnValue({ lean: async () => categories[0] });
  const counter = jest.spyOn(ProductPositionCounter, 'findOneAndUpdate');
  const update = jest.spyOn(Category, 'findOneAndUpdate').mockResolvedValue({});
  await updateProductPositioning(root, null);
  expect(counter).not.toHaveBeenCalled();
  expect(update.mock.calls[0][1]).toEqual({ $set: { productPriority: null, productPositionSequence: null } });
});

test('a repeated concurrent write rereads the header and preserves the first successful assignment', async () => {
  jest.spyOn(Category, 'findOne').mockReturnValueOnce({ lean: async () => categories[0] })
    .mockReturnValueOnce({ lean: async () => ({ ...categories[0], productPriority: 2, productPositionSequence: 21 }) });
  jest.spyOn(ProductPositionCounter, 'findOneAndUpdate').mockResolvedValue({ sequence: 22 });
  jest.spyOn(Category, 'findOneAndUpdate').mockResolvedValue(null);
  expect((await updateProductPositioning(root, 2)).productPositionSequence).toBe(21);
});

test('only header categories can be positioned', async () => {
  const read = jest.spyOn(Category, 'findOne').mockReturnValue({ lean: async () => null });
  await expect(updateProductPositioning(child, 1)).rejects.toThrow('Header category not found');
  expect(read).toHaveBeenCalledWith({ _id: child, parentId: null });
});

test.each([undefined, 'categoryPriority', 'standardPrice', 'createdAt'])('catalog sorts before pagination and preserves customer sorting: %s', async sortBy => {
  invalidateCategoryCache();
  jest.spyOn(Category, 'find').mockReturnValue({ sort: () => ({ lean: async () => categories.map(row => ({ ...row, parentId: row.parentId?._id || row.parentId })) }) });
  const aggregate = jest.spyOn(Product, 'aggregate').mockResolvedValue([{ products: [], total: [{ count: 30 }] }]);
  const result = await getPublicProducts({ sortBy, includeFacets: false, page: 2, limit: 10 });
  expect(result.pagination.total).toBe(30);
  const stages = aggregate.mock.calls[0][0].at(-1).$facet.products;
  const sort = stages.findIndex(stage => stage.$sort);
  expect(sort).toBeLessThan(stages.findIndex(stage => stage.$skip));
  expect(stages.find(stage => stage.$skip)).toEqual({ $skip: 10 });
  if (!sortBy || sortBy === 'categoryPriority') {
    expect(stages[sort].$sort).toEqual({ _categoryPriority: 1, createdAt: -1, _id: 1 });
    expect(stages[sort - 1].$set._categoryPriority.$min.map(branch => branch.$cond[1])).toEqual([1, 1, 1, 0, 3]);
  } else {
    expect(stages[sort].$sort).toEqual({ [sortBy === 'standardPrice' ? 'applicablePrice' : sortBy]: -1, _id: 1 });
  }
  expect(stages.at(-1).$unset).toContain('_categoryPriority');
});
