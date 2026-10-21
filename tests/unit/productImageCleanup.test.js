import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { Product } from '../../backend/src/models/Product.js';
import productService, { getProductImagePublicId } from '../../backend/src/services/product.service.js';
import { config } from '../../backend/src/config/env.js';
import { storageService } from '../../backend/src/services/storage/storage.service.js';

const id = '507f1f77bcf86cd799439011';
const image = (publicId, sortOrder = 0) => ({ publicId, url: `https://example.com/${publicId}`, sortOrder });
const setup = (images, pendingImageDeletions = []) => {
  const product = { images, pendingImageDeletions, save: jest.fn().mockResolvedValue(undefined) };
  jest.spyOn(Product, 'findById').mockResolvedValue(product);
  jest.spyOn(storageService, 'deleteFile').mockResolvedValue({ success: true });
  return product;
};
afterEach(() => jest.restoreAllMocks());

describe('Product image storage cleanup', () => {
  test('legacy URLs infer IDs only for our configured Cloudinary product folder', () => {
    const previousCloud = config.cloudinaryCloudName;
    config.cloudinaryCloudName = 'our-cloud';
    try {
      expect(getProductImagePublicId({ url: 'https://res.cloudinary.com/our-cloud/image/upload/v123/vinexus/products/abc/photo.webp' }))
        .toBe('vinexus/products/abc/photo');
      expect(getProductImagePublicId({ url: 'https://res.cloudinary.com/our-cloud/image/upload/c_fill,w_500/v123/vinexus/products/abc/photo.webp' }))
        .toBe('vinexus/products/abc/photo');
      expect(getProductImagePublicId({ url: 'https://res.cloudinary.com/other-cloud/image/upload/v123/vinexus/products/abc/photo.webp' })).toBeNull();
      expect(getProductImagePublicId({ url: 'https://res.cloudinary.com/our-cloud/image/upload/v123/other-folder/photo.webp' })).toBeNull();
    } finally {
      config.cloudinaryCloudName = previousCloud;
    }
  });

  test('deletes only removed assets after persisting the gallery and cleanup IDs', async () => {
    const product = setup([image('old'), image('keep', 1)]);
    storageService.deleteFile.mockImplementation(async (publicId) => {
      expect(product.save).toHaveBeenCalledTimes(1);
      expect(product.images).toEqual([image('keep')]);
      expect(product.pendingImageDeletions).toEqual(['old']);
      return { success: true, publicId };
    });
    await productService.updateProduct(id, { images: [image('keep')] });
    expect(storageService.deleteFile).toHaveBeenCalledWith('old');
    expect(storageService.deleteFile).toHaveBeenCalledTimes(1);
    expect(product.pendingImageDeletions).toEqual([]);
  });

  test('reordering and external URLs do not delete assets', async () => {
    setup([image('one'), image('two'), { url: 'https://example.com/external.jpg' }]);
    await productService.updateProduct(id, { images: [image('two'), image('one', 1)] });
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  test('failed cleanup stays persisted and is retried on the next save', async () => {
    const product = setup([image('old'), image('keep')]);
    storageService.deleteFile.mockResolvedValueOnce({ success: false });
    await expect(productService.updateProduct(id, { images: [image('keep')] }))
      .rejects.toThrow('Save again to retry deletion');
    expect(product.pendingImageDeletions).toEqual(['old']);
    await productService.updateProduct(id, { images: [image('keep')] });
    expect(storageService.deleteFile).toHaveBeenCalledTimes(2);
    expect(product.pendingImageDeletions).toEqual([]);
  });

  test('failed database save never deletes storage', async () => {
    const product = setup([image('old')]);
    product.save.mockRejectedValue(new Error('Database unavailable'));
    await expect(productService.updateProduct(id, { images: [] })).rejects.toThrow('Database unavailable');
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  test('image-only saves preserve visibility, stock and unrelated legacy fields', async () => {
    const product = setup([image('old')]);
    product.isActive = true;
    product.stockQuantity = 27;
    product.modelNumber = '';
    product.categoryId = '507f1f77bcf86cd799439012';
    product.specifications = [];
    await productService.updateProduct(id, { images: [image('replacement')] });
    expect(product.isActive).toBe(true);
    expect(product.stockQuantity).toBe(27);
    expect(product.modelNumber).toBe('');
    expect(product.save).toHaveBeenCalledWith({ validateModifiedOnly: true });
    expect(storageService.deleteFile).toHaveBeenCalledWith('old');
  });

  test.each([null, 'https://example.com'])('clearing optional nullable fields does not crash (%s)', async value => {
    const product = setup([]);
    await productService.updateProduct(id, { productUrl: value, informationPhone: null });
    expect(product.productUrl).toBe(value || '');
    expect(product.informationPhone).toBe('');
  });

  test('rolls back the new Cloudinary upload if its gallery write fails', async () => {
    const product = setup([]); product._id = id;
    jest.spyOn(storageService, 'uploadFile').mockResolvedValue(image('new-upload'));
    jest.spyOn(Product, 'findByIdAndUpdate').mockRejectedValue(new Error('Database unavailable'));
    await expect(productService.uploadProductImage(id, { buffer: Buffer.from('test'), originalname: 'x.png', mimetype: 'image/png' }))
      .rejects.toThrow('Database unavailable');
    expect(storageService.deleteFile).toHaveBeenCalledWith('new-upload');
  });

  test('does not claim success or orphan an upload when a product is deleted mid-upload', async () => {
    const product = setup([]); product._id = id;
    jest.spyOn(storageService, 'uploadFile').mockResolvedValue(image('new-upload'));
    jest.spyOn(Product, 'findByIdAndUpdate').mockResolvedValue(null);
    await expect(productService.uploadProductImage(id, { buffer: Buffer.from('test'), originalname: 'x.png', mimetype: 'image/png' }))
      .rejects.toMatchObject({ statusCode: 404 });
    expect(storageService.deleteFile).toHaveBeenCalledWith('new-upload');
  });

  test('a stale gallery cannot remove another session’s uploaded image', async () => {
    const product = setup([image('old'), image('other-admin-upload')]);
    await expect(productService.updateProduct(id, { images: [image('new')], expectedImages: ['old'] }))
      .rejects.toMatchObject({ statusCode: 409, details: [{ path: 'images', message: expect.stringContaining('another session') }] });
    expect(product.save).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  test('direct image-delete endpoint uses the same cleanup path', async () => {
    const product = setup([image('old'), image('keep', 1)]);
    await productService.deleteProductImage(id, 'old');
    expect(storageService.deleteFile).toHaveBeenCalledWith('old');
    expect(product.images).toEqual([{ ...image('keep'), altText: undefined }]);
  });
});
