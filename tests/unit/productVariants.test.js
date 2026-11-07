import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { Cart } from '../../backend/src/models/Cart.js';
import { Category } from '../../backend/src/models/Category.js';
import { Product } from '../../backend/src/models/Product.js';
import { User } from '../../backend/src/models/User.js';
import { DealerProfile } from '../../backend/src/models/DealerProfile.js';
import { DealerPricing } from '../../backend/src/models/DealerPricing.js';
import { productVariantsSchema } from '../../backend/src/validators/product.validator.js';
import { normalizeVariants, resolveVariant, variantStockChange } from '../../backend/src/utils/productVariants.js';
import { variantSummary, selectedVariantProduct, productLineKey } from '../../shared/productVariants.js';
import { withoutStorefrontPrices } from '../../shared/storefrontPricing.js';
import { computeCatalogFields } from '../../backend/src/utils/productCatalogFields.js';
import { addToCart, updateCartItem, removeCartItem, calculateApplicablePrices } from '../../backend/src/services/cart.service.js';
import { posSaleSchema } from '../../backend/src/validators/pos.validator.js';
import { posInput } from '../helpers/posFixture.js';
import { createReferences, exportProductRow, parseProductRow, productValues, mergeSheetChanges } from '../../backend/src/services/googleSheets/productSheetRows.js';

const id = '507f1f77bcf86cd799439011';
const first = '507f1f77bcf86cd799439012', second = '507f1f77bcf86cd799439013';
const variants = () => [{ _id: first, name: '5m', sku: 'CAT6-5M', standardPrice: 150, dealerPrice: 120, stockQuantity: 4, isActive: true },
  { _id: second, name: '10m', sku: 'CAT6-10M', standardPrice: 250, dealerPrice: 210, stockQuantity: 7, isActive: true }];
const cable = () => ({ _id: id, name: 'Ethernet cable', sku: 'CAT6', modelNumber: 'CAT6', variants: variants() });
afterEach(() => jest.restoreAllMocks());

