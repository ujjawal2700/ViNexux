import { afterEach, expect, jest, test } from '@jest/globals';
import { isWarrantyLink, productModelVariant } from '../../shared/productPresentation.js';
import { Product } from '../../backend/src/models/Product.js';
import { Category } from '../../backend/src/models/Category.js';
import productService from '../../backend/src/services/product.service.js';
import { invalidateCategoryCache } from '../../backend/src/utils/categoryCache.js';
import { createProductSchema, updateProductSchema } from '../../backend/src/validators/product.validator.js';

afterEach(() => { jest.restoreAllMocks(); invalidateCategoryCache(); });
const id = '507f1f77bcf86cd799439011';
const headerId = '507f1f77bcf86cd799439012';
const savedProduct = () => {
  const product = Product.hydrate({ _id: id, sku: 'CAM-1', name: 'Camera', modelNumber: 'CAM-1', categoryId: id, categoryIds: [id], warranty: '1 year', images: [], specifications: [] });
  jest.spyOn(Product, 'findById').mockResolvedValue(product);
  jest.spyOn(product, 'save').mockResolvedValue(product);
  return product;
};

test('model names and variants display together, with no default hiding a variant', () => {
  expect(productModelVariant({ model: 'Mini PT', variant: '4G 3MP' })).toBe('Mini PT / 4G 3MP');
  expect(productModelVariant({ model: 'Standard Model', variant: '4G' })).toBe('4G');
  expect(productModelVariant({ variant: '4G' })).toBe('4G');
  expect(productModelVariant({ model: 'Mini PT', variant: 'Mini PT' })).toBe('Mini PT');
});
test.each(['javascript:alert(1)', 'data:text/html,test', '/warranty', '1 year', ''])('rejects a non-HTTP warranty link: %s', value => expect(isWarrantyLink(value)).toBe(false));
test('explicit warranty format persists while URL-shaped text can stay plain', async () => {
  const product = savedProduct();
  await productService.updateProduct(id, { warrantyType: 'link', warranty: 'https://example.com/warranty' });
  expect(product.warrantyType).toBe('link');
  await productService.updateProduct(id, { warrantyType: 'text' });
  expect(product.warrantyType).toBe('text');
  expect(product.warranty).toBe('https://example.com/warranty');
  await expect(productService.updateProduct(id, { warrantyType: 'link', warranty: 'javascript:alert(1)' })).rejects.toThrow('HTTP or HTTPS');
});
test('warranty format is accepted by create/update schemas and defaults to plain text', () => {
  expect(createProductSchema.body.shape.warrantyType.parse(undefined)).toBe('text');
  expect(updateProductSchema.body.parse({ warrantyType: 'link' }).warrantyType).toBe('link');
  expect(updateProductSchema.body.safeParse({ warrantyType: 'html' }).success).toBe(false);
});
test('replacing category memberships moves a stale primary assignment to the new header', async () => {
  const product = savedProduct();
  jest.spyOn(Category, 'countDocuments').mockResolvedValue(1);
  jest.spyOn(Category, 'find').mockReturnValue({ sort: () => ({ lean: async () => [] }) });
  await productService.updateProduct(id, { categoryIds: [headerId] });
  expect(String(product.categoryId)).toBe(headerId);
  expect(product.categoryIds.map(String)).toEqual([headerId]);
  await productService.updateProduct(id, { categoryId: null, categoryIds: [] });
  expect(product.categoryId).toBeNull();
  expect(product.categoryIds).toHaveLength(0);
});
