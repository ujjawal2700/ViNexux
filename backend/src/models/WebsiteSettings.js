import mongoose from 'mongoose';
import { DEFAULT_QUICK_SPEC_KEYS } from '../../../shared/productSpecifications.js';

const imageAssetSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, default: '' },
    publicId: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const websiteSettingsSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: 'primary', unique: true, immutable: true },
    quickSpecKeys: { type: [{ type: String, trim: true, maxlength: 80 }], default: () => [...DEFAULT_QUICK_SPEC_KEYS] },
    activeThemeId: { type: String, default: null },
    websiteName: { type: String, trim: true, required: true, default: 'Vinexus', maxlength: 150 },
    metaTitle: {
      type: String,
      trim: true,
      required: true,
      default: 'Vinexus | IT, Laptop, CCTV & Networking Products',
      maxlength: 200,
    },
    metaDescription: {
      type: String,
      trim: true,
      required: true,
      default: 'Browse laptops, computers, CCTV, networking and IT products on Vinexus. Explore product details and send an enquiry to our team.',
      maxlength: 500,
    },
    favicon: { type: imageAssetSchema, default: () => ({ url: '/favicon.jpeg', publicId: '' }) },
    logo: { type: imageAssetSchema, default: () => ({ url: '/logo.png', publicId: '' }) },
    ogImage: { type: imageAssetSchema, default: () => ({ url: '/social-preview.png', publicId: '' }) },
    promoPopupIntervalMinutes: { type: Number, default: 15, min: 1, max: 1440 },
    promoPopupEnabled: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export const WebsiteSettings = mongoose.model('WebsiteSettings', websiteSettingsSchema);
export default WebsiteSettings;
