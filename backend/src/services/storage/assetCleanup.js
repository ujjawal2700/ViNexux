import mongoose from 'mongoose';
import { StorageAsset } from '../../models/StorageAsset.js';
import { config } from '../../config/env.js';
import { createStorageProvider } from '../../integrations/storage/index.js';

const DAY = 86400000;
export const storageProviderKey = () => ['cloud', 'cloudinary'].includes(config.storageProvider) ? 'cloudinary' : 'development';
export const storageDatabaseReady = () => mongoose.connection.readyState === 1;
const referenceFields = {
  Product: ['images', 'variants.images', 'variantImageAssets'], DealerProfile: ['kycDocuments'],
  Brand: ['logo'], Banner: ['image'], PromotionalBanner: ['image'], TrustBadge: ['icon'],
  WebsiteSettings: ['favicon', 'logo', 'ogImage'], BannerGrid: ['sections.images'],
  SeasonalTheme: ['draft.assets.header', 'draft.assets.background', 'draft.assets.footer', 'published.assets.header', 'published.assets.background', 'published.assets.footer', 'history.config.assets.header', 'history.config.assets.background', 'history.config.assets.footer'],
};
export async function isAssetReferenced(asset, { excludeProductId } = {}) {
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const legacyUrl = config.cloudinaryCloudName ? new RegExp(`^https://res\\.cloudinary\\.com/${escape(config.cloudinaryCloudName)}/(?:image|raw|video)/upload/(?:[^?]*/)?${escape(asset.publicId)}(?:\\.[^/?#]+)?(?:\\?[^#]*)?$`) : null;
  for (const [name, fields] of Object.entries(referenceFields)) {
    const model = mongoose.models[name];
    if (!model) continue;
    const conditions = fields.flatMap(field => [{ [`${field}.publicId`]: asset.publicId }, ...(asset.url ? [{ [`${field}.url`]: asset.url }] : []), ...(legacyUrl ? [{ [`${field}.url`]: legacyUrl }] : [])]);
    if (name === 'BannerGrid') conditions.push({ 'sections.images.posterPublicId': asset.publicId });
    if (await model.exists({ ...(name === 'Product' && excludeProductId ? { _id: { $ne: excludeProductId } } : {}), $or: conditions })) return true;
  }
  if ((asset.url || legacyUrl) && mongoose.models.FooterContent && await mongoose.models.FooterContent.exists({ $or: ['bankAccounts.qrCodeUrl', 'socialLinks.iconUrl', 'quickLinks.iconUrl', 'legalLinks.iconUrl'].flatMap(field => [...(asset.url ? [{ [field]: asset.url }] : []), ...(legacyUrl ? [{ [field]: legacyUrl }] : [])]) })) return true;
  if (asset.url && mongoose.models.Campaign) {
    const escaped = asset.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (await mongoose.models.Campaign.exists({ $or: [{ 'email.html': new RegExp(escaped) }, { 'email.blocks.imageUrl': asset.url }, { 'push.imageUrl': asset.url }] })) return true;
  }
  return false;
}
export async function trackStorageAsset(asset, { deleteRequested = false } = {}) {
  if (!storageDatabaseReady() || !asset.publicId) return;
  await StorageAsset.updateOne({ provider: storageProviderKey(), publicId: asset.publicId }, {
    $set: { ...(asset.url ? { url: asset.url } : {}), ...(asset.resourceType ? { resourceType: asset.resourceType } : {}), deleteRequested, checkAfter: new Date(Date.now() + (deleteRequested ? 60000 : DAY)) },
  }, { upsert: true });
}
export async function forgetStorageAsset(publicId) {
  if (storageDatabaseReady()) await StorageAsset.deleteOne({ provider: storageProviderKey(), publicId });
}
export async function sweepStorageAssets({ now = new Date(), limit = 50 } = {}) {
  if (!storageDatabaseReady()) return;
  const providerKey = storageProviderKey();
  const provider = createStorageProvider(providerKey);
  for (let i = 0; i < limit; i++) {
    // Claim with a lease; safe with multiple PM2 workers and process restarts.
    const asset = await StorageAsset.findOneAndUpdate({ provider: providerKey, checkAfter: { $lte: now } }, { $set: { checkAfter: new Date(+now + 300000) } }, { new: true, sort: { checkAfter: 1 } }).lean();
    if (!asset) break;
    try {
      if (await isAssetReferenced(asset)) {
        await StorageAsset.updateOne({ _id: asset._id }, { $set: { checkAfter: new Date(+now + DAY) } });
        continue;
      }
      const result = await provider.deleteFile(asset.publicId);
      if (!result.success) throw new Error('Storage provider did not confirm deletion');
      await StorageAsset.deleteOne({ _id: asset._id });
    } catch (error) {
      await StorageAsset.updateOne({ _id: asset._id }, { $inc: { attempts: 1 }, $set: { lastError: error.message, checkAfter: new Date(+now + Math.min(DAY, 60000 * 2 ** Math.min(asset.attempts || 0, 10))) } });
    }
  }
}
export function startStorageCleanupWorker() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await sweepStorageAssets(); } catch (error) { console.warn(`[StorageCleanup] ${error.message}`); }
    finally { running = false; }
  };
  void tick();
  const interval = setInterval(tick, 60000); interval.unref();
  return () => clearInterval(interval);
}
