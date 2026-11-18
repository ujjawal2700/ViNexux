import '../audit/audit.js';
import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  _id: { type: String, default: 'primary' },
  installerPriceIncreasePercent: { type: Number, default: 0, min: 0, max: 10000 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
export const DealerPricingSettings = mongoose.model('DealerPricingSettings', schema);
