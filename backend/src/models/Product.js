import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';

const productImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
    altText: {
      type: String,
      trim: true,
      maxlength: [150, 'Alt text cannot exceed 150 characters'],
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: [0, 'Image sort order cannot be negative'],
    },
  },
  { _id: false }
);

const productSpecificationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Specification key is required'],
      trim: true,
      maxlength: [50, 'Specification key cannot exceed 50 characters'],
    },
    value: {
      type: String,
      required: [true, 'Specification value is required'],
      trim: true,
      maxlength: [255, 'Specification value cannot exceed 255 characters'],
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, 'Product SKU is required'],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [50, 'SKU cannot exceed 50 characters'],
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [150, 'Product name cannot exceed 150 characters'],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category ID is required'],
    },
    modelNumber: {
      type: String,
      required: [true, 'Model number is required'],
      trim: true,
      unique: true,
      sparse: true,
      default: () => `VNX-${randomBytes(5).toString('hex').toUpperCase()}`,
      maxlength: [100, 'Model number cannot exceed 100 characters'],
    },
    model: {
      type: String,
      required: [true, 'Model is required'],
      trim: true,
      default: 'Standard Model',
      maxlength: [100, 'Model cannot exceed 100 characters'],
    },
    informationPhone: {
      type: String,
      trim: true,
      maxlength: [20, 'Information phone cannot exceed 20 characters'],
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    images: [productImageSchema],
    specifications: [productSpecificationSchema],
    standardPrice: {
      type: Number,
      default: 0,
      min: [0, 'Standard price cannot be negative'],
    },
    dealerPrice: {
      type: Number,
      default: 0,
      min: [0, 'Dealer price cannot be negative'],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying active products by category
productSchema.index({ categoryId: 1, isActive: 1 });

// Compound index for querying active featured products (e.g. homepage showcase)
productSchema.index({ isFeatured: 1, isActive: 1 });

export const Product = mongoose.model('Product', productSchema);
export default Product;
