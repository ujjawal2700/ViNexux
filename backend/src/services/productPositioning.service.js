import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { ProductPositionCounter } from '../models/ProductPositionCounter.js';
import { AppError } from '../utils/AppError.js';
import { compareHeaderProductPositions } from '../../../shared/headerProductPositioning.js';

export const getProductPositioning = async () => {
  const categories = await Category.find({ parentId: null }).lean();
  return categories.sort(compareHeaderProductPositions);
};

export const updateProductPositioning = async (id, productPriority) => {
  if (!mongoose.Types.ObjectId.isValid(id) || (productPriority !== null &&
    (!Number.isInteger(productPriority) || productPriority < 0 || productPriority > 1000000))) {
    throw new AppError('Enter a whole position number from 0 to 1000000, or clear the position.', 400, 'VALIDATION_ERROR');
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const category = await Category.findOne({ _id: id, parentId: null }).lean();
    if (!category) throw new AppError('Header category not found.', 404, 'NOT_FOUND');
    if ((category.productPriority ?? null) === productPriority) return category;
    const counter = productPriority === null ? null : await ProductPositionCounter.findOneAndUpdate(
      { _id: 'header-product-position' }, { $inc: { sequence: 1 } }, { upsert: true, new: true },
    );
    const updated = await Category.findOneAndUpdate({
      _id: id, parentId: null,
      productPriority: category.productPriority ?? null,
      productPositionSequence: category.productPositionSequence ?? null,
    }, { $set: { productPriority, productPositionSequence: counter?.sequence ?? null } }, { new: true, runValidators: true });
    if (updated) return updated;
  }
  throw new AppError('Position changed while saving. Refresh and try again.', 409, 'CONFLICT');
};
