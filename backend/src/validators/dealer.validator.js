import { z } from 'zod';
import mongoose from 'mongoose';

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const pincodeRegex = /^\d{6}$/;

const kycDocumentSchema = z.object({
  type: z.enum(['gst', 'pan', 'aadhaar'], {
    required_error: 'KYC document type is required',
    invalid_type_error: 'KYC document type must be gst, pan, or aadhaar',
  }),
  url: z
    .string({ required_error: 'KYC document URL is required' })
    .trim()
    .min(1, { message: 'KYC document URL cannot be empty' }),
  publicId: z.string().trim().optional(),
});

export const createDealerProfileSchema = {
  body: z.object({
    companyName: z
      .string({ required_error: 'Company name is required' })
      .trim()
      .min(2, { message: 'Company name must be at least 2 characters' })
      .max(150, { message: 'Company name cannot exceed 150 characters' }),
    gstin: z
      .string()
      .trim()
      .transform((val) => val.toUpperCase())
      .refine((val) => !val || gstinRegex.test(val), {
        message: 'Please enter a valid 15-character GSTIN format',
      })
      .optional(),
    pan: z
      .string()
      .trim()
      .transform((val) => val.toUpperCase())
      .refine((val) => !val || panRegex.test(val), {
        message: 'Please enter a valid 10-character PAN format',
      })
      .optional(),
    address: z
      .string()
      .trim()
      .max(255, { message: 'Address cannot exceed 255 characters' })
      .optional(),
    city: z
      .string()
      .trim()
      .max(100, { message: 'City cannot exceed 100 characters' })
      .optional(),
    state: z
      .string()
      .trim()
      .max(100, { message: 'State cannot exceed 100 characters' })
      .optional(),
    pincode: z
      .string()
      .trim()
      .refine((val) => !val || pincodeRegex.test(val), {
        message: 'Please enter a valid 6-digit pincode',
      })
      .optional(),
    kycDocuments: z.array(kycDocumentSchema).optional().default([]),
  }),
};

export const updateDealerProfileSchema = {
  body: z.object({
    companyName: z
      .string()
      .trim()
      .min(2, { message: 'Company name must be at least 2 characters' })
      .max(150, { message: 'Company name cannot exceed 150 characters' })
      .optional(),
    gstin: z
      .string()
      .nullable()
      .optional()
      .transform((val) => (typeof val === 'string' ? val.trim().toUpperCase() : val))
      .refine((val) => val === undefined || val === null || val === '' || gstinRegex.test(val), {
        message: 'Please enter a valid 15-character GSTIN format',
      }),
    pan: z
      .string()
      .nullable()
      .optional()
      .transform((val) => (typeof val === 'string' ? val.trim().toUpperCase() : val))
      .refine((val) => val === undefined || val === null || val === '' || panRegex.test(val), {
        message: 'Please enter a valid 10-character PAN format',
      }),
    address: z
      .string()
      .trim()
      .max(255, { message: 'Address cannot exceed 255 characters' })
      .optional(),
    city: z
      .string()
      .trim()
      .max(100, { message: 'City cannot exceed 100 characters' })
      .optional(),
    state: z
      .string()
      .trim()
      .max(100, { message: 'State cannot exceed 100 characters' })
      .optional(),
    pincode: z
      .string()
      .trim()
      .refine((val) => !val || pincodeRegex.test(val), {
        message: 'Please enter a valid 6-digit pincode',
      })
      .optional(),
    kycDocuments: z.array(kycDocumentSchema).optional(),
  }),
};

export const getDealerByIdSchema = {
  params: z.object({
    id: z
      .string()
      .refine(isValidObjectId, { message: 'Invalid dealer profile ID format. Must be a valid MongoDB ObjectId' }),
  }),
};

export const adminApproveKycSchema = {
  params: z.object({
    id: z
      .string()
      .refine(isValidObjectId, { message: 'Invalid dealer profile ID format. Must be a valid MongoDB ObjectId' }),
  }),
};

export const adminRejectKycSchema = {
  params: z.object({
    id: z
      .string()
      .refine(isValidObjectId, { message: 'Invalid dealer profile ID format. Must be a valid MongoDB ObjectId' }),
  }),
  body: z.object({
    rejectionReason: z
      .string({ required_error: 'Rejection reason is required' })
      .trim()
      .min(1, { message: 'Rejection reason is required' })
      .max(500, { message: 'Rejection reason cannot exceed 500 characters' }),
  }),
};

export const adminRevokeDealerSchema = {
  params: z.object({
    id: z
      .string()
      .refine(isValidObjectId, { message: 'Invalid dealer profile ID format. Must be a valid MongoDB ObjectId' }),
  }),
  body: z
    .object({
      reason: z
        .string()
        .trim()
        .max(500, { message: 'Revocation reason cannot exceed 500 characters' })
        .optional(),
      rejectionReason: z
        .string()
        .trim()
        .max(500, { message: 'Revocation reason cannot exceed 500 characters' })
        .optional(),
    })
    .optional(),
};

export const getDealersQuerySchema = {
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
    search: z.string().trim().optional(),
    sortBy: z.enum(['createdAt', 'companyName', 'status']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
};
