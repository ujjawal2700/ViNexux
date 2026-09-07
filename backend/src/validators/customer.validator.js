import { z } from 'zod';
import mongoose from 'mongoose';

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

export const getCustomerByIdSchema = {
  params: z.object({
    id: z
      .string({ required_error: 'Customer ID parameter is required' })
      .refine(isValidObjectId, { message: 'Invalid customer ID format. Must be a valid MongoDB ObjectId' }),
  }),
};

export const updateCustomerStatusSchema = {
  params: z.object({
    id: z
      .string({ required_error: 'Customer ID parameter is required' })
      .refine(isValidObjectId, { message: 'Invalid customer ID format. Must be a valid MongoDB ObjectId' }),
  }),
  body: z
    .object({
      accountStatus: z
        .enum(['pending', 'active', 'blocked'], {
          invalid_type_error: 'Account status must be one of: pending, active, blocked',
        })
        .optional(),
      status: z
        .enum(['pending', 'active', 'blocked'], {
          invalid_type_error: 'Status must be one of: pending, active, blocked',
        })
        .optional(),
    })
    .refine((data) => data.accountStatus !== undefined || data.status !== undefined, {
      message: 'Either accountStatus or status must be provided',
    }),
};

export const getCustomersQuerySchema = {
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
    accountStatus: z.enum(['pending', 'active', 'blocked']).optional(),
    status: z.enum(['pending', 'active', 'blocked']).optional(),
    search: z.string().trim().optional(),
    sortBy: z.enum(['createdAt', 'fullName', 'email', 'phone', 'accountStatus']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
};
