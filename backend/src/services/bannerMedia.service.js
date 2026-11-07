import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { config } from '../config/env.js';
import { storageService } from './storage/storage.service.js';
import { compressBannerVideo } from './bannerVideo.service.js';
import { storeLocalThemeImage, THEME_ASSET_DIRECTORY } from './themeAssets.service.js';

export async function discardBannerMedia(asset) {
  for (const id of [asset?.publicId, asset?.posterPublicId].filter(Boolean)) {
    if (/^local-themes\/[a-f\d-]+\.(mp4|webp)$/.test(id)) await unlink(join(THEME_ASSET_DIRECTORY, id.split('/').at(-1))).catch(() => {});
    else await storageService.deleteFile(id);
  }
}
export async function storeBannerVideo(file, origin) {
  const prepared = await compressBannerVideo(file);
  const asset = { mediaType: 'video', duration: prepared.duration, bytes: prepared.buffer.length };
  try {
    if (config.storageProvider === 'development') {
      await mkdir(THEME_ASSET_DIRECTORY, { recursive: true });
      const filename = `${randomUUID()}.mp4`;
      await writeFile(join(THEME_ASSET_DIRECTORY, filename), prepared.buffer, { flag: 'wx' });
      asset.publicId = `local-themes/${filename}`; asset.url = `${origin}${config.apiBaseUrl}/content/theme-assets/${filename}`;
      const poster = await storeLocalThemeImage({ buffer: prepared.poster, mimetype: 'image/webp' });
      asset.posterPublicId = poster.publicId; asset.posterUrl = `${origin}${config.apiBaseUrl}/content/theme-assets/${poster.filename}`;
    } else {
      const video = await storageService.uploadFile({ buffer: prepared.buffer, mimetype: 'video/mp4', originalname: 'banner.mp4', folder: 'vinexus/bento-banners', category: 'cms' });
      asset.publicId = video.publicId; asset.url = video.url;
      const poster = await storageService.uploadFile({ buffer: prepared.poster, mimetype: 'image/webp', originalname: 'poster.webp', folder: 'vinexus/bento-banners/posters', category: 'cms' });
      asset.posterPublicId = poster.publicId; asset.posterUrl = poster.url;
    }
    return asset;
  } catch (error) { await discardBannerMedia(asset); throw error; }
}
