import mongoose from 'mongoose';

const footerLinkSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, 'Link label is required'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Link URL is required'],
      trim: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: [0, 'Sort order cannot be negative'],
    },
  },
  { _id: false }
);

const footerContentSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      trim: true,
    },
    companyDescription: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    quickLinks: [footerLinkSchema],
    legalLinks: [footerLinkSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fetching active footer configuration
footerContentSchema.index({ isActive: 1 });

export const FooterContent = mongoose.model('FooterContent', footerContentSchema);
export default FooterContent;
