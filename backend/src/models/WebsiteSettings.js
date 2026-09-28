import mongoose from 'mongoose';

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
    websiteName: { type: String, trim: true, required: true, default: 'Vi Nexus', maxlength: 150 },
    metaTitle: {
      type: String,
      trim: true,
      required: true,
      default: 'Vi Nexus | B2B CCTV & Security Equipment Distributor',
      maxlength: 200,
    },
    metaDescription: {
      type: String,
      trim: true,
      required: true,
      default: 'Vi Nexus is a leading B2B distributor of CCTV cameras, networking gear, and security accessories in India.',
      maxlength: 500,
    },
    favicon: { type: imageAssetSchema, default: () => ({ url: '/favicon.jpeg', publicId: '' }) },
    logo: { type: imageAssetSchema, default: () => ({ url: '/logo.png', publicId: '' }) },
    ogImage: { type: imageAssetSchema, default: () => ({ url: '/favicon.jpeg', publicId: '' }) },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export const WebsiteSettings = mongoose.model('WebsiteSettings', websiteSettingsSchema);
export default WebsiteSettings;
