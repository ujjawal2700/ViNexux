import { z } from 'zod';
import mongoose from 'mongoose';

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

export const addItemSchema = {
  body: z.object({
    productId: z
      .string({ required_error: 'Product ID is required' })
      .refine(isValidObjectId, { message: 'Invalid product ID format. Must be a valid MongoDB ObjectId' }),
    quantity: z
      .number({ invalid_type_error: 'Quantity must be a number' })
      .int({ message: 'Quantity must be an integer' })
      .min(1, { message: 'Quantity must be at least 1' })
      .max(1000, { message: 'Quantity cannot exceed 1000' })
      .default(1)
      .optional(),
  }),
};

export const updateCartItemSchema = {
  params: z.object({
    productId: z
      .string({ required_error: 'Product ID parameter is required' })
      .refine(isValidObjectId, { message: 'Invalid product ID format. Must be a valid MongoDB ObjectId' }),
  }),
  body: z.object({
    quantity: z
      .number({ required_error: 'Quantity is required', invalid_type_error: 'Quantity must be a number' })
      .int({ message: 'Quantity must be an integer' })
      .min(1, { message: 'Quantity must be at least 1' })
      .max(1000, { message: 'Quantity cannot exceed 1000' }),
  }),
};

export const removeCartItemSchema = {
  params: z.object({
    productId: z
      .string({ required_error: 'Product ID parameter is required' })
      .refine(isValidObjectId, { message: 'Invalid product ID format. Must be a valid MongoDB ObjectId' }),
  }),
};
