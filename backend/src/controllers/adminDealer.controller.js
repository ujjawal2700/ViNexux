import { isSuperAdmin } from '../../../shared/adminAccess.js';
import { AppError } from '../utils/AppError.js';
import {
  listDealers,
  getDealerById,
  approveDealerKyc,
  rejectDealerKyc,
  revokeDealerStatus,
} from '../services/dealer.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export const getDealers = asyncHandler(async (req, res) => {
  const result = await listDealers({ ...req.query, scope: 'verification', includePrivatePricing: isSuperAdmin(req.user) });

  return ApiResponse.success(
    res,
    'Dealers list retrieved successfully',
    result,
    HTTP_STATUS.OK
  );
});

export const getDealer = asyncHandler(async (req, res) => {
  const profile = await getDealerById(req.params.id, isSuperAdmin(req.user));

  return ApiResponse.success(
    res,
    'Dealer profile retrieved successfully',
    { profile },
    HTTP_STATUS.OK
  );
});

export const approveKyc = asyncHandler(async (req, res) => {
  const adminId = req.user ? req.user._id : null;
  if (req.body?.dealerDiscountPercent !== undefined && !isSuperAdmin(req.user)) throw new AppError('Only super admins can set dealer discounts.', 403, 'FORBIDDEN');
  const profile = await approveDealerKyc(req.params.id, adminId, req.body?.dealerDiscountPercent);

  return ApiResponse.success(
    res,
    'Dealer KYC approved successfully',
    { profile },
    HTTP_STATUS.OK
  );
});

export const rejectKyc = asyncHandler(async (req, res) => {
  const adminId = req.user ? req.user._id : null;
  const rejectionReason = req.body ? req.body.rejectionReason : undefined;
  const profile = await rejectDealerKyc(req.params.id, rejectionReason, adminId);

  return ApiResponse.success(
    res,
    'Dealer KYC rejected successfully',
    { profile },
    HTTP_STATUS.OK
  );
});

export const revokeDealer = asyncHandler(async (req, res) => {
  const adminId = req.user ? req.user._id : null;
  const reason = req.body ? (req.body.reason || req.body.rejectionReason) : undefined;
  const profile = await revokeDealerStatus(req.params.id, reason, adminId);

  return ApiResponse.success(
    res,
    'Dealer status revoked successfully',
    { profile },
    HTTP_STATUS.OK
  );
});

export default {
  getDealers,
  getDealer,
  approveKyc,
  rejectKyc,
  revokeDealer,
};
