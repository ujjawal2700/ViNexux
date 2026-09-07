import { z } from 'zod';
import mongoose from 'mongoose';

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

const isoDateString = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid ISO date format' });

export const getEnquiryReportQuerySchema = {
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
    status: z.enum(['new', 'contacted', 'in-progress', 'closed', 'spam']).optional(),
    userType: z.enum(['customer', 'dealer']).optional(),
    assignedTo: z
      .string()
      .optional()
      .refine((val) => !val || isValidObjectId(val), { message: 'Invalid assignedTo admin ID format' }),
    startDate: isoDateString.optional(),
    endDate: isoDateString.optional(),
  }),
};

export const getDealerReportQuerySchema = {
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
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    startDate: isoDateString.optional(),
    endDate: isoDateString.optional(),
  }),
};

export const getCustomerReportQuerySchema = {
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
    startDate: isoDateString.optional(),
    endDate: isoDateString.optional(),
  }),
};
