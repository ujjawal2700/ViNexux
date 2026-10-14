import '../audit/audit.js';
import mongoose from 'mongoose';
// Serializes account changes for one browser token, including first registration.
const schema = new mongoose.Schema({ _id: { type: String, required: true }, userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } }, { timestamps: true });
export const PushDevice = mongoose.model('PushDevice', schema);