describe('Independent product options', () => {
  test('a model save derives total stock and starting prices from its options', async () => {
    const product = new Product({ ...cable(), isActive: false, stockQuantity: 999, standardPrice: 999 });
    await product.validate();
    expect(product.stockQuantity).toBe(11); expect(product.standardPrice).toBe(150); expect(product.dealerPrice).toBe(120);
  });
  test('archived stock stays on record but cannot make the storefront appear in stock', () => {
    const product = { ...cable(), stockQuantity: 11, variants: variants().map(option => ({ ...option, isActive: false })), specifications: [{ key: 'Stock', value: '999' }] };
    expect(variantSummary(product.variants)).toMatchObject({ stockQuantity: 11, availableStock: 0 });
    expect(computeCatalogFields(product)).toMatchObject({ stockLevel: 0, stockStatus: 'out-of-stock' });
    expect(() => resolveVariant(product, first)).toThrow('Select');
  });
  test('each selected option carries its own prices, SKU and stock; another product cannot borrow the ID', () => {
    expect(selectedVariantProduct(cable(), second)).toMatchObject({ name: 'Ethernet cable — 10m', sku: 'CAT6-10M', standardPrice: 250, stockQuantity: 7 });
    expect(selectedVariantProduct(cable(), '507f1f77bcf86cd799439099')).toBeNull();
    expect(() => resolveVariant(cable())).toThrow('Select');
    expect(productLineKey(id, first)).not.toBe(productLineKey(id, second));
  });
  test('normalization retains stable IDs across sheet retries and archives removed historical options', () => {
    const firstResult = normalizeVariants([{ ...variants()[0], _id: undefined }], variants());
    expect(String(firstResult[0]._id)).toBe(first);
    expect(firstResult[1]).toMatchObject({ _id: second, isActive: false });
    expect(normalizeVariants(firstResult, firstResult).map(option => String(option._id))).toEqual([first, second]);
    expect(() => normalizeVariants([{ ...variants()[0], _id: '507f1f77bcf86cd799439099' }], variants())).toThrow('Keep existing variant IDs');
  });
  test('duplicate names, duplicate IDs, fractional stock and unsafe totals are rejected', () => {
    for (const options of [[variants()[0], { ...variants()[1], name: ' 5M ' }], [variants()[0], { ...variants()[1], _id: first }], [{ ...variants()[0], stockQuantity: 1.5 }], [{ ...variants()[0], standardPrice: 1.001 }], variants().map(option => ({ ...option, stockQuantity: Number.MAX_SAFE_INTEGER }))]) {
      expect(productVariantsSchema.safeParse(options).success).toBe(false);
    }
  });
  test('stock reservations require the selected option, sufficient option stock, and one atomic counter update', () => {
    const change = variantStockChange(id, first, -3);
    expect(change.filter.variants.$elemMatch).toMatchObject({ _id: first, stockQuantity: { $gte: 3 }, isActive: { $ne: false } });
    expect(change.update.$inc).toEqual({ stockQuantity: -3, 'variants.$.stockQuantity': -3 });
    expect(variantStockChange(id, null, -1).filter['variants.0']).toEqual({ $exists: false });
    expect(variantStockChange(id, first, 2, { active: false }).filter.variants.$elemMatch.isActive).toBeUndefined();
  });
  test('anonymous responses cannot leak nested retail or dealer prices', () => {
    const hidden = withoutStorefrontPrices(cable());
    expect(hidden.variants[0].standardPrice).toBeUndefined(); expect(hidden.variants[0].dealerPrice).toBeUndefined();
    expect(hidden.variants[0].name).toBe('5m'); expect(cable().variants[0].standardPrice).toBe(150);
  });
  test('approved-dealer pricing uses each option instead of reusing a custom price for the parent', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({ select: () => ({ lean: async () => ({ role: 'dealer' }) }) });
    jest.spyOn(DealerProfile, 'findOne').mockReturnValue({ select: () => ({ lean: async () => ({ _id: id, status: 'approved' }) }) });
    jest.spyOn(DealerPricing, 'find').mockReturnValue({ select: () => ({ lean: async () => [{ productId: id, price: 99 }] }) });
    const prices = await calculateApplicablePrices(id, variants().map(option => resolveVariant(cable(), option._id)));
    expect(prices.get(productLineKey(id, first))).toBe(120); expect(prices.get(productLineKey(id, second))).toBe(210);
  });
  test('POS accepts separate option lines but rejects the same option twice', () => {
    const input = posInput(); input.items[0].variantId = first; input.items.push({ ...input.items[0], variantId: second, serialNumbers: [] });
    expect(posSaleSchema.safeParse(input).success).toBe(true);
    input.items[1].variantId = first; expect(posSaleSchema.safeParse(input).success).toBe(false);
  });
  test('Sheets round-trips all option IDs, prices, stock and archive flags and detects concurrent POS stock edits', () => {
    const refs = createReferences([], []), product = { ...cable(), isActive: false };
    const values = productValues(product), parsed = parseProductRow(exportProductRow(product, refs), refs);
    expect(parsed.payload.variants).toEqual(values.variants);
    const current = { ...values, variants: variants().map(option => ({ ...option, stockQuantity: option.stockQuantity - 1 })) };
    const incoming = { ...values, variants: variants().map(option => ({ ...option, standardPrice: option.standardPrice + 50 })) };
    expect(() => mergeSheetChanges(current, values, incoming)).toThrow('Variants JSON');
  });
});


test('cart add, quantity edits and removal keep two lengths separate and refresh their actual prices', async () => {
  const product = { ...cable(), categoryId: id, isActive: true, standardPrice: 150, stockQuantity: 11 };
  let stored = [];
  jest.spyOn(Product, 'findById').mockResolvedValue(product);
  jest.spyOn(Category, 'findById').mockResolvedValue({ _id: id, isActive: true });
  jest.spyOn(Product, 'find').mockReturnValue({ select: () => ({ lean: async () => [product] }) });
  jest.spyOn(User, 'findById').mockReturnValue({ select: () => ({ lean: async () => ({ role: 'customer' }) }) });
  jest.spyOn(Cart, 'findOne').mockImplementation(async () => ({
    _id: id, userId: id, items: structuredClone(stored),
    async save() { stored = this.items.map(row => ({ ...row, productId: String(row.productId?._id || row.productId) })); },
    async populate() { this.items = this.items.map(row => ({ ...row, productId: structuredClone(product) })); },
  }));
  await addToCart(id, id, 1, first);
  const two = await addToCart(id, id, 2, second);
  expect(two.items).toHaveLength(2);
  expect(two.items.map(row => row.priceSnapshot)).toEqual([150, 250]);
  expect(two.items.map(row => row.productId.name)).toEqual(['Ethernet cable — 5m', 'Ethernet cable — 10m']);
  expect(two.items[0].productId.dealerPrice).toBeUndefined();
  await updateCartItem(id, id, 3, first);
  expect(stored.map(row => row.quantity)).toEqual([3, 2]);
  await expect(addToCart(id, id, 1)).rejects.toThrow('Select');
  const one = await removeCartItem(id, id, first);
  expect(one.items).toHaveLength(1); expect(one.items[0].variantId).toBe(second);
});
