import mongoose from 'mongoose';
import { BENTO_TRANSITIONS } from '../../../shared/bannerGrid.js';

const image = new mongoose.Schema({
  url: { type: String, required: true }, publicId: String,
  title: { type: String, maxlength: 150, default: '' },
  link: { type: String, maxlength: 2000, default: '' },
  fit: { type: String, enum: ['cover', 'contain'], default: 'cover' },
  positionX: { type: Number, min: 0, max: 100, default: 50 },
  positionY: { type: Number, min: 0, max: 100, default: 50 },
  zoom: { type: Number, min: 1, max: 3, default: 1 },
});
const section = new mongoose.Schema({ transition: { type: String, enum: BENTO_TRANSITIONS, default: 'fade' }, images: { type: [image], default: [], validate: v => v.length <= 3 } }, { _id: false });
const schema = new mongoose.Schema({
  singletonKey: { type: String, unique: true, default: 'primary' },
  sections: { type: [section], required: true, validate: v => v.length === 4 },
  configured: { type: Boolean, default: false }, revision: { type: Number, default: 0 },
}, { timestamps: true });
export default mongoose.model('BannerGrid', schema);
