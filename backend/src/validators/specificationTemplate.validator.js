import { z } from 'zod';
import mongoose from 'mongoose';
import { isInventorySpecification } from '../../../shared/productSpecifications.js';
import { specificationKey } from '../../../shared/specificationTemplates.js';
const fields = {
  name: z.string({ required_error: 'Please enter a template name' }).trim().min(2, 'Template name must contain at least 2 characters').max(100),
  description: z.string().trim().max(300).optional().default(''),
  specifications: z.array(z.object({
    key: z.string().trim().min(1, 'Please enter a specification name').max(100).refine(key => !isInventorySpecification(key), 'Inventory quantities cannot be saved in a specifications template'),
    value: z.string().trim().min(1, 'Please enter a specification value').max(2000),
  })).min(1, 'Add at least one specification').max(100, 'A template can contain up to 100 specifications').superRefine((specs, context) => {
    const pairs = new Set();
    specs.forEach((spec, index) => {
      const pair = JSON.stringify([specificationKey(spec.key), specificationKey(spec.value)]);
      if (pairs.has(pair)) context.addIssue({ code: z.ZodIssueCode.custom, path: [index, 'key'], message: 'This specification and value are already in the template' });
      pairs.add(pair);
    });
  }),
};
const params = z.object({ templateId: z.string().refine(mongoose.isValidObjectId, 'Invalid template ID') });
export const listSpecificationTemplatesSchema = { query: z.object({ search: z.string().trim().max(100).optional().default(''), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20) }) };
export const createSpecificationTemplateSchema = { body: z.object(fields).strict() };
export const updateSpecificationTemplateSchema = { params, body: z.object({ ...fields, expectedRevision: z.number().int().min(0) }).strict() };
export const deleteSpecificationTemplateSchema = { params };
