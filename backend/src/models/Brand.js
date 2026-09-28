import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, maxlength: 100 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
  logo: {
    url: { type: String, trim: true },
    publicId: { type: String, trim: true },
  },
  description: { type: String, trim: true, maxlength: 500 },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

brandSchema.index({ isActive: 1, sortOrder: 1, name: 1 });
export const Brand = mongoose.model('Brand', brandSchema);
