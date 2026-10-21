import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { createRequire } from 'node:module';
import { getStorageProvider, setStorageProvider } from '../../backend/src/integrations/storage/index.js';
import { storageService, prepareImageBuffer } from '../../backend/src/services/storage/storage.service.js';
import { CloudinaryStorageProvider } from '../../backend/src/integrations/storage/CloudinaryStorageProvider.js';

const sharp = createRequire(new URL('../../backend/package.json', import.meta.url))('sharp');
const originalProvider = getStorageProvider();
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20"><rect width="40" height="20" fill="#008020"/></svg>');
afterEach(() => { setStorageProvider(originalProvider); jest.restoreAllMocks(); });

describe('SVG image storage', () => {
  test('rasterizes before the Cloudinary upload stream receives bytes', async () => {
    let received, options;
    const provider = new CloudinaryStorageProvider({ cloudName: 'test', apiKey: 'test', apiSecret: 'test' });
    jest.spyOn(provider, 'getClient').mockResolvedValue({ uploader: { upload_stream: (opts, callback) => {
      options = opts;
      return { end: buffer => { received = buffer; callback(null, { secure_url: 'https://example.com/vector.webp', public_id: 'test/vector', resource_type: 'image', format: 'webp', bytes: buffer.length }); } };
    } } });
    setStorageProvider(provider);
    const result = await storageService.uploadFile({ buffer: svg, originalname: 'vector.svg', mimetype: 'image/svg+xml', folder: 'test' });
    expect(result.format).toBe('webp');
    expect(options.resource_type).toBe('image');
    expect((await sharp(received).metadata())).toMatchObject({ format: 'webp', width: 40, height: 20 });
    expect(received.toString()).not.toContain('<svg');
  });

  test.each([
    '<svg><script>alert(1)</script></svg>',
    '<svg><image href="https://example.com/secret.png"/></svg>',
    '<svg><foreignObject><p>HTML</p></foreignObject></svg>',
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>',
    '<svg><style>@import "https://example.com/style.css";</style></svg>',
    'not an image',
  ])('rejects unsafe or invalid SVG before contacting storage: %s', async source => {
    const uploadFile = jest.fn();
    setStorageProvider({ uploadFile });
    await expect(storageService.uploadFile({ buffer: Buffer.from(source), originalname: 'bad.svg', mimetype: 'image/svg+xml' }))
      .rejects.toMatchObject({ statusCode: 400, details: [{ path: 'images', message: expect.any(String) }] });
    expect(uploadFile).not.toHaveBeenCalled();
  });

  test('invalid raster content also fails rather than uploading the unconverted file', async () => {
    await expect(prepareImageBuffer(Buffer.from('bad png'), 'image/png')).rejects.toMatchObject({ statusCode: 400 });
  });
  test('lossless QR conversion preserves every pixel for scanning', async () => {
    const prepared = await prepareImageBuffer(svg, 'image/svg+xml', { lossless: true });
    const before = await sharp(svg).ensureAlpha().raw().toBuffer();
    const after = await sharp(prepared.buffer).ensureAlpha().raw().toBuffer();
    expect(after).toEqual(before);
  });
  test('PDF documents pass through unchanged', async () => {
    const buffer = Buffer.from('%PDF-test');
    expect(await prepareImageBuffer(buffer, 'application/pdf')).toEqual({ buffer, mimetype: 'application/pdf', extension: null });
  });
});
