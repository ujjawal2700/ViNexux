import mongoose from 'mongoose';

const bannerImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'Banner image URL is required'],
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [300, 'Subtitle cannot exceed 300 characters'],
    },
    image: {
      type: bannerImageSchema,
      required: [true, 'Banner image is required'],
    },
    link: {
      type: String,
      trim: true,
    },
    buttonText: {
      type: String,
      trim: true,
      maxlength: [50, 'Button text cannot exceed 50 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: [0, 'Sort order cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying active hero banners sorted by sortOrder
bannerSchema.index({ isActive: 1, sortOrder: 1 });

export const Banner = mongoose.model('Banner', bannerSchema);
export default Banner;
