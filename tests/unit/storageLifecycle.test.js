import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { createRequire } from 'node:module';
import { storageService } from '../../backend/src/services/storage/storage.service.js';
import { preparePdfBuffer } from '../../backend/src/services/storage/preparePdf.js';
import { getStorageProvider, setStorageProvider } from '../../backend/src/integrations/storage/index.js';
import { CloudinaryStorageProvider } from '../../backend/src/integrations/storage/CloudinaryStorageProvider.js';
import { uploadBannerImage, deleteTrustBadge } from '../../backend/src/services/cms.service.js';
import { Product } from '../../backend/src/models/Product.js';
import { Banner } from '../../backend/src/models/Banner.js';
import { TrustBadge } from '../../backend/src/models/TrustBadge.js';
import { DealerProfile } from '../../backend/src/models/DealerProfile.js';
import { uploadApplicationDocument } from '../../backend/src/services/dealerApplication.service.js';
import { config } from '../../backend/src/config/env.js';
import { collectMedia, ownedAsset } from '../../backend/src/services/storage/retireMedia.js';
const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const { PDFDocument, PDFName, PDFRawStream } = require('pdf-lib');
const sharp = require('sharp');
const originalProvider = getStorageProvider();
afterEach(() => { setStorageProvider(originalProvider); jest.restoreAllMocks(); });

async function scannedPdf() {
  const pixels = Buffer.alloc(800 * 800 * 3);
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 37 + Math.floor(i / 128)) % 256;
  const jpeg = await sharp(pixels, { raw: { width: 800, height: 800, channels: 3 } }).jpeg({ quality: 100 }).toBuffer();
  const pdf = await PDFDocument.create();
  const image = await pdf.embedJpg(jpeg);
  pdf.addPage([600, 800]).drawImage(image, { x: 0, y: 0, width: 600, height: 600 });
  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}

describe('Compression before storage', () => {
  test('PDF scans shrink while the PDF and embedded image remain readable', async () => {
    const original = await scannedPdf();
    const result = await preparePdfBuffer(original);
    expect(result.buffer.length).toBeLessThan(original.length);
    const reopened = await PDFDocument.load(result.buffer);
    expect(reopened.getPageCount()).toBe(1);
    const image = reopened.context.enumerateIndirectObjects().map(([, value]) => value).find(value => value instanceof PDFRawStream && value.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'));
    expect((await sharp(Buffer.from(image.getContents())).metadata()).width).toBe(800);
  });
  test('the provider receives optimized PDFs and WebP image bytes, not originals', async () => {
    const provider = { uploadFile: jest.fn(async input => ({ ...input, publicId: 'uploaded', url: 'https://example.test/file', bytes: input.buffer.length })) };
    setStorageProvider(provider);
    const pdf = await scannedPdf();
    await storageService.uploadFile({ buffer: pdf, mimetype: 'application/pdf', originalname: 'certificate.pdf' });
    expect(provider.uploadFile.mock.calls[0][0].buffer.length).toBeLessThan(pdf.length);
    const png = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: 'red' } }).png().toBuffer();
    await storageService.uploadFile({ buffer: png, mimetype: 'image/png', originalname: 'product.png' });
    const image = provider.uploadFile.mock.calls[1][0];
    expect(image.originalname).toBe('product.webp');
    expect(image.mimetype).toBe('image/webp');
    expect((await sharp(image.buffer).metadata()).width).toBe(2000);
  });
  test('invalid PDFs fail before contacting storage and signatures are preserved byte-for-byte', async () => {
    const uploadFile = jest.fn(); setStorageProvider({ uploadFile });
    await expect(storageService.uploadFile({ buffer: Buffer.from('fake pdf'), mimetype: 'application/pdf' })).rejects.toMatchObject({ statusCode: 400 });
    expect(uploadFile).not.toHaveBeenCalled();
    const pdf = await PDFDocument.create(); pdf.addPage();
    pdf.context.register(pdf.context.obj({ Type: 'Sig', ByteRange: [0, 10, 20, 30] }));
    const signed = Buffer.from(await pdf.save());
    expect((await preparePdfBuffer(signed)).buffer.equals(signed)).toBe(true);
  });
});

