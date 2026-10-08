import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import sharp from 'sharp';
import { AppError } from '../utils/AppError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

export const THEME_ASSET_DIRECTORY = fileURLToPath(new URL('../../var/theme-assets/', import.meta.url));
// Development uploads must be real files, not the mock provider's non-existent URLs.
export async function storeLocalThemeImage(file, directory = THEME_ASSET_DIRECTORY) {
  let buffer;
  try {
    buffer = await sharp(file.buffer).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  } catch {
    throw new AppError('This image could not be decoded. Please upload a valid PNG, JPG or WebP.', 400, ERROR_CODES.VALIDATION_ERROR);
  }
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.webp`;
  await writeFile(join(directory, filename), buffer, { flag: 'wx' });
  return { filename, publicId: `local-themes/${filename}` };
}
