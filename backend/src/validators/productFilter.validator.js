import { z } from 'zod';
import mongoose from 'mongoose';
const id = z.string().refine(value => mongoose.Types.ObjectId.isValid(value), 'Select a valid ID.');
export const filterSelectionsSchema = z.record(id, z.array(id).max(100)).refine(value => Object.keys(value).length <= 100, 'Select up to 100 filter groups.');
export const filterBody = z.object({
  name: z.string().trim().min(1).max(100).refine(value => !['brand', 'brands', 'category', 'categories', 'main category', 'main categories'].includes(value.toLowerCase().replace(/\s+/g, ' ')), 'Brands and categories are already built-in filters.'),
  type: z.enum(['checkbox', 'radio', 'select']).default('checkbox'),
  isActive: z.boolean().default(true), sortOrder: z.number().int().min(0).max(100000).default(0),
  options: z.array(z.object({ id: id.optional(), label: z.string().trim().min(1).max(120), productIds: z.array(id).default([]) })).min(1).max(100),
}).superRefine((value, context) => {
  const names = new Set(), ids = new Set();
  value.options.forEach((option, index) => {
    const name = option.label.toLowerCase();
    if (names.has(name)) context.addIssue({ code: 'custom', path: ['options', index, 'label'], message: 'Each option needs a different label.' });
    names.add(name);
    if (option.id && ids.has(option.id)) context.addIssue({ code: 'custom', path: ['options', index, 'id'], message: 'Duplicate option ID.' });
    if (option.id) ids.add(option.id);
  });
});
export const saveFilterSchema = { body: filterBody };
export const filterIdSchema = { params: z.object({ id }) };
export const filterProductSearchSchema = { query: z.object({ search: z.string().trim().max(150).default(''), page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }) };
