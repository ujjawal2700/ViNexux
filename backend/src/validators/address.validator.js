import { z } from 'zod';
import mongoose from 'mongoose';

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

const pincodeRegex = /^\d{6}$/;

export const createAddressSchema = {
  body: z.object({
    label: z
      .string()
      .trim()
      .max(50, { message: 'Label cannot exceed 50 characters' })
      .optional(),
    line1: z
      .string({ required_error: 'Address line 1 is required' })
      .trim()
      .min(1, { message: 'Address line 1 is required' })
      .max(255, { message: 'Address line 1 cannot exceed 255 characters' }),
    line2: z
      .string()
      .trim()
      .max(255, { message: 'Address line 2 cannot exceed 255 characters' })
      .optional(),
    city: z
      .string({ required_error: 'City is required' })
      .trim()
      .min(1, { message: 'City is required' })
      .max(100, { message: 'City cannot exceed 100 characters' }),
    state: z
      .string({ required_error: 'State is required' })
      .trim()
      .min(1, { message: 'State is required' })
      .max(100, { message: 'State cannot exceed 100 characters' }),
    pincode: z
      .string({ required_error: 'Pincode is required' })
      .trim()
      .regex(pincodeRegex, { message: 'Please enter a valid 6-digit pincode' }),
    isDefault: z.boolean().optional(),
  }),
};

export const updateAddressSchema = {
  params: z.object({
    addressId: z
      .string()
      .refine(isValidObjectId, { message: 'Invalid address ID format' }),
  }),
  body: z.object({
    label: z.string().trim().max(50, { message: 'Label cannot exceed 50 characters' }).optional(),
    line1: z.string().trim().min(1).max(255, { message: 'Address line 1 cannot exceed 255 characters' }).optional(),
    line2: z.string().trim().max(255, { message: 'Address line 2 cannot exceed 255 characters' }).optional(),
    city: z.string().trim().min(1).max(100, { message: 'City cannot exceed 100 characters' }).optional(),
    state: z.string().trim().min(1).max(100, { message: 'State cannot exceed 100 characters' }).optional(),
    pincode: z
      .string()
      .trim()
      .regex(pincodeRegex, { message: 'Please enter a valid 6-digit pincode' })
      .optional(),
    isDefault: z.boolean().optional(),
  }),
};

export const addressIdParamSchema = {
  params: z.object({
    addressId: z
      .string()
      .refine(isValidObjectId, { message: 'Invalid address ID format' }),
  }),
};
