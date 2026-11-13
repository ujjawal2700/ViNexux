import '../audit/audit.js';
import mongoose from 'mongoose';
import { BENTO_TRANSITIONS, BENTO_IMAGE_LIMIT, BENTO_SECTION_COUNT, BANNER_ROTATION_MIN_SECONDS, BANNER_ROTATION_MAX_SECONDS } from '../../../shared/bannerGrid.js';

const image = new mongoose.Schema({
  url: { type: String, required: true }, publicId: String,
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  posterUrl: { type: String, default: '' }, posterPublicId: { type: String, default: '' },
  duration: Number, bytes: Number,
  title: { type: String, maxlength: 150, default: '' },
  link: { type: String, maxlength: 2000, default: '' },
  fit: { type: String, enum: ['cover', 'contain'], default: 'cover' },
  positionX: { type: Number, min: 0, max: 100, default: 50 },
  positionY: { type: Number, min: 0, max: 100, default: 50 },
  zoom: { type: Number, min: 1, max: 3, default: 1 },
});
const section = new mongoose.Schema({ rotationSeconds: { type: Number, min: BANNER_ROTATION_MIN_SECONDS, max: BANNER_ROTATION_MAX_SECONDS }, transition: { type: String, enum: BENTO_TRANSITIONS, default: 'fade' }, images: { type: [image], default: [], validate: v => v.length <= BENTO_IMAGE_LIMIT } }, { _id: false });
const schema = new mongoose.Schema({
  singletonKey: { type: String, unique: true, default: 'primary' },
  sections: { type: [section], required: true, validate: v => v.length === BENTO_SECTION_COUNT },
  configured: { type: Boolean, default: false }, revision: { type: Number, default: 0 },
}, { timestamps: true });
export default mongoose.model('BannerGrid', schema);
