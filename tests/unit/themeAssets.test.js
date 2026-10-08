import { describe, expect, test } from '@jest/globals';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { storeLocalThemeImage } from '../../backend/src/services/themeAssets.service.js';
const sharp = createRequire(new URL('../../backend/package.json', import.meta.url))('sharp');

describe('real local theme image storage', () => {
  test('stores a decodable WebP rather than returning a mock image URL', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vinexus-theme-test-'));
    try {
      const buffer = await sharp({ create: { width: 8, height: 4, channels: 4, background: '#ffcc00' } }).png().toBuffer();
      const asset = await storeLocalThemeImage({ buffer }, directory);
      expect(asset.filename).toMatch(/^[0-9a-f-]+\.webp$/);
      const saved = await readFile(join(directory, asset.filename));
      const metadata = await sharp(saved).metadata();
      expect(metadata.format).toBe('webp'); expect(metadata.width).toBe(8); expect(metadata.height).toBe(4);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
  test('rejects invalid image contents even if their MIME type claims to be PNG', async () => {
    await expect(storeLocalThemeImage({ buffer: Buffer.from('not an image') })).rejects.toMatchObject({ statusCode: 400 });
  });
});
