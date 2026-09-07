import {
  createBanner,
  getBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
  createPromoBanner,
  getPromoBanners,
  getPromoBannerById,
  updatePromoBanner,
  deletePromoBanner,
  createCmsPage,
  getCmsPages,
  getCmsPageById,
  updateCmsPage,
  deleteCmsPage,
  createTrustBadge,
  getTrustBadges,
  getTrustBadgeById,
  updateTrustBadge,
  deleteTrustBadge,
  getFooterContent,
  updateFooterContent,
  uploadBannerImage,
  uploadPromoBannerImage,
  uploadTrustBadgeIcon,
} from '../services/cms.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

// --- Hero Banners ---
export const addBanner = asyncHandler(async (req, res) => {
  const banner = await createBanner(req.body);
  return ApiResponse.success(res, 'Hero banner created successfully', { banner }, HTTP_STATUS.CREATED);
});

export const fetchBanners = asyncHandler(async (req, res) => {
  const result = await getBanners(req.query);
  return ApiResponse.success(res, 'Hero banners retrieved successfully', result, HTTP_STATUS.OK);
});

export const fetchBannerById = asyncHandler(async (req, res) => {
  const banner = await getBannerById(req.params.id);
  return ApiResponse.success(res, 'Hero banner details retrieved successfully', { banner }, HTTP_STATUS.OK);
});

export const editBanner = asyncHandler(async (req, res) => {
  const banner = await updateBanner(req.params.id, req.body);
  return ApiResponse.success(res, 'Hero banner updated successfully', { banner }, HTTP_STATUS.OK);
});

export const removeBanner = asyncHandler(async (req, res) => {
  const result = await deleteBanner(req.params.id);
  return ApiResponse.success(res, result.message, null, HTTP_STATUS.OK);
});

// --- Promotional Banners ---
export const addPromoBanner = asyncHandler(async (req, res) => {
  const promoBanner = await createPromoBanner(req.body);
  return ApiResponse.success(res, 'Promotional banner created successfully', { promoBanner }, HTTP_STATUS.CREATED);
});

export const fetchPromoBanners = asyncHandler(async (req, res) => {
  const result = await getPromoBanners(req.query);
  return ApiResponse.success(res, 'Promotional banners retrieved successfully', result, HTTP_STATUS.OK);
});

export const fetchPromoBannerById = asyncHandler(async (req, res) => {
  const promoBanner = await getPromoBannerById(req.params.id);
  return ApiResponse.success(res, 'Promotional banner details retrieved successfully', { promoBanner }, HTTP_STATUS.OK);
});

export const editPromoBanner = asyncHandler(async (req, res) => {
  const promoBanner = await updatePromoBanner(req.params.id, req.body);
  return ApiResponse.success(res, 'Promotional banner updated successfully', { promoBanner }, HTTP_STATUS.OK);
});

export const removePromoBanner = asyncHandler(async (req, res) => {
  const result = await deletePromoBanner(req.params.id);
  return ApiResponse.success(res, result.message, null, HTTP_STATUS.OK);
});

// --- CMS Pages ---
export const addCmsPage = asyncHandler(async (req, res) => {
  const page = await createCmsPage(req.body, req.user._id);
  return ApiResponse.success(res, 'CMS Page created successfully', { page }, HTTP_STATUS.CREATED);
});

export const fetchCmsPages = asyncHandler(async (req, res) => {
  const result = await getCmsPages(req.query);
  return ApiResponse.success(res, 'CMS Pages retrieved successfully', result, HTTP_STATUS.OK);
});

export const fetchCmsPageById = asyncHandler(async (req, res) => {
  const page = await getCmsPageById(req.params.id);
  return ApiResponse.success(res, 'CMS Page details retrieved successfully', { page }, HTTP_STATUS.OK);
});

export const editCmsPage = asyncHandler(async (req, res) => {
  const page = await updateCmsPage(req.params.id, req.body, req.user._id);
  return ApiResponse.success(res, 'CMS Page updated successfully', { page }, HTTP_STATUS.OK);
});

export const removeCmsPage = asyncHandler(async (req, res) => {
  const result = await deleteCmsPage(req.params.id);
  return ApiResponse.success(res, result.message, null, HTTP_STATUS.OK);
});

// --- Trust Badges ---
export const addTrustBadge = asyncHandler(async (req, res) => {
  const trustBadge = await createTrustBadge(req.body);
  return ApiResponse.success(res, 'Trust badge created successfully', { trustBadge }, HTTP_STATUS.CREATED);
});

export const fetchTrustBadges = asyncHandler(async (req, res) => {
  const result = await getTrustBadges(req.query);
  return ApiResponse.success(res, 'Trust badges retrieved successfully', result, HTTP_STATUS.OK);
});

export const fetchTrustBadgeById = asyncHandler(async (req, res) => {
  const trustBadge = await getTrustBadgeById(req.params.id);
  return ApiResponse.success(res, 'Trust badge details retrieved successfully', { trustBadge }, HTTP_STATUS.OK);
});

export const editTrustBadge = asyncHandler(async (req, res) => {
  const trustBadge = await updateTrustBadge(req.params.id, req.body);
  return ApiResponse.success(res, 'Trust badge updated successfully', { trustBadge }, HTTP_STATUS.OK);
});

export const removeTrustBadge = asyncHandler(async (req, res) => {
  const result = await deleteTrustBadge(req.params.id);
  return ApiResponse.success(res, result.message, null, HTTP_STATUS.OK);
});

// --- Footer Content ---
export const fetchFooterContentAdmin = asyncHandler(async (req, res) => {
  const footer = await getFooterContent();
  return ApiResponse.success(res, 'Footer content retrieved successfully', { footer }, HTTP_STATUS.OK);
});

export const editFooterContentAdmin = asyncHandler(async (req, res) => {
  const footer = await updateFooterContent(req.body);
  return ApiResponse.success(res, 'Footer content updated successfully', { footer }, HTTP_STATUS.OK);
});

// --- Asset Storage Handlers ---
export const uploadBannerImg = asyncHandler(async (req, res) => {
  const banner = await uploadBannerImage(req.params.id, req.file);
  return ApiResponse.success(res, 'Hero banner image uploaded successfully', { banner }, HTTP_STATUS.OK);
});

export const uploadPromoBannerImg = asyncHandler(async (req, res) => {
  const promoBanner = await uploadPromoBannerImage(req.params.id, req.file);
  return ApiResponse.success(res, 'Promotional banner image uploaded successfully', { promoBanner }, HTTP_STATUS.OK);
});

export const uploadTrustBadgeIconImg = asyncHandler(async (req, res) => {
  const trustBadge = await uploadTrustBadgeIcon(req.params.id, req.file);
  return ApiResponse.success(res, 'Trust badge icon uploaded successfully', { trustBadge }, HTTP_STATUS.OK);
});

