import { z } from 'zod';
import mongoose from 'mongoose';

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

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
    // References a saved address in the submitting user's address book
    // (see address.service.js); the server looks it up and snapshots it
    // into Enquiry.deliveryAddress. Required - an enquiry must always carry
    // a real delivery address for the admin side to act on.
    addressId: z
      .string({ required_error: 'Please select or add a delivery address before submitting an enquiry' })
      .refine(isValidObjectId, { message: 'Invalid address ID format' }),
    // The number admin should reach the submitter on via WhatsApp (wa.me
    // deep link - see admin enquiry pages). May differ from their account
    // phone, so it's collected explicitly rather than assumed.
    whatsappNumber: z
      .string({ required_error: 'Please enter a WhatsApp number' })
      .trim()
      .regex(/^[6-9]\d{9}$/, { message: 'Please enter a valid 10-digit Indian mobile number' }),
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
