import mongoose from 'mongoose';

const cmsPageSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: [true, 'Page slug is required'],
      trim: true,
      lowercase: true,
      unique: true,
    },
    title: {
      type: String,
      required: [true, 'Page title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    content: {
      type: String,
      required: [true, 'Page content is required'],
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const CmsPage = mongoose.model('CmsPage', cmsPageSchema);
export default CmsPage;
