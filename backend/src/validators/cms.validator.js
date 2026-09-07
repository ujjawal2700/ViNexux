import { z } from 'zod';
import mongoose from 'mongoose';

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

const noScriptTag = (val) => {
  if (typeof val !== 'string') return true;
  const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
  const inlineJsRegex = /on\w+\s*=/gi;
  return !scriptRegex.test(val) && !inlineJsRegex.test(val);
};

export const getByIdSchema = {
  params: z.object({
    id: z
      .string({ required_error: 'ID parameter is required' })
      .refine(isValidObjectId, { message: 'Invalid ID format. Must be a valid MongoDB ObjectId' }),
  }),
};

export const bannerSchema = {
  body: z.object({
    title: z.string().trim().max(150).optional(),
    subtitle: z.string().trim().max(300).optional(),
    image: z.object({
      url: z.string({ required_error: 'Image URL is required' }).trim().min(1, { message: 'Image URL cannot be empty' }),
      publicId: z.string().trim().optional(),
    }),
    link: z.string().trim().optional(),
    buttonText: z.string().trim().max(50).optional(),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.number().int().min(0).optional().default(0),
  }),
};

export const updateBannerSchema = {
  params: z.object({
    id: z.string().refine(isValidObjectId, { message: 'Invalid banner ID format' }),
  }),
  body: bannerSchema.body.partial(),
};

const promoBannerBodyObject = z.object({
  title: z.string({ required_error: 'Title is required' }).trim().min(1).max(150),
  image: z.object({
    url: z.string({ required_error: 'Image URL is required' }).trim().min(1),
    publicId: z.string().trim().optional(),
  }),
  link: z.string().trim().optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const validateDates = (data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
};

export const promoBannerSchema = {
  body: promoBannerBodyObject.refine(validateDates, {
    message: 'End date cannot be earlier than start date',
    path: ['endDate'],
  }),
};

export const updatePromoBannerSchema = {
  params: z.object({
    id: z.string().refine(isValidObjectId, { message: 'Invalid promo banner ID format' }),
  }),
  body: promoBannerBodyObject.partial().refine(validateDates, {
    message: 'End date cannot be earlier than start date',
    path: ['endDate'],
  }),
};

export const cmsPageSchema = {
  body: z.object({
    slug: z
      .string({ required_error: 'Page slug is required' })
      .trim()
      .toLowerCase()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase alphanumeric characters and hyphens' }),
    title: z.string({ required_error: 'Title is required' }).trim().min(1).max(150),
    content: z
      .string({ required_error: 'Content is required' })
      .trim()
      .min(1)
      .refine(noScriptTag, { message: 'Content contains invalid or unsafe script tags' }),
    isPublished: z.boolean().optional().default(true),
  }),
};

export const updateCmsPageSchema = {
  params: z.object({
    id: z.string().refine(isValidObjectId, { message: 'Invalid page ID format' }),
  }),
  body: z.object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase alphanumeric characters and hyphens' })
      .optional(),
    title: z.string().trim().min(1).max(150).optional(),
    content: z
      .string()
      .trim()
      .min(1)
      .refine(noScriptTag, { message: 'Content contains invalid or unsafe script tags' })
      .optional(),
    isPublished: z.boolean().optional(),
  }),
};

export const trustBadgeSchema = {
  body: z.object({
    title: z.string({ required_error: 'Title is required' }).trim().min(1).max(100),
    description: z.string().trim().max(300).optional(),
    icon: z
      .object({
        url: z.string().trim().min(1),
        publicId: z.string().trim().optional(),
      })
      .optional(),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.number().int().min(0).optional().default(0),
  }),
};

export const updateTrustBadgeSchema = {
  params: z.object({
    id: z.string().refine(isValidObjectId, { message: 'Invalid trust badge ID format' }),
  }),
  body: trustBadgeSchema.body.partial(),
};

export const footerContentSchema = {
  body: z.object({
    companyName: z.string().trim().max(150).optional(),
    companyDescription: z.string().trim().max(500).optional(),
    email: z.string().trim().email({ message: 'Invalid email address format' }).optional().or(z.literal('')),
    phone: z.string().trim().optional(),
    address: z.string().trim().optional(),
    quickLinks: z
      .array(
        z.object({
          label: z.string().trim().min(1),
          url: z.string().trim().min(1),
          sortOrder: z.number().int().min(0).optional().default(0),
        })
      )
      .optional(),
    legalLinks: z
      .array(
        z.object({
          label: z.string().trim().min(1),
          url: z.string().trim().min(1),
          sortOrder: z.number().int().min(0).optional().default(0),
        })
      )
      .optional(),
    isActive: z.boolean().optional().default(true),
  }),
};

export const getPageBySlugSchema = {
  params: z.object({
    slug: z
      .string({ required_error: 'Slug parameter is required' })
      .trim()
      .toLowerCase()
      .min(1)
      .max(100),
  }),
};
