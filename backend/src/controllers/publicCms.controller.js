import {
  getPublicActiveBanners,
  getPublicActivePromoBanners,
  getPublicCmsPageBySlug,
  getPublicActiveTrustBadges,
  getPublicFooterContent,
} from '../services/cms.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export const fetchPublicBanners = asyncHandler(async (req, res) => {
  const banners = await getPublicActiveBanners();
  return ApiResponse.success(res, 'Active hero banners retrieved successfully', { banners }, HTTP_STATUS.OK);
});

export const fetchPublicPromoBanners = asyncHandler(async (req, res) => {
  const promotionalBanners = await getPublicActivePromoBanners();
  return ApiResponse.success(res, 'Active promotional banners retrieved successfully', { promotionalBanners }, HTTP_STATUS.OK);
});

export const fetchPublicCmsPageBySlug = asyncHandler(async (req, res) => {
  const page = await getPublicCmsPageBySlug(req.params.slug);
  return ApiResponse.success(res, 'Published CMS page retrieved successfully', { page }, HTTP_STATUS.OK);
});

export const fetchPublicTrustBadges = asyncHandler(async (req, res) => {
  const trustBadges = await getPublicActiveTrustBadges();
  return ApiResponse.success(res, 'Active trust badges retrieved successfully', { trustBadges }, HTTP_STATUS.OK);
});

export const fetchPublicFooterContent = asyncHandler(async (req, res) => {
  const footer = await getPublicFooterContent();
  return ApiResponse.success(res, 'Active footer content retrieved successfully', { footer }, HTTP_STATUS.OK);
});
