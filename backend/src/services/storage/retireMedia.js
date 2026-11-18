import { config } from '../../config/env.js';
import { storageService } from './storage.service.js';
import { isAssetReferenced, storageDatabaseReady, trackStorageAsset } from './assetCleanup.js';

// Infer legacy IDs only for URLs in this application's own Cloudinary account.
export function ownedAsset(value) {
  if (value && typeof value === 'object' && value.publicId) return { publicId: value.publicId, url: value.url || '' };
  const url = typeof value === 'string' ? value : value?.url;
  if (!url || !config.cloudinaryCloudName) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'res.cloudinary.com') return null;
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments[0] !== config.cloudinaryCloudName || !['image', 'raw', 'video'].includes(segments[1]) || segments[2] !== 'upload') return null;
    const version = segments.findIndex((segment, index) => index >= 3 && /^v\d+$/.test(segment));
    if (version < 0) return null;
    let publicId = decodeURIComponent(segments.slice(version + 1).join('/'));
    if (segments[1] !== 'raw') publicId = publicId.replace(/\.[^/.]+$/, '');
    return publicId ? { publicId, url, resourceType: segments[1] } : null;
  } catch { return null; }
}
export function collectMedia(value, result = new Map()) {
  if (value?.toObject) value = value.toObject();
  const asset = ownedAsset(value);
  if (asset) result.set(asset.publicId, asset);
  if (Array.isArray(value)) value.forEach(item => collectMedia(item, result));
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
    if (key === 'posterPublicId' && item) result.set(item, { publicId: item, url: value.posterUrl || '' });
    else if (key !== '_id' && key !== 'publicId' && !(item instanceof Date) && !(item instanceof Buffer)) collectMedia(item, result);
  }
  return result;
}
export async function retireRemovedMedia(previous, current) {
  const next = collectMedia(current);
  for (const asset of collectMedia(previous).values()) {
    if (next.has(asset.publicId)) continue;
    // Persist even when another placement or published theme still uses it.
    // The worker rechecks references later instead of breaking shared media.
    await trackStorageAsset(asset, { deleteRequested: true });
    if (storageDatabaseReady() && await isAssetReferenced(asset)) continue;
    await storageService.deleteFile(asset.publicId);
  }
}
