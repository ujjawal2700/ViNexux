import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  eventKey: { type: String, required: true, unique: true },
  title: { type: String, required: true }, body: { type: String, required: true },
  link: { type: String, required: true },
}, { timestamps: true });
export const AdminArrival = mongoose.model('AdminArrival', schema);
