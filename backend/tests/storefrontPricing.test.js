import test from 'node:test';
import assert from 'node:assert/strict';
import { getPublicProducts, getPublicProductById } from '../src/services/catalog.service.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { DealerProfile } from '../src/models/DealerProfile.js';
import { invalidateCategoryCache } from '../src/utils/categoryCache.js';
import { withoutStorefrontPrices } from '../../shared/storefrontPricing.js';

const id = '507f1f77bcf86cd799439011';
const product = {
  _id: id, name: 'Pricing test camera', standardPrice: 7891, dealerPrice: 6789,
  applicablePrice: 7891, price: 7891, priceHistory: [{ previousPrice: 7000 }],
  specifications: [{ key: 'Standard Price', value: '7891' }, { key: 'Resolution', value: '4 MP' }],
  stockQuantity: 10,
};

function setup(t, approved = false) {
  invalidateCategoryCache();
  t.after(invalidateCategoryCache);
  t.mock.method(Category, 'find', () => ({ sort: () => ({ lean: async () => [] }) }));
  t.mock.method(DealerProfile, 'findOne', () => ({ lean: async () => approved ? { _id: id } : null }));
  return t.mock.method(Product, 'aggregate', async () => [{
    products: [structuredClone({ ...product, applicablePrice: approved ? 4567 : 7891 })], total: [{ count: 1 }],
  }]);
}

test('anonymous catalog and detail responses omit prices, history and pricing specifications', async (t) => {
  setup(t);
  const list = await getPublicProducts({ includeFacets: false });
  const detail = await getPublicProductById(id);
  for (const row of [list.products[0], detail]) {
    for (const key of ['standardPrice', 'dealerPrice', 'applicablePrice', 'price', 'priceHistory']) assert.equal(key in row, false);
    assert.deepEqual(row.specifications, [{ key: 'Resolution', value: '4 MP' }]);
    assert.equal(row.name, product.name);
  }
});

test('anonymous price filters and price sorting cannot reveal hidden prices', async (t) => {
  const aggregate = setup(t);
  const query = { includeFacets: false, sortBy: 'standardPrice', minPrice: 100, maxPrice: 200 };
  await getPublicProducts(query);
  const pipeline = JSON.stringify(aggregate.mock.calls[0].arguments[0]);
  assert.equal(pipeline.includes('"$gte":100'), false);
  assert.equal(pipeline.includes('"$lte":200'), false);
  assert.equal(pipeline.includes('"$sort":{"applicablePrice"'), false);
  assert.equal(query.minPrice, 100);
});

for (const role of ['customer', 'dealer', 'admin']) {
  test(`authenticated ${role} retains standard pricing without unapproved dealer prices`, async (t) => {
    setup(t);
    const result = await getPublicProducts({ includeFacets: false }, { _id: id, role });
    assert.equal(result.products[0].standardPrice, 7891);
    assert.equal(result.products[0].applicablePrice, 7891);
    assert.equal('dealerPrice' in result.products[0], false);
  });
}

test('approved dealers retain their applicable custom price', async (t) => {
  setup(t, true);
  const result = await getPublicProducts({ includeFacets: false }, { _id: id, role: 'dealer' });
  assert.equal(result.products[0].applicablePrice, 4567);
  assert.equal(result.products[0].dealerPrice, 4567);
});

test('removing stored guest prices does not mutate the original product', () => {
  const cleaned = withoutStorefrontPrices(product);
  assert.equal(cleaned.standardPrice, undefined);
  assert.equal(product.standardPrice, 7891);
  assert.equal(product.specifications.length, 2);
});
