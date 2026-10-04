import mongoose from 'mongoose';
import { invalidateCategoryCache } from '../utils/categoryCache.js';

const filterDefinitionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 50 },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    inputType: {
      type: String,
      enum: ['select', 'multi-select', 'text', 'number', 'boolean'],
      default: 'select',
    },
    options: [{ type: String, trim: true, maxlength: 100 }],
    unit: { type: String, trim: true, maxlength: 20 },
    isRequired: { type: Boolean, default: false },
    isFilterable: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

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
    // Admin-defined product fields for this category. Descendants inherit
    // definitions from every ancestor and may add/override fields by key.
    filterDefinitions: {
      type: [filterDefinitionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient catalog navigation queries (filtering by parentId, status, and sorting by sortOrder)
categorySchema.index({ parentId: 1, isActive: 1, sortOrder: 1 });

// Any write must drop the cached public category tree (see utils/categoryCache.js).
categorySchema.post('save', invalidateCategoryCache);
categorySchema.post('insertMany', invalidateCategoryCache);
categorySchema.post(
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete'],
  invalidateCategoryCache
);
categorySchema.post('deleteOne', { document: true, query: false }, invalidateCategoryCache);

export const Category = mongoose.model('Category', categorySchema);
export default Category;
