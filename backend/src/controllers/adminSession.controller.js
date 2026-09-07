import {
  listSessions,
  getSessionById,
  revokeSession,
} from '../services/session.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export const getSessions = asyncHandler(async (req, res) => {
  const result = await listSessions(req.query);

  return ApiResponse.success(
    res,
    'Sessions list retrieved successfully',
    result,
    HTTP_STATUS.OK
  );
});

export const getSession = asyncHandler(async (req, res) => {
  const session = await getSessionById(req.params.id);

  return ApiResponse.success(
    res,
    'Session details retrieved successfully',
    { session },
    HTTP_STATUS.OK
  );
});

export const revokeSessionController = asyncHandler(async (req, res) => {
  const session = await revokeSession(req.params.id);

  return ApiResponse.success(
    res,
    'Session revoked successfully',
    { session },
    HTTP_STATUS.OK
  );
});
