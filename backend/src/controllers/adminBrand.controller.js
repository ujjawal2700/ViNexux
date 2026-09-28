import { Brand } from '../models/Brand.js';
import { Product } from '../models/Product.js';
import { storageService } from '../services/storage/storage.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const slugify = (value) => value.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const listBrands = asyncHandler(async (_req, res) => {
  const brands = await Brand.find().sort({ sortOrder: 1, name: 1 }).lean();
  ApiResponse.success(res, 'Brands retrieved', { brands });
});

export const createBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.create({ ...req.body, slug: req.body.slug || slugify(req.body.name) });
  ApiResponse.success(res, 'Brand created', { brand }, 201);
});

export const updateBrand = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.name && !payload.slug) payload.slug = slugify(payload.name);
  const previous = await Brand.findById(req.params.id).lean();
  const brand = await Brand.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!brand) throw new AppError('Brand not found', 404, 'NOT_FOUND');
  if (previous?.logo?.publicId && payload.logo?.publicId && previous.logo.publicId !== payload.logo.publicId) {
    await storageService.deleteFile(previous.logo.publicId);
  }
  ApiResponse.success(res, 'Brand updated', { brand });
});

export const removeBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new AppError('Brand not found', 404, 'NOT_FOUND');
  const productCount = await Product.countDocuments({ brandId: brand._id });
  if (productCount) {
    brand.isActive = false;
    await brand.save();
    return ApiResponse.success(res, 'Brand has linked products and was deactivated', { brand });
  }
  if (brand.logo?.publicId) await storageService.deleteFile(brand.logo.publicId);
  await brand.deleteOne();
  return ApiResponse.success(res, 'Brand deleted', {});
});

export const syncBrandsFromProducts = asyncHandler(async (_req, res) => {
  const names = await Product.distinct('specifications.value', { 'specifications.key': { $regex: /^(brand|manufacturer)$/i } });
  for (const name of names.filter(Boolean)) {
    await Brand.updateOne(
      { name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      { $setOnInsert: { name: name.trim(), slug: slugify(name), isActive: true } },
      { upsert: true }
    );
  }
  const brands = await Brand.find().sort({ sortOrder: 1, name: 1 }).lean();
  ApiResponse.success(res, 'Existing product brands imported', { brands });
});
