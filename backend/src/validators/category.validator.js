import { z } from 'zod';
import mongoose from 'mongoose';

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

export const createCategorySchema = {
  body: z.object({
    name: z
      .string({ required_error: 'Category name is required' })
      .trim()
      .min(2, { message: 'Category name must be at least 2 characters' })
      .max(100, { message: 'Category name cannot exceed 100 characters' }),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'Slug must contain only lowercase alphanumeric characters and hyphens',
      })
      .optional(),
    parentId: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || isValidObjectId(val), {
        message: 'Invalid parentId format. Must be a valid MongoDB ObjectId',
      }),
    image: z.string().trim().optional(),
    description: z
      .string()
      .trim()
      .max(500, { message: 'Description cannot exceed 500 characters' })
      .optional(),
    isActive: z.boolean().default(true).optional(),
    sortOrder: z
      .number()
      .min(0, { message: 'Sort order cannot be negative' })
      .default(0)
      .optional(),
  }),
};

export const updateCategorySchema = {
  params: z.object({
    id: z.string().refine(isValidObjectId, { message: 'Invalid category ID format' }),
  }),
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Category name must be at least 2 characters' })
      .max(100, { message: 'Category name cannot exceed 100 characters' })
      .optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'Slug must contain only lowercase alphanumeric characters and hyphens',
      })
      .optional(),
    parentId: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || isValidObjectId(val), {
        message: 'Invalid parentId format. Must be a valid MongoDB ObjectId',
      }),
    image: z.string().trim().optional(),
    description: z
      .string()
      .trim()
      .max(500, { message: 'Description cannot exceed 500 characters' })
      .optional(),
    isActive: z.boolean().optional(),
    sortOrder: z
      .number()
      .min(0, { message: 'Sort order cannot be negative' })
      .optional(),
  }),
};

export const getCategoryByIdSchema = {
  params: z.object({
    id: z.string().refine(isValidObjectId, { message: 'Invalid category ID format' }),
  }),
};

export const deleteCategorySchema = {
  params: z.object({
    id: z.string().refine(isValidObjectId, { message: 'Invalid category ID format' }),
  }),
};

export const getCategoriesQuerySchema = {
  query: z.object({
    parentId: z.string().optional(),
    isActive: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z
      .enum(['name', 'sortOrder', 'createdAt'], {
        invalid_type_error: 'Invalid sortBy field. Allowed sort fields for category: name, sortOrder, createdAt',
      })
      .optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
};
