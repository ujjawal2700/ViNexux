import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  preset: { type: String, default: 'default' },
  draft: { type: mongoose.Schema.Types.Mixed, required: true },
  published: mongoose.Schema.Types.Mixed,
  publishedAt: Date,
  publishedSchedule: mongoose.Schema.Types.Mixed,
  schedule: { enabled: { type: Boolean, default: false }, startAt: { type: Date, default: null }, endAt: { type: Date, default: null }, priority: { type: Number, default: 0 } },
  archived: { type: Boolean, default: false },
  revision: { type: Number, default: 0 },
  history: { type: [mongoose.Schema.Types.Mixed], default: [] },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
export default mongoose.model('SeasonalTheme', schema);
