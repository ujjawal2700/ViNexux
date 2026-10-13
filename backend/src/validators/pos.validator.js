import { z } from 'zod';

const text = (max = 200) => z.string().trim().max(max).default('');
const phone = z.string().trim().regex(/^\+?[\d\s()-]{10,20}$/, 'Enter a valid phone number with country code.');
const amount = z.number().finite().min(0).max(100000000).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001, 'Use at most two decimal places.');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Enter a valid calendar date.');
export const customerSchema = z.object({
  name: z.string().trim().min(2).max(100), phone, whatsappNumber: phone,
  email: z.union([z.string().trim().email().max(150), z.literal('')]).default(''),
  address: z.string().trim().min(3).max(500), city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100), stateCode: z.string().regex(/^\d{2}$/),
  pincode: z.string().regex(/^\d{6}$/), gstin: z.union([z.string().trim().toUpperCase().regex(/^\d{2}[A-Z0-9]{13}$/), z.literal('')]).default(''),
});
const deliverySchema = z.object(Object.fromEntries([
  'deliveryNote', 'paymentTerms', 'reference', 'otherReferences', 'dispatchDoc', 'deliveryNoteDate',
  'dispatchedThrough', 'destination', 'vesselFlight', 'receiptPlace', 'loadingPort', 'dischargePort', 'terms',
].map(key => [key, text(key === 'terms' ? 500 : 100)])));
export const paymentSchema = z.object({ method: z.enum(['cash', 'upi', 'bank']), amount: amount.refine(n => n > 0), reference: text(), requestId: z.string().uuid() });
const salePaymentSchema = paymentSchema.extend({ amount });
export const posSaleSchema = z.object({
  requestId: z.string().uuid(), customer: customerSchema, shipping: customerSchema.optional(),
  delivery: deliverySchema.default({}), notes: text(1000),
  items: z.array(z.object({ productId: z.string().regex(/^[a-f\d]{24}$/i), quantity: z.number().int().min(1).max(10000),
    unitPrice: amount, discountPercent: z.number().finite().min(0).max(100).default(0),
    gstRate: z.number().finite().min(0).max(100), hsn: z.string().trim().regex(/^\d{4,8}$/, 'Enter a 4 to 8 digit HSN/SAC.'),
    unit: z.string().trim().min(1).max(10).default('NOS'), serialNumbers: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  })).min(1).max(100),
  taxMode: z.enum(['inclusive', 'exclusive']).default('inclusive'), roundOff: z.boolean().default(true),
  payments: z.array(salePaymentSchema).length(1, 'Choose Cash, UPI or Bank for the full invoice amount.'),
}).superRefine((sale, ctx) => {
  const ids = sale.items.map(item => item.productId);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: ['items'], message: 'Combine duplicate products into one line.' });
  const serials = sale.items.flatMap(item => item.serialNumbers);
  if (new Set(serials).size !== serials.length || sale.items.some(item => item.serialNumbers.length > item.quantity)) {
    ctx.addIssue({ code: 'custom', path: ['items'], message: 'Serial numbers must be unique and cannot exceed the item quantity.' });
  }
});
export const posSellerSchema = z.object({
  name: z.string().trim().min(2).max(150), address: z.string().trim().min(3).max(500),
  gstin: z.string().trim().toUpperCase().regex(/^\d{2}[A-Z0-9]{13}$/), state: z.string().trim().min(2).max(100),
  stateCode: z.string().regex(/^\d{2}$/), email: z.string().trim().email(), phone: text(20),
  invoicePrefix: z.string().trim().regex(/^[A-Z0-9-]{1,8}$/), accountHolder: text(), bankName: text(),
  accountNumber: text(50), branch: text(), ifsc: text(20), jurisdiction: text(100),
  declarations: z.array(z.string().trim().min(1).max(200)).max(6),
});
export const returnSchema = z.object({ requestId: z.string().uuid(), reason: z.string().trim().min(3).max(500),
  items: z.array(z.object({ productId: z.string().regex(/^[a-f\d]{24}$/i), quantity: z.number().int().min(1).max(10000) })).min(1).max(100),
});
export const posListSchema = z.object({
  search: text(150), from: date.optional(), to: date.optional(),
  status: z.enum(['all', 'completed', 'voided']).default('all'), paymentStatus: z.enum(['all', 'paid', 'partial', 'unpaid']).default('all'),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
});
