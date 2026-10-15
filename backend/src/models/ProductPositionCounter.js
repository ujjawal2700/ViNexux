import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  _id: { type: String },
  sequence: { type: Number, default: 0 },
});

// One atomic counter orders assignments even when admins save simultaneously.
export const ProductPositionCounter = mongoose.model('ProductPositionCounter', schema);
