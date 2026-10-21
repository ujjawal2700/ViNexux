import { describe, expect, test } from '@jest/globals';
import { PassThrough } from 'node:stream';
import { createRequire } from 'node:module';
import { getProductImageMimeType } from '../../shared/productImageTypes.js';
import { uploadSingle } from '../../backend/src/middlewares/upload.middleware.js';

const sharp = createRequire(new URL('../../backend/package.json', import.meta.url))('sharp');

const upload = async (filename, mimetype, buffer, category = 'product') => {
  const boundary = 'product-image-test-boundary';
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimetype}\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const req = new PassThrough();
  req.headers = {
    'content-type': `multipart/form-data; boundary=${boundary}`,
    'content-length': String(body.length),
  };
  const done = new Promise((resolve, reject) => {
    uploadSingle('file', category)(req, {}, (error) => error ? reject(error) : resolve(req.file));
  });
  req.end(body);
  return done;
};

describe('product gallery image uploads', () => {
  test.each([
    ['jpg', 'image/jpeg', 'jpeg'],
    ['jpeg', 'image/jpeg', 'jpeg'],
    ['png', 'image/png', 'png'],
    ['webp', 'image/webp', 'webp'],
    ['PNG', 'application/octet-stream', 'png'],
    ['png', 'image/x-png', 'png'],
    ['jpg', 'image/jpg', 'jpeg'],
  ])('accepts .%s with MIME %s through multipart validation', async (extension, mime, format) => {
    const buffer = await sharp({ create: { width: 2, height: 2, channels: 4, background: '#00ff00' } })
      .toFormat(format).toBuffer();
    const file = await upload(`product.${extension}`, mime, buffer);
    expect(file.mimetype).toBe(`image/${format}`);
    expect(file.buffer).toEqual(buffer);
  });

  test.each(['jpg', 'jpeg', 'png', 'webp', 'PNG'])('accepts .%s when a browser omits the MIME type', (extension) => {
    expect(getProductImageMimeType(`product.${extension}`, '')).toBeTruthy();
  });

  test.each([
    ['product.png', 'application/pdf'],
    ['product.gif', 'application/octet-stream'],
    ['product.exe', 'image/png'],
  ])('rejects unsupported uploads: %s (%s)', async (filename, mime) => {
    await expect(upload(filename, mime, Buffer.from('invalid file'))).rejects.toMatchObject({ statusCode: 400 });
  });

  test.each(['product', 'cms', 'general', 'kyc'])('accepts SVG multipart uploads for %s', async category => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>');
    const file = await upload('vector.svg', 'image/svg+xml', svg, category);
    expect(file.mimetype).toBe('image/svg+xml');
    const fallback = await upload('vector.SVG', 'application/octet-stream', svg, category);
    expect(fallback.mimetype).toBe('image/svg+xml');
  });

  test('retains the 5MB product image limit', async () => {
    await expect(upload('product.png', 'image/png', Buffer.alloc(5 * 1024 * 1024 + 1)))
      .rejects.toMatchObject({ statusCode: 400, message: 'File size exceeds the maximum limit of 5MB.' });
  });
});
