import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { prepareImageBuffer } from './storage/storage.service.js';

export const THEME_ASSET_DIRECTORY = process.env.NODE_ENV === 'test' && process.env.TEST_THEME_ASSET_DIRECTORY
  ? process.env.TEST_THEME_ASSET_DIRECTORY
  : fileURLToPath(new URL('../../var/theme-assets/', import.meta.url));
// Development uploads must be real files, not the mock provider's non-existent URLs.
export async function storeLocalThemeImage(file, directory = THEME_ASSET_DIRECTORY) {
  const { buffer } = await prepareImageBuffer(file.buffer, file.mimetype || 'image/png');
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.webp`;
  await writeFile(join(directory, filename), buffer, { flag: 'wx' });
  return { filename, publicId: `local-themes/${filename}` };
}
