import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { CATALOG_FIELDS_VERSION, CATALOG_SOURCE_PATHS, computeCatalogFields } from '../utils/productCatalogFields.js';

const productImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
    altText: {
      type: String,
      trim: true,
      maxlength: [150, 'Alt text cannot exceed 150 characters'],
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: [0, 'Image sort order cannot be negative'],
    },
  },
  { _id: false }
);

const productSpecificationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Specification key is required'],
      trim: true,
      maxlength: [50, 'Specification key cannot exceed 50 characters'],
    },
    value: {
      type: String,
      required: [true, 'Specification value is required'],
      trim: true,
      maxlength: [255, 'Specification value cannot exceed 255 characters'],
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, 'Product SKU is required'],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [50, 'SKU cannot exceed 50 characters'],
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [150, 'Product name cannot exceed 150 characters'],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    categoryIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    }],
    modelNumber: {
      type: String,
      required: [true, 'Model number is required'],
      trim: true,
      unique: true,
      sparse: true,
      default: () => `VNX-${randomBytes(5).toString('hex').toUpperCase()}`,
      maxlength: [100, 'Model number cannot exceed 100 characters'],
    },
    model: {
      type: String,
      trim: true,
      default: 'Standard Model',
      maxlength: [100, 'Model cannot exceed 100 characters'],
    },
    stockQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Stock quantity cannot be negative'],
    },
    variant: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Variant cannot exceed 100 characters'],
    },
    warranty: {
      type: String,
      trim: true,
      default: '1 Year ON-SITE / Direct Replacement Warranty',
      maxlength: [200, 'Warranty cannot exceed 200 characters'],
    },
    informationPhone: {
      type: String,
      trim: true,
      maxlength: [20, 'Information phone cannot exceed 20 characters'],
    },
    productUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Product URL cannot exceed 500 characters'],
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    images: [productImageSchema],
    specifications: [productSpecificationSchema],
    standardPrice: {
      type: Number,
      default: 0,
      min: [0, 'Standard price cannot be negative'],
    },
    dealerPrice: {
      type: Number,
      default: 0,
      min: [0, 'Dealer price cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Derived catalog fields (utils/productCatalogFields.js), maintained by
    // the hooks below. Hidden from normal queries; storefront aggregations
    // read them for indexed filtering and search.
    brandKey: { type: String, default: '', select: false },
    stockLevel: { type: Number, default: null, select: false },
    stockStatus: { type: String, default: 'on-order', select: false },
    searchTokens: { type: [String], default: undefined, select: false },
    catalogFieldsVersion: { type: Number, select: false },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying active products by category
productSchema.index({ categoryId: 1, isActive: 1 });
productSchema.index({ categoryIds: 1, isActive: 1 });
// Admin listing (default sort newest first) and newest-per-category lookups.
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ categoryId: 1, createdAt: -1 });
productSchema.index({ searchTokens: 1 });
productSchema.index({ brandKey: 1, isActive: 1 });
productSchema.index({ catalogFieldsVersion: 1 });

const catalogSourceSelection = CATALOG_SOURCE_PATHS.join(' ');

// Re-derive catalog fields for the given products straight from the database.
// Writes through the driver so it does not re-trigger these hooks.
export const refreshCatalogFields = async (filter, { session = null, batchSize = 500 } = {}) => {
  let refreshed = 0;
  let batch = [];
  const flush = async () => {
    if (!batch.length) return;
    await Product.collection.bulkWrite(batch, { ordered: false, ...(session ? { session } : {}) });
    refreshed += batch.length;
    batch = [];
  };
  for await (const product of Product.find(filter).select(catalogSourceSelection).session(session).lean().cursor()) {
    batch.push({ updateOne: { filter: { _id: product._id }, update: { $set: computeCatalogFields(product) } } });
    if (batch.length >= batchSize) await flush();
  }
  await flush();
  return refreshed;
};

const touchesCatalogSources = (update) => {
  if (!update) return false;
  if (Array.isArray(update)) return true; // aggregation-pipeline update
  const paths = Object.entries(update).flatMap(([key, value]) => (
    key.startsWith('$') && value && typeof value === 'object' ? Object.keys(value) : [key]
  ));
  return paths.some((path) => CATALOG_SOURCE_PATHS.some((source) => path === source || path.startsWith(`${source}.`)));
};

productSchema.pre('save', function deriveCatalogFields() {
  if (CATALOG_SOURCE_PATHS.every((path) => this.isSelected(path))) {
    this.set(computeCatalogFields(this.toObject({ depopulate: true })));
    this.$locals.refreshCatalogFields = false;
  } else {
    // Partially loaded document: derive from the stored copy after saving.
    this.$locals.refreshCatalogFields = true;
  }
});
productSchema.post('save', async function refreshPartialDocument() {
  if (this.$locals.refreshCatalogFields) await refreshCatalogFields({ _id: this._id }, { session: this.$session() });
});

// Derive before inserting (from a cast copy, so schema defaults apply) so the
// fields are written in the same operation, including inside transactions.
productSchema.pre('insertMany', function deriveInsertedCatalogFields(next, docs) {
  for (const doc of Array.isArray(docs) ? docs : [docs]) {
    if (!doc || typeof doc !== 'object') continue;
    const fields = computeCatalogFields(new this(doc).toObject({ depopulate: true }));
    if (typeof doc.set === 'function') doc.set(fields);
    else Object.assign(doc, fields);
  }
  next();
});

const UPDATE_QUERIES = ['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne'];
productSchema.pre(UPDATE_QUERIES, async function captureUpdatedProducts() {
  const isReplace = ['findOneAndReplace', 'replaceOne'].includes(this.op);
  if (!isReplace && !touchesCatalogSources(this.getUpdate())) return;
  // Capture ids before the update in case it changes fields in the filter.
  this._catalogRefreshIds = await this.model.find(this.getFilter()).session(this.getOptions().session || null).distinct('_id');
});
productSchema.post(UPDATE_QUERIES, async function refreshUpdatedProducts() {
  const ids = this._catalogRefreshIds || [];
  const session = this.getOptions().session || null;
  // Upserts create documents the pre-hook could not see.
  if (this.getOptions().upsert) await refreshCatalogFields({ ...this.getFilter(), catalogFieldsVersion: { $ne: CATALOG_FIELDS_VERSION } }, { session });
  if (ids.length) await refreshCatalogFields({ _id: { $in: ids } }, { session });
});

// bulkWrite hooks share no per-call state, so mark affected documents stale
// inside the write itself and re-derive every stale document afterwards.
const markStale = (update) => {
  if (Array.isArray(update)) return [...update, { $unset: 'catalogFieldsVersion' }];
  return { ...update, $unset: { ...(update?.$unset || {}), catalogFieldsVersion: 1 } };
};
productSchema.pre('bulkWrite', function markBulkWrittenProductsStale(next, ops) {
  for (const op of ops || []) {
    if (op.updateOne && touchesCatalogSources(op.updateOne.update)) op.updateOne.update = markStale(op.updateOne.update);
    if (op.updateMany && touchesCatalogSources(op.updateMany.update)) op.updateMany.update = markStale(op.updateMany.update);
    // insertOne / replaceOne documents carry no version, so they are stale already.
  }
  next();
});
productSchema.post('bulkWrite', async () => {
  await refreshCatalogFields({ catalogFieldsVersion: null });
});

export const Product = mongoose.model('Product', productSchema);
export default Product;
