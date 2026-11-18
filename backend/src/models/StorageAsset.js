import mongoose from 'mongoose';
// No TTL: a failed delete must stay retryable, even across server restarts.
const schema = new mongoose.Schema({
  publicId: { type: String, required: true }, url: String,
  provider: { type: String, required: true },
  resourceType: String,
  deleteRequested: { type: Boolean, default: false },
  checkAfter: { type: Date, required: true, index: true },
  attempts: { type: Number, default: 0 }, lastError: String,
}, { timestamps: true });
schema.index({ provider: 1, publicId: 1 }, { unique: true });
export const StorageAsset = mongoose.model('StorageAsset', schema);
