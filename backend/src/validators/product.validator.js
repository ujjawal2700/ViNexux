import { z } from 'zod';
import mongoose from 'mongoose';

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

const productImageSchema = z.object({
  url: z.string({ required_error: 'Image URL is required' }).trim().min(1, { message: 'Image URL cannot be empty' }),
  publicId: z.string().trim().optional(),
  altText: z.string().trim().max(150, { message: 'Alt text cannot exceed 150 characters' }).optional(),
  sortOrder: z.number().min(0, { message: 'Sort order cannot be negative' }).default(0).optional(),
});

const productSpecificationSchema = z.object({
  key: z.string({ required_error: 'Specification key is required' }).trim().min(1).max(50),
  value: z.string({ required_error: 'Specification value is required' }).trim().min(1).max(255),
});

export const createProductSchema = {
  body: z.object({
    sku: z
      .string({ required_error: 'Product SKU is required' })
      .trim()
      .min(2, { message: 'SKU must be at least 2 characters' })
      .max(50, { message: 'SKU cannot exceed 50 characters' }),
    name: z
      .string({ required_error: 'Product name is required' })
      .trim()
      .min(2, { message: 'Product name must be at least 2 characters' })
      .max(150, { message: 'Product name cannot exceed 150 characters' }),
    categoryId: z
      .string({ required_error: 'Category ID is required' })
      .refine(isValidObjectId, { message: 'Invalid categoryId format. Must be a valid MongoDB ObjectId' }),
    description: z
      .string()
      .trim()
      .max(2000, { message: 'Description cannot exceed 2000 characters' })
      .optional(),
    images: z.array(productImageSchema).optional().default([]),
    specifications: z.array(productSpecificationSchema).optional().default([]),
    standardPrice: z
      .number({ invalid_type_error: 'Standard price must be a number' })
      .min(0, { message: 'Standard price cannot be negative' })
      .default(0)
      .optional(),
    dealerPrice: z
      .number({ invalid_type_error: 'Dealer price must be a number' })
      .min(0, { message: 'Dealer price cannot be negative' })
      .default(0)
      .optional(),
    isFeatured: z.boolean().default(false).optional(),
    isActive: z.boolean().default(true).optional(),
  }),
};

export const updateProductSchema = {
  params: z.object({
    id: z.string().refine(isValidObjectId, { message: 'Invalid product ID format' }),
  }),
  body: z.object({
    sku: z
      .string()
      .trim()
      .min(2, { message: 'SKU must be at least 2 characters' })
      .max(50, { message: 'SKU cannot exceed 50 characters' })
      .optional(),
    name: z
      .string()
      .trim()
      .min(2, { message: 'Product name must be at least 2 characters' })
      .max(150, { message: 'Product name cannot exceed 150 characters' })
      .optional(),
    categoryId: z
      .string()
      .refine(isValidObjectId, { message: 'Invalid categoryId format. Must be a valid MongoDB ObjectId' })
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, { message: 'Description cannot exceed 2000 characters' })
      .optional(),
    images: z.array(productImageSchema).optional(),
    specifications: z.array(productSpecificationSchema).optional(),
    standardPrice: z
      .number({ invalid_type_error: 'Standard price must be a number' })
      .min(0, { message: 'Standard price cannot be negative' })
      .optional(),
    dealerPrice: z
      .number({ invalid_type_error: 'Dealer price must be a number' })
      .min(0, { message: 'Dealer price cannot be negative' })
      .optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const getProductByIdSchema = {
  params: z.object({
    id: z.string().refine(isValidObjectId, { message: 'Invalid product ID format' }),
  }),
};

export const deleteProductSchema = {
  params: z.object({
    id: z.string().refine(isValidObjectId, { message: 'Invalid product ID format' }),
  }),
};

export const getProductsQuerySchema = {
  query: z.object({
    search: z.string().optional(),
    categoryId: z.string().optional(),
    isFeatured: z.string().optional(),
    isActive: z.string().optional(),
    page: z
      .string()
      .refine((val) => !isNaN(val) && parseInt(val, 10) >= 1, { message: 'Page must be a positive integer >= 1' })
      .optional(),
    limit: z
      .string()
      .refine((val) => !isNaN(val) && parseInt(val, 10) >= 1 && parseInt(val, 10) <= 100, {
        message: 'Limit must be between 1 and 100',
      })
      .optional(),
    sortBy: z
      .enum(['name', 'sku', 'createdAt'], {
        invalid_type_error: 'Invalid sortBy field. Allowed sort fields for product: name, sku, createdAt',
      })
      .optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
};

