import '../audit/audit.js';
import mongoose from 'mongoose';
import { ADMIN_SECTIONS } from '../../../shared/adminAccess.js';

const permission = new mongoose.Schema({ read: { type: Boolean, default: false }, write: { type: Boolean, default: false } }, { _id: false });
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 300, default: '' },
  permissions: { type: new mongoose.Schema(Object.fromEntries(ADMIN_SECTIONS.map(({ key }) => [key, { type: permission, default: () => ({}) }])), { _id: false }), required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
schema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
export const AccessRole = mongoose.model('AccessRole', schema);
