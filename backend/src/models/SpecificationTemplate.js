import '../audit/audit.js';
import mongoose from 'mongoose';
const specificationTemplateSchema = new mongoose.Schema({
  name: { type: String, trim: true, required: true, maxlength: 100 },
  nameKey: { type: String, required: true, unique: true },
  description: { type: String, trim: true, maxlength: 300, default: '' },
  specifications: { type: [{ key: { type: String, trim: true, required: true, maxlength: 100 }, value: { type: String, trim: true, required: true, maxlength: 2000 } }], required: true, validate: { validator: rows => rows.length >= 1 && rows.length <= 100, message: 'A template must contain between 1 and 100 specifications' } },
  revision: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
export const SpecificationTemplate = mongoose.model('SpecificationTemplate', specificationTemplateSchema);
