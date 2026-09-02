import mongoose from 'mongoose';

const badgeIconSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'Icon image URL is required'],
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const trustBadgeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Trust badge title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },
    icon: {
      type: badgeIconSchema,
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

// Compound index for querying active trust badges sorted by sortOrder
trustBadgeSchema.index({ isActive: 1, sortOrder: 1 });

export const TrustBadge = mongoose.model('TrustBadge', trustBadgeSchema);
export default TrustBadge;
