import {
  createDealerProfile,
  getDealerProfileByUserId,
  updateDealerProfileByUserId,
  uploadKycDocument,
  deleteKycDocument,
} from '../services/dealer.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export const createProfile = asyncHandler(async (req, res) => {
  const profile = await createDealerProfile(req.user._id, req.body);

  return ApiResponse.success(
    res,
    'Dealer profile created successfully and pending KYC review',
    { profile },
    HTTP_STATUS.CREATED
  );
});

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await getDealerProfileByUserId(req.user._id);

  return ApiResponse.success(
    res,
    'Dealer profile fetched successfully',
    { profile },
    HTTP_STATUS.OK
  );
});

export const updateProfile = asyncHandler(async (req, res) => {
  const profile = await updateDealerProfileByUserId(req.user._id, req.body);

  return ApiResponse.success(
    res,
    'Dealer profile updated successfully',
    { profile },
    HTTP_STATUS.OK
  );
});

export const uploadKycDoc = asyncHandler(async (req, res) => {
  const type = req.body.type || req.query.type;
  const profile = await uploadKycDocument(req.user._id, { type, file: req.file });

  return ApiResponse.success(
    res,
    'KYC document uploaded successfully',
    { profile },
    HTTP_STATUS.OK
  );
});

export const deleteKycDoc = asyncHandler(async (req, res) => {
  const profile = await deleteKycDocument(req.user._id, req.params.type);

  return ApiResponse.success(
    res,
    'KYC document deleted successfully',
    { profile },
    HTTP_STATUS.OK
  );
});

