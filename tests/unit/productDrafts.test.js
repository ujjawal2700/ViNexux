import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { Product } from '../../backend/src/models/Product.js';
import { Category } from '../../backend/src/models/Category.js';
import { Brand } from '../../backend/src/models/Brand.js';
import productService from '../../backend/src/services/product.service.js';
import { createProductSchema, updateProductSchema, getProductsQuerySchema } from '../../backend/src/validators/product.validator.js';
import { invalidateCategoryCache } from '../../backend/src/utils/categoryCache.js';
import { editableProductIdentifier, isDraftIdentifier } from '../../shared/productDrafts.js';

const id = '507f1f77bcf86cd799439011';
afterEach(() => { jest.restoreAllMocks(); invalidateCategoryCache(); });

describe('Incomplete product drafts', () => {
  test('create accepts no product details only when explicitly saving a draft', () => {
    expect(createProductSchema.body.parse({ isActive: false }).isActive).toBe(false);
    expect(createProductSchema.body.safeParse({}).success).toBe(false);
    expect(createProductSchema.body.safeParse({ isActive: true }).success).toBe(false);
    const partial = { isActive: false, name: '', sku: '', modelNumber: '', brandId: null,
      specifications: [{ key: 'Resolution', value: '' }], additionalDetails: [{ key: '', value: 'India' }] };
    expect(createProductSchema.body.parse(partial)).toMatchObject(partial);
    expect(updateProductSchema.body.parse(partial)).toMatchObject(partial);
    expect(updateProductSchema.body.safeParse({ ...partial, isActive: true }).success).toBe(false);
  });

  test('creates multiple blank drafts with unique private identifiers and no public visibility', async () => {
    jest.spyOn(Product, 'findOne').mockResolvedValue(null);
    jest.spyOn(Product, 'create').mockImplementation(async fields => new Product(fields));
    const category = jest.spyOn(Category, 'findById');
    const brand = jest.spyOn(Brand, 'findOne');
    const first = await productService.createProduct({ isActive: false, specifications: [{ key: 'Resolution', value: '' }] });
    const second = await productService.createProduct({ isActive: false });
    expect(first.validateSync()).toBeUndefined();
    expect(first.isActive).toBe(false);
    expect(first.isNewArrival).toBe(false);
    expect(first.name).toBe('');
    expect(isDraftIdentifier(first.sku)).toBe(true);
    expect(editableProductIdentifier(first.sku)).toBe('');
    expect(editableProductIdentifier(first.modelNumber)).toBe('');
    expect(first.sku).not.toBe(second.sku);
    expect(first.specifications[0].value).toBe('');
    expect(category).not.toHaveBeenCalled();
    expect(brand).not.toHaveBeenCalled();
  });

  test('an existing published product can be saved incomplete as a draft', async () => {
    const product = Product.hydrate({ _id: id, name: 'Camera', sku: 'CAM-1', modelNumber: 'CAM-1', isActive: true });
    jest.spyOn(Product, 'findById').mockResolvedValue(product);
    jest.spyOn(product, 'save').mockImplementation(async () => { await product.validate(); return product; });
    await productService.updateProduct(id, { name: '', brandId: null, isActive: false,
      specifications: [{ key: 'Resolution', value: '' }], additionalDetails: [{ key: '', value: 'India' }] });
    expect(product.isActive).toBe(false);
    expect(product.name).toBe('');
    expect(product.save).toHaveBeenCalled();
  });

  test('draft saves preserve partial fields when prices are changed and audited', async () => {
    const product = Product.hydrate({ _id: id, name: '', sku: `__DRAFT__${id}`, modelNumber: `__DRAFT__${id}`, isActive: false, standardPrice: 0 });
    jest.spyOn(Product, 'findById').mockResolvedValue(product);
    const write = jest.spyOn(Product, 'findOneAndUpdate').mockImplementation(async (filter, update) => Product.hydrate({ _id: id, ...product.toObject(), ...update.$set }));
    await productService.updateProduct(id, { isActive: false, standardPrice: 100, specifications: [{ key: 'Resolution', value: '' }] });
    expect(write).toHaveBeenCalled();
    expect(write.mock.calls[0][1].$set.specifications[0].value).toBe('');
    expect(write.mock.calls[0][1].$push.priceHistory.$each[0].newPrice).toBe(100);
    write.mockClear();
    await expect(productService.updateProduct(id, { isActive: false, standardPrice: -1 })).rejects.toThrow();
    expect(write).not.toHaveBeenCalled();
  });

  test('publishing incomplete drafts fails even when the API receives only the active flag', async () => {
    const product = Product.hydrate({ _id: id, name: '', sku: `__DRAFT__${id}`, modelNumber: `__DRAFT__${id}`, isActive: false });
    jest.spyOn(Product, 'findById').mockResolvedValue(product);
    jest.spyOn(product, 'save').mockResolvedValue(product);
    await expect(productService.updateProduct(id, { isActive: true })).rejects.toThrow('Complete the required product details');
    expect(product.save).not.toHaveBeenCalled();
  });

  test('a completed draft can be published and retain its New Arrivals selection', async () => {
    invalidateCategoryCache();
    const product = Product.hydrate({ _id: id, name: 'Camera', sku: 'CAM-1', modelNumber: 'CAM-1',
      isActive: false, categoryId: id, brandId: id, images: [{ url: 'https://example.com/camera.webp' }], isNewArrival: true });
    jest.spyOn(Product, 'findById').mockResolvedValue(product);
    jest.spyOn(Brand, 'findOne').mockResolvedValue({ _id: id, isActive: true });
    jest.spyOn(Category, 'findOne').mockResolvedValue({ _id: id, isActive: true });
    jest.spyOn(Category, 'find').mockReturnValue({ sort: () => ({ lean: async () => [{ _id: id, name: 'Cameras', slug: 'cameras', isActive: true }] }) });
    jest.spyOn(product, 'save').mockResolvedValue(product);
    const result = await productService.updateProduct(id, { isActive: true });
    expect(result.isActive).toBe(true);
    expect(result.isNewArrival).toBe(true);
    expect(product.save).toHaveBeenCalled();
  });

  test('new arrivals are opt-in and independent of trending', async () => {
    expect(new Product({}).isNewArrival).toBe(false);
    expect(createProductSchema.body.parse({ isActive: false, isNewArrival: true }).isNewArrival).toBe(true);
    expect(updateProductSchema.body.parse({ isNewArrival: true })).toEqual({ isNewArrival: true });
    expect(getProductsQuerySchema.query.parse({ isNewArrival: 'true' }).isNewArrival).toBe('true');
    const product = Product.hydrate({ _id: id, name: 'Camera', sku: 'CAM-1', isTrending: false });
    jest.spyOn(Product, 'findById').mockResolvedValue(product);
    jest.spyOn(product, 'save').mockResolvedValue(product);
    await productService.updateProduct(id, { isNewArrival: true });
    expect(product.isNewArrival).toBe(true);
    expect(product.isTrending).toBe(false);
    await productService.updateProduct(id, { isNewArrival: false });
    expect(product.isNewArrival).toBe(false);
  });
});
