import { beforeEach, afterEach, expect, jest, test } from '@jest/globals';
import { User } from '../../backend/src/models/User.js';
import { DealerProfile } from '../../backend/src/models/DealerProfile.js';
import { DealerPricing } from '../../backend/src/models/DealerPricing.js';
import { DealerPricingSettings } from '../../backend/src/models/DealerPricingSettings.js';
import { calculateApplicablePrices } from '../../backend/src/services/cart.service.js';
import { updateDealerProfileByUserId } from '../../backend/src/services/dealer.service.js';
import { applyInstallerPriceIncrease } from '../../shared/installerPricing.js';
import { installerPricingSchema } from '../../backend/src/services/installerPricing.service.js';
const id = '507f1f77bcf86cd799439011', variantId = '507f1f77bcf86cd799439012';
let profile, rate, custom;
beforeEach(() => {
  profile = { _id: id, status: 'approved', organisationType: 'Installer' }; rate = 10; custom = [];
  jest.spyOn(User, 'findById').mockReturnValue({ select: () => ({ lean: async () => ({ role: 'dealer' }) }) });
  jest.spyOn(DealerProfile, 'findOne').mockReturnValue({ select: () => ({ lean: async () => profile }) });
  jest.spyOn(DealerPricing, 'find').mockReturnValue({ select: () => ({ lean: async () => custom }) });
  jest.spyOn(DealerPricingSettings, 'findById').mockReturnValue({ select: () => ({ lean: async () => ({ installerPriceIncreasePercent: rate }) }) });
});
afterEach(() => jest.restoreAllMocks());
test('installer sees ₹110 for ₹100 dealer price and future changes reprice without mutating the catalogue', async () => {
  const product = { _id: id, standardPrice: 150, dealerPrice: 100 };
  expect((await calculateApplicablePrices(id, [product])).get(id)).toBe(110);
  rate = 20;
  expect((await calculateApplicablePrices(id, [product])).get(id)).toBe(120);
  expect(product.dealerPrice).toBe(100);
});
test('markup respects negotiated dealer prices, variant prices and the fallback price', async () => {
  custom = [{ productId: id, price: 80 }];
  const products = [{ _id: id, standardPrice: 150, dealerPrice: 100 }, { _id: id, _variantId: variantId, standardPrice: 160, dealerPrice: 120 }];
  const prices = await calculateApplicablePrices(id, products);
  expect(prices.get(id)).toBe(88); expect(prices.get(`${id}:${variantId}`)).toBe(132);
  custom = [];
  expect((await calculateApplicablePrices(id, [{ _id: id, standardPrice: 150, dealerPrice: 0 }])).get(id)).toBe(165);
});
test('regular approved dealers and pending installers keep their existing price rules', async () => {
  profile.organisationType = 'Proprietorship';
  expect((await calculateApplicablePrices(id, [{ _id: id, standardPrice: 150, dealerPrice: 100 }])).get(id)).toBe(100);
  profile.organisationType = 'Installer'; profile.status = 'pending';
  expect((await calculateApplicablePrices(id, [{ _id: id, standardPrice: 150, dealerPrice: 100 }])).get(id)).toBe(150);
  expect(DealerPricingSettings.findById).not.toHaveBeenCalled();
});
test('rounds to paisa and validates percentages without accepting negative, nonfinite or forged fields', () => {
  expect(applyInstallerPriceIncrease(99.99, 10)).toBe(109.99);
  expect(applyInstallerPriceIncrease(100, 2.5)).toBe(102.5);
  expect(applyInstallerPriceIncrease(100, 0)).toBe(100);
  for (const value of [-1, Infinity, NaN, 10.123]) expect(installerPricingSchema.safeParse({ installerPriceIncreasePercent: value }).success).toBe(false);
  expect(installerPricingSchema.safeParse({ installerPriceIncreasePercent: 10, role: 'admin' }).success).toBe(false);
});
test('approved installers cannot remove their installer classification through self-service', async () => {
  DealerProfile.findOne.mockResolvedValue(profile);
  await expect(updateDealerProfileByUserId(id, { organisationType: 'Proprietorship' })).rejects.toMatchObject({ statusCode: 403 });
});

