import { Banner } from '../models/Banner.js';
import { PromotionalBanner } from '../models/PromotionalBanner.js';
import { CmsPage } from '../models/CmsPage.js';
import { TrustBadge } from '../models/TrustBadge.js';
import { FooterContent } from '../models/FooterContent.js';
import { storageService } from './storage/storage.service.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

// ==========================================
// 1. HERO BANNERS SERVICE
// ==========================================

export const createBanner = async (payload) => {
  return await Banner.create(payload);
};

export const getBanners = async (query = {}) => {
  const { page = 1, limit = 20, isActive } = query;
  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true' || isActive === true;
  }
  const skip = (page - 1) * limit;
  const totalItems = await Banner.countDocuments(filter);
  const banners = await Banner.find(filter)
    .sort({ sortOrder: 1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    banners,
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      currentPage: page,
      limit,
    },
  };
};

export const getBannerById = async (id) => {
  const banner = await Banner.findById(id);
  if (!banner) {
    throw new AppError('Banner not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return banner;
};

export const updateBanner = async (id, payload) => {
  const banner = await Banner.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!banner) {
    throw new AppError('Banner not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return banner;
};

export const deleteBanner = async (id) => {
  const banner = await Banner.findByIdAndDelete(id);
  if (!banner) {
    throw new AppError('Banner not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return { message: 'Banner deleted successfully' };
};

export const getPublicActiveBanners = async () => {
  return await Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean();
};

// ==========================================
// 2. PROMOTIONAL BANNERS SERVICE
// ==========================================

export const createPromoBanner = async (payload) => {
  return await PromotionalBanner.create(payload);
};

export const getPromoBanners = async (query = {}) => {
  const { page = 1, limit = 20, isActive } = query;
  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true' || isActive === true;
  }
  const skip = (page - 1) * limit;
  const totalItems = await PromotionalBanner.countDocuments(filter);
  const promotionalBanners = await PromotionalBanner.find(filter)
    .sort({ sortOrder: 1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    promotionalBanners,
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      currentPage: page,
      limit,
    },
  };
};

export const getPromoBannerById = async (id) => {
  const promoBanner = await PromotionalBanner.findById(id);
  if (!promoBanner) {
    throw new AppError('Promotional banner not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return promoBanner;
};

export const updatePromoBanner = async (id, payload) => {
  const promoBanner = await PromotionalBanner.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!promoBanner) {
    throw new AppError('Promotional banner not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return promoBanner;
};

export const deletePromoBanner = async (id) => {
  const promoBanner = await PromotionalBanner.findByIdAndDelete(id);
  if (!promoBanner) {
    throw new AppError('Promotional banner not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return { message: 'Promotional banner deleted successfully' };
};

export const getPublicActivePromoBanners = async () => {
  const now = new Date();
  return await PromotionalBanner.find({
    isActive: true,
    $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }],
    $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }],
  })
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();
};

// ==========================================
// 3. CMS PAGES SERVICE
// ==========================================

export const createCmsPage = async (payload, adminUserId) => {
  const existing = await CmsPage.findOne({ slug: payload.slug.toLowerCase().trim() });
  if (existing) {
    throw new AppError(`CMS Page with slug '${payload.slug}' already exists.`, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }
  return await CmsPage.create({
    ...payload,
    updatedBy: adminUserId,
  });
};

export const getCmsPages = async (query = {}) => {
  const { page = 1, limit = 20, isPublished } = query;
  const filter = {};
  if (isPublished !== undefined) {
    filter.isPublished = isPublished === 'true' || isPublished === true;
  }
  const skip = (page - 1) * limit;
  const totalItems = await CmsPage.countDocuments(filter);
  const pages = await CmsPage.find(filter)
    .populate('updatedBy', 'fullName email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    pages,
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      currentPage: page,
      limit,
    },
  };
};

export const getCmsPageById = async (id) => {
  const cmsPage = await CmsPage.findById(id).populate('updatedBy', 'fullName email role');
  if (!cmsPage) {
    throw new AppError('CMS Page not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return cmsPage;
};

export const updateCmsPage = async (id, payload, adminUserId) => {
  if (payload.slug) {
    const existing = await CmsPage.findOne({
      slug: payload.slug.toLowerCase().trim(),
      _id: { $ne: id },
    });
    if (existing) {
      throw new AppError(`CMS Page with slug '${payload.slug}' already exists.`, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
    }
  }

  const cmsPage = await CmsPage.findByIdAndUpdate(
    id,
    { ...payload, updatedBy: adminUserId },
    { new: true, runValidators: true }
  ).populate('updatedBy', 'fullName email role');

  if (!cmsPage) {
    throw new AppError('CMS Page not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return cmsPage;
};

export const deleteCmsPage = async (id) => {
  const cmsPage = await CmsPage.findByIdAndDelete(id);
  if (!cmsPage) {
    throw new AppError('CMS Page not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return { message: 'CMS Page deleted successfully' };
};

export const getPublicCmsPageBySlug = async (slug) => {
  const cmsPage = await CmsPage.findOne({ slug: slug.toLowerCase().trim(), isPublished: true }).lean();
  if (!cmsPage) {
    throw new AppError('Page not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return cmsPage;
};

// ==========================================
// 4. TRUST BADGES SERVICE
// ==========================================

export const createTrustBadge = async (payload) => {
  return await TrustBadge.create(payload);
};

export const getTrustBadges = async (query = {}) => {
  const { page = 1, limit = 20, isActive } = query;
  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true' || isActive === true;
  }
  const skip = (page - 1) * limit;
  const totalItems = await TrustBadge.countDocuments(filter);
  const trustBadges = await TrustBadge.find(filter)
    .sort({ sortOrder: 1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    trustBadges,
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      currentPage: page,
      limit,
    },
  };
};

export const getTrustBadgeById = async (id) => {
  const badge = await TrustBadge.findById(id);
  if (!badge) {
    throw new AppError('Trust badge not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return badge;
};

export const updateTrustBadge = async (id, payload) => {
  const badge = await TrustBadge.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!badge) {
    throw new AppError('Trust badge not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return badge;
};

export const deleteTrustBadge = async (id) => {
  const badge = await TrustBadge.findByIdAndDelete(id);
  if (!badge) {
    throw new AppError('Trust badge not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return { message: 'Trust badge deleted successfully' };
};

export const getPublicActiveTrustBadges = async () => {
  return await TrustBadge.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean();
};

// ==========================================
// 5. FOOTER CONTENT SERVICE
// ==========================================

export const getFooterContent = async () => {
  let footer = await FooterContent.findOne({}).lean();
  if (!footer) {
    footer = await FooterContent.create({ companyName: 'Vinexus', isActive: true });
  }
  return footer;
};

export const updateFooterContent = async (payload) => {
  let footer = await FooterContent.findOne({});
  if (!footer) {
    footer = await FooterContent.create(payload);
  } else {
    footer = await FooterContent.findByIdAndUpdate(footer._id, payload, {
      new: true,
      runValidators: true,
    });
  }
  return footer;
};

export const getPublicFooterContent = async () => {
  const footer = await FooterContent.findOne({ isActive: true }).lean();
  return footer || { companyName: 'Vinexus', quickLinks: [], legalLinks: [] };
};

export const uploadBannerImage = async (id, file) => {
  const banner = await Banner.findById(id);
  if (!banner) {
    throw new AppError('Banner not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const oldPublicId = banner.image?.publicId;
  const folder = 'vinexus/banners';
  const uploaded = await storageService.replaceFile({
    oldPublicId,
    buffer: file.buffer,
    originalname: file.originalname,
    mimetype: file.mimetype,
    folder,
    category: 'cms',
  });

  banner.image = {
    url: uploaded.url,
    publicId: uploaded.publicId,
  };

  await banner.save();
  return banner;
};

export const uploadPromoBannerImage = async (id, file) => {
  const promo = await PromotionalBanner.findById(id);
  if (!promo) {
    throw new AppError('Promotional banner not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const oldPublicId = promo.image?.publicId;
  const folder = 'vinexus/promotional-banners';
  const uploaded = await storageService.replaceFile({
    oldPublicId,
    buffer: file.buffer,
    originalname: file.originalname,
    mimetype: file.mimetype,
    folder,
    category: 'cms',
  });

  promo.image = {
    url: uploaded.url,
    publicId: uploaded.publicId,
  };

  await promo.save();
  return promo;
};

export const uploadTrustBadgeIcon = async (id, file) => {
  const badge = await TrustBadge.findById(id);
  if (!badge) {
    throw new AppError('Trust badge not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const oldPublicId = badge.icon?.publicId;
  const folder = 'vinexus/trust-badges';
  const uploaded = await storageService.replaceFile({
    oldPublicId,
    buffer: file.buffer,
    originalname: file.originalname,
    mimetype: file.mimetype,
    folder,
    category: 'cms',
  });

  badge.icon = {
    url: uploaded.url,
    publicId: uploaded.publicId,
  };

  await badge.save();
  return badge;
};