describe('Safe replacement and cleanup', () => {
  const file = { buffer: Buffer.from('mocked'), originalname: 'banner.png', mimetype: 'image/png' };
  test('CMS replacement commits the database first, then removes old storage', async () => {
    const banner = { image: { publicId: 'old' }, save: jest.fn().mockResolvedValue(undefined) };
    jest.spyOn(Banner, 'findById').mockResolvedValue(banner);
    jest.spyOn(storageService, 'uploadFile').mockResolvedValue({ publicId: 'new', url: 'https://example.test/new' });
    const deleted = jest.spyOn(storageService, 'deleteFile').mockImplementation(async id => { expect(banner.save).toHaveBeenCalled(); expect(banner.image.publicId).toBe('new'); return { success: true }; });
    await uploadBannerImage('banner', file);
    expect(deleted).toHaveBeenCalledWith('old');
  });
  test('failed CMS database commit removes only the new upload', async () => {
    const banner = { image: { publicId: 'old' }, save: jest.fn().mockRejectedValue(new Error('DB unavailable')) };
    jest.spyOn(Banner, 'findById').mockResolvedValue(banner);
    jest.spyOn(storageService, 'uploadFile').mockResolvedValue({ publicId: 'new', url: 'https://example.test/new' });
    const deleted = jest.spyOn(storageService, 'deleteFile').mockResolvedValue({ success: true });
    await expect(uploadBannerImage('banner', file)).rejects.toThrow('DB unavailable');
    expect(deleted.mock.calls).toEqual([['new']]);
  });
  test('removing a badge also deletes its icon', async () => {
    jest.spyOn(TrustBadge, 'findByIdAndDelete').mockResolvedValue({ icon: { publicId: 'badge-icon' } });
    const deleted = jest.spyOn(storageService, 'deleteFile').mockResolvedValue({ success: true });
    await deleteTrustBadge('badge'); expect(deleted).toHaveBeenCalledWith('badge-icon');
  });
  test('customer-to-dealer document replacement cleans the old document after commit', async () => {
    const profile = { _id: 'profile', __v: 1, kycDocuments: [{ type: 'gst', publicId: 'old-pdf' }] };
    jest.spyOn(DealerProfile, 'findOne').mockReturnValue({ lean: async () => profile });
    const write = jest.spyOn(DealerProfile, 'findOneAndUpdate').mockReturnValue({ lean: async () => ({ ...profile, kycDocuments: [{ type: 'gst', publicId: 'new-pdf' }] }) });
    jest.spyOn(storageService, 'uploadFile').mockResolvedValue({ publicId: 'new-pdf', url: 'https://example.test/new.pdf' });
    const deleted = jest.spyOn(storageService, 'deleteFile').mockImplementation(async id => { expect(write).toHaveBeenCalled(); return { success: true }; });
    await uploadApplicationDocument('user', 'gst', file);
    expect(deleted).toHaveBeenCalledWith('old-pdf');
  });
  test('Cloudinary deletion handles raw documents, videos and CDN invalidation', async () => {
    const provider = new CloudinaryStorageProvider({ cloudName: 'cloud', apiKey: 'key', apiSecret: 'secret' });
    const destroy = jest.fn().mockResolvedValueOnce({ result: 'not found' }).mockResolvedValueOnce({ result: 'not found' }).mockResolvedValueOnce({ result: 'ok' });
    jest.spyOn(provider, 'getClient').mockResolvedValue({ uploader: { destroy } });
    expect((await provider.deleteFile('video-id')).success).toBe(true);
    expect(destroy.mock.calls).toEqual(['image', 'raw', 'video'].map(resource_type => ['video-id', { resource_type, invalidate: true }]));
  });
  test('legacy URL cleanup only infers this account’s assets and retains raw extensions', () => {
    const old = config.cloudinaryCloudName; config.cloudinaryCloudName = 'ours';
    try {
      expect(ownedAsset('https://res.cloudinary.com/other/image/upload/v1/photo.png')).toBeNull();
      expect(ownedAsset('https://res.cloudinary.com/ours/raw/upload/v1/kyc/doc.pdf').publicId).toBe('kyc/doc.pdf');
      expect([...collectMedia({ qrCodeUrl: 'https://res.cloudinary.com/ours/image/upload/v1/qr/code.png' }).keys()]).toEqual(['qr/code']);
    } finally { config.cloudinaryCloudName = old; }
  });
});

