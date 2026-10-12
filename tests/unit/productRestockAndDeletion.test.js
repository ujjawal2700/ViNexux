import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { Product } from '../../backend/src/models/Product.js';
import { Cart } from '../../backend/src/models/Cart.js';
import { Enquiry } from '../../backend/src/models/Enquiry.js';
import { DealerPricing } from '../../backend/src/models/DealerPricing.js';
import productService from '../../backend/src/services/product.service.js';
import { storageService } from '../../backend/src/services/storage/storage.service.js';
import { stockSearchScore } from '../../backend/src/utils/productStockSearch.js';
import { addProductStockSchema, stockSearchSchema } from '../../backend/src/validators/product.validator.js';

const id = '507f1f77bcf86cd799439011';
const product = { _id: id, name: 'HDMI Camera Cable', model: 'Indoor Dome', modelNumber: 'HD-19N', sku: 'VNX-001', stockQuantity: 5 };
afterEach(() => jest.restoreAllMocks());

describe('Dashboard product search', () => {
  test('fuzzy matches span the whole catalog and paginate every matching product', async () => {
    const candidates = Array.from({ length: 25 }, (_, index) => ({
      ...product, _id: String(index), name: `Indoor Camera ${String(index).padStart(2, '0')}`,
    }));
    jest.spyOn(Product, 'find').mockReturnValue({ select: () => ({ lean: async () => candidates }) });
    const result = await productService.searchStockProducts({ search: 'camrea', page: 2, limit: 10 });
    expect(result.pagination).toEqual({ total: 25, page: 2, limit: 10, totalPages: 3 });
    expect(result.products).toHaveLength(10);
    expect(result.products[0]._id).toBe('10');
  });
  test.each(['Camera', 'Indoor Dome', 'HD-19N', 'VNX-001', id, 'hdmi cbale', 'camrea indoor'])('finds names, models, identifiers and misspellings: %s', (query) => {
    expect(stockSearchScore(product, query)).not.toBeNull();
  });
  test('excludes unrelated products and ranks exact matches first', () => {
    expect(stockSearchScore(product, 'refrigerator')).toBeNull();
    expect(stockSearchScore(product, 'Indoor Dome')).toBeLessThan(stockSearchScore(product, 'indor dmome'));
  });
  test('search pagination is validated and defaults to all products', () => {
    expect(stockSearchSchema.query.parse({})).toEqual({ search: '', page: 1, limit: 10 });
    expect(stockSearchSchema.query.safeParse({ page: 0 }).success).toBe(false);
  });
});

describe('Atomic restock', () => {
  test.each([0, -1, 1.5, '5', Number.MAX_SAFE_INTEGER + 1])('rejects invalid additions: %s', (quantity) => {
    expect(addProductStockSchema.body.safeParse({ quantity }).success).toBe(false);
  });
  test('increments stored stock without reading and overwriting an earlier quantity', async () => {
    const update = jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue({ ...product, stockQuantity: 17 });
    const read = jest.spyOn(Product, 'findById');
    const result = await productService.addProductStock(id, 7);
    expect(result.stockQuantity).toBe(17);
    expect(read).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ _id: id }), {
      $inc: { stockQuantity: 7 }, $set: { stockUpdatedAt: expect.any(Date) },
    }, { new: true, runValidators: true });
  });
  test('returns not found for a deleted product rather than creating a new one', async () => {
    jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue(null);
    jest.spyOn(Product, 'exists').mockResolvedValue(null);
    await expect(productService.addProductStock(id, 7)).rejects.toThrow('Product not found');
  });
});

const setupDelete = () => {
  jest.spyOn(Product, 'findById').mockResolvedValue({ ...product, images: [{ publicId: 'vinexus/products/old' }], pendingImageDeletions: ['vinexus/products/pending'] });
  jest.spyOn(Product, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
  jest.spyOn(Product, 'deleteOne').mockResolvedValue({ deletedCount: 1 });
  jest.spyOn(Cart, 'updateMany').mockResolvedValue({ modifiedCount: 1 });
  jest.spyOn(DealerPricing, 'deleteMany').mockResolvedValue({ deletedCount: 1 });
  jest.spyOn(Enquiry, 'updateMany').mockResolvedValue({ modifiedCount: 1 });
  jest.spyOn(Enquiry, 'deleteMany').mockResolvedValue({ deletedCount: 0 });
  jest.spyOn(storageService, 'deleteFile').mockResolvedValue({ success: true });
};

describe('Permanent product deletion', () => {
  test('preserves enquiry snapshots while removing storage, cart entries, pricing and the catalog record', async () => {
    setupDelete();
    const result = await productService.permanentlyDeleteProduct(id);
    expect(result.deleted).toBe(true);
    expect(Enquiry.deleteMany).not.toHaveBeenCalled();
    expect(Enquiry.updateMany).toHaveBeenCalledWith({ 'items.productId': id }, { $set: { 'items.$[item].sku': 'VNX-001' } }, {
      arrayFilters: [{ 'item.productId': id, 'item.sku': { $in: [null, ''] } }],
    });
    expect(storageService.deleteFile).toHaveBeenCalledWith('vinexus/products/old');
    expect(storageService.deleteFile).toHaveBeenCalledWith('vinexus/products/pending');
    expect(Cart.updateMany).toHaveBeenCalledWith({ 'items.productId': id }, { $pull: { items: { productId: id } } });
    expect(DealerPricing.deleteMany).toHaveBeenCalledWith({ productId: id });
    expect(Product.deleteOne).toHaveBeenCalledWith({ _id: id });
    expect(Product.deleteOne.mock.invocationCallOrder[0]).toBeGreaterThan(storageService.deleteFile.mock.invocationCallOrder.at(-1));
  });
  test('storage failures leave a deactivated catalog record with its image IDs available for retry', async () => {
    setupDelete();
    storageService.deleteFile.mockResolvedValueOnce({ success: false });
    await expect(productService.permanentlyDeleteProduct(id)).rejects.toThrow('retry Delete Product');
    expect(Product.updateOne).toHaveBeenCalledWith({ _id: id }, { $set: { isActive: false } });
    expect(Product.deleteOne).not.toHaveBeenCalled();
    expect(Cart.updateMany).not.toHaveBeenCalled();
    expect(DealerPricing.deleteMany).not.toHaveBeenCalled();
    expect(Enquiry.deleteMany).not.toHaveBeenCalled();
  });
});
