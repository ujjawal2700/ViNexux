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

const productUrlSchema = z.string().trim().max(500, 'Product URL cannot exceed 500 characters')
  .refine((value) => !value || /^https?:\/\//i.test(value), 'Product URL must start with http:// or https://')
  .optional();

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
    modelNumber: z.string({ required_error: 'Model number is required' }).trim().min(1).max(100),
    model: z.string().trim().max(100).optional().default('Standard Model'),
    stockQuantity: z.coerce.number().min(0, { message: 'Stock quantity cannot be negative' }).default(0).optional(),
    variant: z.string().trim().max(100).optional().default(''),
    warranty: z.string().trim().max(200).optional().default('1 Year ON-SITE / Direct Replacement Warranty'),
    informationPhone: z.string().trim().max(20).regex(/^\+?[0-9 ]*$/, 'Information phone must contain only digits, spaces, or a leading +').optional(),
    productUrl: productUrlSchema,
    categoryId: z
      .string({ required_error: 'Category ID is required' })
      .refine(isValidObjectId, { message: 'Invalid categoryId format. Must be a valid MongoDB ObjectId' })
      .optional(),
    categoryIds: z.array(z.string().refine(isValidObjectId, { message: 'Invalid categoryId format. Must be a valid MongoDB ObjectId' })).optional(),
    brandId: z.string({ required_error: 'Brand is required' }).refine(isValidObjectId, { message: 'Invalid brandId format' }),
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
    categoryIds: z.array(z.string().refine(isValidObjectId, { message: 'Invalid categoryId format. Must be a valid MongoDB ObjectId' })).optional(),
    modelNumber: z.string().trim().min(1).max(100).optional(),
    model: z.string().trim().max(100).optional(),
    stockQuantity: z.coerce.number().min(0, { message: 'Stock quantity cannot be negative' }).optional(),
    variant: z.string().trim().max(100).optional(),
    warranty: z.string().trim().max(200).optional(),
    informationPhone: z.string().trim().max(20).regex(/^\+?[0-9 ]*$/, 'Information phone must contain only digits, spaces, or a leading +').optional(),
    productUrl: productUrlSchema,
    brandId: z.string().refine(isValidObjectId, { message: 'Invalid brandId format' }).optional(),
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
    search: z.string().max(200).optional(),
    brandSlug: z.string().max(150).optional(),
    inStock: z.enum(['true', 'false']).optional(),
    availability: z.string().max(100).refine((value) => {
      const allowed = new Set(['in-stock', 'low-stock', 'on-order', 'out-of-stock']);
      const statuses = value.split(',').filter(Boolean);
      return statuses.length > 0 && statuses.every((status) => allowed.has(status));
    }, { message: 'Invalid availability filter' }).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    specs: z.string().max(10000).refine((value) => {
      try { return z.record(z.string().max(100), z.array(z.string().max(255)).max(30)).safeParse(JSON.parse(value)).success; }
      catch { return false; }
    }, { message: 'Specifications must be a JSON object of string arrays' }).optional(),
    categoryId: z.string().optional(),
    exactCategory: z.enum(['true', 'false']).optional(),
    category: z.string().optional(),
    categorySlug: z.string().optional(),
    brand: z.string().optional(),
    isFeatured: z.string().optional(),
    isActive: z.string().optional(),
    includeFacets: z.enum(['true', 'false']).optional(),
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
      .enum(['name', 'modelNumber', 'sku', 'createdAt', 'standardPrice', 'dealerPrice', 'sortOrder', 'updatedAt', 'stockUpdatedAt'], {
        invalid_type_error: 'Invalid sortBy field',
      })
      .optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
};
