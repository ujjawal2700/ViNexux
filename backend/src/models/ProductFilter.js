import '../audit/audit.js';
import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({ label: { type: String, trim: true, required: true, maxlength: 120 } });
const schema = new mongoose.Schema({
  name: { type: String, trim: true, required: true, maxlength: 100 },
  nameKey: { type: String, required: true, unique: true },
  type: { type: String, enum: ['checkbox', 'radio', 'select'], default: 'checkbox' },
  options: { type: [optionSchema], default: [] },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, min: 0, default: 0 },
}, { timestamps: true });
schema.index({ isActive: 1, sortOrder: 1, name: 1 });
export const ProductFilter = mongoose.model('ProductFilter', schema);
