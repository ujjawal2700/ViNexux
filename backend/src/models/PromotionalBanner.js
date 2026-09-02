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

const promotionalBannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Banner title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    image: {
      type: bannerImageSchema,
      required: [true, 'Banner image is required'],
    },
    link: {
      type: String,
      trim: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: [0, 'Sort order cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (val) {
          if (val && this.startDate) {
            return val >= this.startDate;
          }
          return true;
        },
        message: 'End date cannot be earlier than start date',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying active promotional banners by schedule and sorting by sortOrder
promotionalBannerSchema.index({ isActive: 1, sortOrder: 1, startDate: 1, endDate: 1 });

export const PromotionalBanner = mongoose.model('PromotionalBanner', promotionalBannerSchema);
export default PromotionalBanner;
