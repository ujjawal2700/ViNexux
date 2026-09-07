import { z } from 'zod';
import mongoose from 'mongoose';

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

const deliveryAddressSchema = z.object({
  line1: z.string().trim().max(255).optional(),
  line2: z.string().trim().max(255).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(10).optional(),
});

export const createEnquirySchema = {
  body: z.object({
    message: z
      .string()
      .trim()
      .max(1000, { message: 'Message cannot exceed 1000 characters' })
      .optional(),
    customerNote: z
      .string()
      .trim()
      .max(1000, { message: 'Customer note cannot exceed 1000 characters' })
      .optional(),
    deliveryAddress: deliveryAddressSchema.optional(),
  }),
};

export const getEnquiryByIdSchema = {
  params: z.object({
    id: z
      .string({ required_error: 'Enquiry ID parameter is required' })
      .refine(isValidObjectId, { message: 'Invalid enquiry ID format. Must be a valid MongoDB ObjectId' }),
  }),
};

export const adminUpdateEnquiryStatusSchema = {
  params: z.object({
    id: z
      .string({ required_error: 'Enquiry ID parameter is required' })
      .refine(isValidObjectId, { message: 'Invalid enquiry ID format. Must be a valid MongoDB ObjectId' }),
  }),
  body: z.object({
    status: z
      .enum(['new', 'contacted', 'in-progress', 'closed', 'spam'], {
        invalid_type_error: 'Status must be one of: new, contacted, in-progress, closed, spam',
      })
      .optional(),
    note: z
      .string()
      .trim()
      .min(1, { message: 'Note text cannot be empty' })
      .max(1000, { message: 'Note text cannot exceed 1000 characters' })
      .optional(),
    adminNote: z
      .string()
      .trim()
      .min(1, { message: 'Admin note text cannot be empty' })
      .max(1000, { message: 'Admin note text cannot exceed 1000 characters' })
      .optional(),
    assignedTo: z
      .string()
      .refine(isValidObjectId, { message: 'Invalid assignedTo admin ID format' })
      .optional(),
  }),
};

export const getEnquiriesQuerySchema = {
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
    search: z.string().trim().optional(),
    sortBy: z.enum(['createdAt', 'status', 'enquiryNumber']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
};
