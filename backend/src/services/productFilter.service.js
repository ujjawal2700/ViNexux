import mongoose from 'mongoose';
import { ProductFilter } from '../models/ProductFilter.js';
import { Product } from '../models/Product.js';
import { AppError } from '../utils/AppError.js';
const notFound = () => new AppError('Filter not found.', 404, 'NOT_FOUND');
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const shortProduct = product => ({ _id: product._id, name: product.name || 'Untitled product', sku: product.sku, images: (product.images || []).slice(0, 1), isActive: product.isActive });
export const productFilterService = {
  async list() {
    const filters = await ProductFilter.find().sort({ sortOrder: 1, name: 1, _id: 1 }).lean();
    const counts = await Product.aggregate([{ $unwind: '$filterOptionIds' }, { $group: { _id: '$filterOptionIds', count: { $sum: 1 } } }]);
    const byId = new Map(counts.map(item => [String(item._id), item.count]));
    return filters.map(filter => ({ ...filter, options: filter.options.map(option => ({ ...option, productCount: byId.get(String(option._id)) || 0 })) }));
  },
  async get(id) {
    const filter = await ProductFilter.findById(id).lean();
    if (!filter) throw notFound();
    const products = await Product.find({ filterOptionIds: { $in: filter.options.map(option => option._id) } }).select('_id name sku images isActive filterOptionIds').sort({ name: 1, _id: 1 }).lean();
    return { ...filter, options: filter.options.map(option => ({ ...option, products: products.filter(product => product.filterOptionIds.some(id => String(id) === String(option._id))).map(shortProduct) })) };
  },
  async searchProducts({ search = '', page = 1, limit = 20 }) {
    const pattern = new RegExp(escape(search), 'i');
    const match = search ? { $or: [{ name: pattern }, { sku: pattern }, { modelNumber: pattern }] } : {};
    const [products, total] = await Promise.all([Product.find(match).select('_id name sku images isActive').sort({ name: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(), Product.countDocuments(match)]);
    return { products: products.map(shortProduct), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
  async save(id, input) {
    const session = await mongoose.startSession();
    let filterId;
    try {
      await session.withTransaction(async () => {
        const existing = id ? await ProductFilter.findById(id).session(session) : null;
        if (id && !existing) throw notFound();
        const existingOptionIds = new Set((existing?.options || []).map(option => String(option._id)));
        if (input.options.some(option => option.id && !existingOptionIds.has(option.id))) throw new AppError('An option does not belong to this filter. Reload and try again.', 400, 'VALIDATION_ERROR');
        const productIds = [...new Set(input.options.flatMap(option => option.productIds))];
        if (await Product.countDocuments({ _id: { $in: productIds } }).session(session) !== productIds.length) throw new AppError('One or more selected products no longer exist. Reload the filter and choose products again.', 400, 'VALIDATION_ERROR');
        const options = input.options.map(option => ({ _id: option.id || new mongoose.Types.ObjectId(), label: option.label }));
        const filter = existing || new ProductFilter();
        Object.assign(filter, { name: input.name, nameKey: input.name.toLowerCase().replace(/\s+/g, ' '), type: input.type, options, isActive: input.isActive, sortOrder: input.sortOrder });
        await filter.save({ session }); filterId = filter._id;
        const oldIds = [...existingOptionIds].map(value => new mongoose.Types.ObjectId(value));
        if (oldIds.length) await Product.updateMany({ filterOptionIds: { $in: oldIds } }, { $pull: { filterOptionIds: { $in: oldIds } } }, { session });
        for (let index = 0; index < options.length; index++) {
          const ids = [...new Set(input.options[index].productIds)];
          if (ids.length) await Product.updateMany({ _id: { $in: ids } }, { $addToSet: { filterOptionIds: options[index]._id } }, { session });
        }
      });
    } finally { await session.endSession(); }
    return this.get(filterId);
  },
  async remove(id) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const filter = await ProductFilter.findById(id).session(session);
        if (!filter) throw notFound();
        await Product.updateMany({ filterOptionIds: { $in: filter.options.map(option => option._id) } }, { $pull: { filterOptionIds: { $in: filter.options.map(option => option._id) } } }, { session });
        await filter.deleteOne({ session });
      });
    } finally { await session.endSession(); }
    return { deleted: true };
  },
};
