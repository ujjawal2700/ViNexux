import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { posService } from '../services/pos.service.js';
import { generatePosInvoice } from '../services/posInvoice.service.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { customerInvoiceService } from '../services/customerInvoice.service.js';
import { z } from 'zod';

const router = Router();
router.get('/my-invoices', authenticate, authorize('customer', 'dealer'), validate({ query: z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  reference: z.string().regex(/^[a-f\d]{64}$/).optional(),
}) }), asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  ApiResponse.success(res, 'Your invoices', await customerInvoiceService.list(req.user, req.query));
}));
router.get('/my-invoices/:id/pdf', authenticate, authorize('customer', 'dealer'), asyncHandler(async (req, res) => {
  const sale = await customerInvoiceService.get(req.user, req.params.id);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${sale.invoiceNumber.replaceAll('/', '-')}.pdf"`,
    'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' });
  res.send(await generatePosInvoice(sale));
}));
// Only an unguessable invoice link is public. Customer records, sales lists
// and all mutations remain behind the admin router's authentication guard.
router.get('/invoices/:token', asyncHandler(async (req, res) => {
  const sale = await posService.getSharedSale(req.params.token);
  const pdf = await generatePosInvoice(sale);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${sale.invoiceNumber.replaceAll('/', '-')}.pdf"`,
    'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' });
  res.send(pdf);
}));
export default router;
