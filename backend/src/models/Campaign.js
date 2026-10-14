import '../audit/audit.js';
import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: String, channel: { type: String, enum: ['email', 'push'] }, audience: Object, email: Object, push: Object,
  status: { type: String, enum: ['draft', 'queued', 'sending', 'completed', 'cancelled'], default: 'draft' },
  revision: { type: Number, default: 0 }, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  queuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, queuedAt: Date, completedAt: Date,
  totalRecipients: { type: Number, default: 0 }, deliveryMode: String,
}, { timestamps: true });
schema.index({ createdAt: -1 });
export const Campaign = mongoose.model('Campaign', schema);
const jobSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, recipientKey: String,
  status: { type: String, enum: ['pending', 'processing', 'accepted', 'failed', 'skipped', 'simulated', 'uncertain'], default: 'pending' },
  startedAt: Date, finishedAt: Date, provider: String, messageId: String,
  acceptedDevices: Number, failedDevices: Number, reason: String,
}, { timestamps: true });
jobSchema.index({ campaignId: 1, recipientKey: 1 }, { unique: true });
jobSchema.index({ status: 1, createdAt: 1 });
export const CampaignDelivery = mongoose.model('CampaignDelivery', jobSchema);
