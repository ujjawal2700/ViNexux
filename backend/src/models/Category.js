import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    // Category slugs are intentionally globally unique so categories/subcategories can be resolved directly by slug without requiring parentId
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      trim: true,
      lowercase: true,
      unique: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    image: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
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

// Compound index for efficient catalog navigation queries (filtering by parentId, status, and sorting by sortOrder)
categorySchema.index({ parentId: 1, isActive: 1, sortOrder: 1 });

export const Category = mongoose.model('Category', categorySchema);
export default Category;