test.each([0, 3])('catalogue applies installer pricing and %s%% private discount before filtering and sorting', async discount => {
  profile.dealerDiscountPercent = discount;
  const expectedPrice = Math.round(110 * (100 - discount)) / 100;
  const { Product } = await import('../../backend/src/models/Product.js');
  const { Category } = await import('../../backend/src/models/Category.js');
  const { Brand } = await import('../../backend/src/models/Brand.js');
  const { invalidateCategoryCache } = await import('../../backend/src/utils/categoryCache.js');
  const { getPublicProducts } = await import('../../backend/src/services/catalog.service.js');
  invalidateCategoryCache();
  DealerProfile.findOne.mockReturnValue({ select() { return this; }, lean: async () => profile });
  jest.spyOn(Category, 'find').mockReturnValue({ sort() { return this; }, lean: async () => [{ _id: id, name: 'Cameras', slug: 'cameras' }] });
  jest.spyOn(Brand, 'find').mockReturnValue({ lean: async () => [] });
  let pipeline;
  jest.spyOn(Product, 'aggregate').mockImplementation(async stages => {
    pipeline = stages;
    return [{ total: [{ count: 1 }], products: [{ _id: id, name: 'Camera', categoryId: id, standardPrice: 150, dealerPrice: 100, applicablePrice: 110, stockQuantity: 10, specifications: [], variants: [{ _id: variantId, name: '4G', standardPrice: 150, dealerPrice: 100, stockQuantity: 10, isActive: true }] }] }];
  });
  const result = await getPublicProducts({ includeFacets: false, minPrice: 110, sortBy: 'applicablePrice' }, { _id: id, role: 'dealer' });
  expect(result.products[0].applicablePrice).toBe(expectedPrice);
  expect(result.products[0].dealerPrice).toBe(expectedPrice);
  expect(result.products[0].variants[0]).toMatchObject({ applicablePrice: expectedPrice, dealerPrice: expectedPrice });
  const priceIndex = pipeline.findIndex(stage => stage.$set?.applicablePrice);
  const filterIndex = pipeline.findIndex(stage => JSON.stringify(stage.$match || {}).includes('applicablePrice'));
  expect(priceIndex).toBeGreaterThan(-1); expect(filterIndex).toBeGreaterThan(priceIndex);
  expect(JSON.stringify(pipeline[priceIndex])).toContain('110');
  if (discount) expect(JSON.stringify(pipeline[priceIndex])).toContain('97');
  expect(result.products[0]).not.toHaveProperty('dealerDiscountPercent');
  invalidateCategoryCache();
});


test('private global discount reprices every dealer line, including variants, overrides and later edits', async () => {
  profile.organisationType = 'Proprietorship'; profile.dealerDiscountPercent = 3;
  const product = { _id: id, standardPrice: 150, dealerPrice: 100 };
  expect((await calculateApplicablePrices(id, [product])).get(id)).toBe(97);
  custom = [{ productId: id, price: 80 }];
  const variant = { ...product, _variantId: variantId, dealerPrice: 120 };
  const prices = await calculateApplicablePrices(id, [product, variant]);
  expect(prices.get(id)).toBe(77.6); expect(prices.get(`${id}:${variantId}`)).toBe(116.4);
  profile.dealerDiscountPercent = 5;
  expect((await calculateApplicablePrices(id, [product])).get(id)).toBe(76);
  profile.dealerDiscountPercent = 0;
  expect((await calculateApplicablePrices(id, [product])).get(id)).toBe(80);
  profile.status = 'pending'; profile.dealerDiscountPercent = 3;
  expect((await calculateApplicablePrices(id, [product])).get(id)).toBe(150);
});

test('installer adjustments combine with private discount and round consistently to paisa', async () => {
  profile.dealerDiscountPercent = 3;
  expect((await calculateApplicablePrices(id, [{ _id: id, dealerPrice: 100 }])).get(id)).toBe(106.7);
  expect((await calculateApplicablePrices(id, [{ _id: id, standardPrice: 99.99, dealerPrice: 0 }])).get(id)).toBe(106.69);
});