describe('Durable cleanup and shared references', () => {
  test('failed storage deletion stays queued and the worker removes it after a successful retry', async () => {
    const mongoose = (await import('../../backend/node_modules/mongoose/index.js')).default;
    const { StorageAsset } = await import('../../backend/src/models/StorageAsset.js');
    const { DevStorageProvider } = await import('../../backend/src/integrations/storage/DevStorageProvider.js');
    const { sweepStorageAssets } = await import('../../backend/src/services/storage/assetCleanup.js');
    jest.replaceProperty(mongoose.connection, '_readyState', 1);
    const queue = jest.spyOn(StorageAsset, 'updateOne').mockResolvedValue({});
    const forget = jest.spyOn(StorageAsset, 'deleteOne').mockResolvedValue({});
    setStorageProvider({ deleteFile: jest.fn().mockResolvedValue({ success: false }) });
    expect((await storageService.deleteFile('retry-me')).success).toBe(false);
    expect(queue).toHaveBeenCalledWith(expect.objectContaining({ publicId: 'retry-me' }), expect.objectContaining({ $set: expect.objectContaining({ deleteRequested: true }) }), { upsert: true });
    expect(forget).not.toHaveBeenCalled();
    for (const model of Object.values(mongoose.models)) jest.spyOn(model, 'exists').mockResolvedValue(null);
    jest.spyOn(StorageAsset, 'findOneAndUpdate').mockReturnValue({ lean: async () => ({ _id: 'asset', publicId: 'retry-me', attempts: 0 }) });
    const deletion = jest.spyOn(DevStorageProvider.prototype, 'deleteFile').mockResolvedValue({ success: true });
    const previous = config.storageProvider; config.storageProvider = 'development';
    try { await sweepStorageAssets({ limit: 1 }); } finally { config.storageProvider = previous; }
    expect(deletion).toHaveBeenCalledWith('retry-me');
    expect(forget).toHaveBeenCalledWith({ _id: 'asset' });
  });
  test('the cleanup worker retains media still referenced by a product or published content', async () => {
    const mongoose = (await import('../../backend/node_modules/mongoose/index.js')).default;
    const { StorageAsset } = await import('../../backend/src/models/StorageAsset.js');
    const { DevStorageProvider } = await import('../../backend/src/integrations/storage/DevStorageProvider.js');
    const { sweepStorageAssets } = await import('../../backend/src/services/storage/assetCleanup.js');
    jest.replaceProperty(mongoose.connection, '_readyState', 1);
    for (const model of Object.values(mongoose.models)) jest.spyOn(model, 'exists').mockResolvedValue(null);
    Banner.exists.mockResolvedValue({ _id: 'banner' });
    jest.spyOn(StorageAsset, 'findOneAndUpdate').mockReturnValue({ lean: async () => ({ _id: 'asset', publicId: 'shared' }) });
    const update = jest.spyOn(StorageAsset, 'updateOne').mockResolvedValue({});
    const deletion = jest.spyOn(DevStorageProvider.prototype, 'deleteFile').mockResolvedValue({ success: true });
    const now = new Date(); await sweepStorageAssets({ limit: 1, now });
    expect(deletion).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({ _id: 'asset' }, { $set: { checkAfter: new Date(+now + 86400000) } });
  });
});


test('shared legacy image URLs are protected even when their rows have no publicId', async () => {
  const mongoose = (await import('../../backend/node_modules/mongoose/index.js')).default;
  const { isAssetReferenced } = await import('../../backend/src/services/storage/assetCleanup.js');
  for (const model of Object.values(mongoose.models)) jest.spyOn(model, 'exists').mockResolvedValue(null);
  Product.exists.mockImplementation(async query => query.$or.some(condition => condition['images.url'] instanceof RegExp && condition['images.url'].test('https://res.cloudinary.com/ours/image/upload/v123/vinexus/products/shared.webp')) ? { _id: 'other-product' } : null);
  const previous = config.cloudinaryCloudName; config.cloudinaryCloudName = 'ours';
  try { expect(await isAssetReferenced({ publicId: 'vinexus/products/shared' })).toBe(true); }
  finally { config.cloudinaryCloudName = previous; }
});
