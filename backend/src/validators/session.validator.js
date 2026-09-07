import { z } from 'zod';
import mongoose from 'mongoose';

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

export const getSessionByIdSchema = {
  params: z.object({
    id: z
      .string({ required_error: 'Session ID parameter is required' })
      .refine((val) => isValidObjectId(val) || (typeof val === 'string' && val.trim().length > 0), {
        message: 'Invalid session ID format. Must be a valid MongoDB ObjectId or sessionId string',
      }),
  }),
};

export const revokeSessionSchema = {
  params: z.object({
    id: z
      .string({ required_error: 'Session ID parameter is required' })
      .refine((val) => isValidObjectId(val) || (typeof val === 'string' && val.trim().length > 0), {
        message: 'Invalid session ID format. Must be a valid MongoDB ObjectId or sessionId string',
      }),
  }),
};

export const getSessionsQuerySchema = {
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => !isNaN(val) && val >= 1, { message: 'Page must be a positive integer >= 1' }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .refine((val) => !isNaN(val) && val >= 1 && val <= 100, { message: 'Limit must be between 1 and 100' }),
    userId: z
      .string()
      .optional()
      .refine((val) => !val || isValidObjectId(val), { message: 'Invalid userId format. Must be a valid MongoDB ObjectId' }),
    userType: z.enum(['customer', 'dealer', 'admin']).optional(),
    role: z.enum(['customer', 'dealer', 'admin']).optional(),
    isActive: z
      .string()
      .optional()
      .transform((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return val;
      }),
    status: z.enum(['active', 'expired', 'revoked', 'all']).optional(),
    search: z.string().trim().optional(),
    sortBy: z.enum(['createdAt', 'lastActiveAt', 'issuedAt', 'expiresAt']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
};
