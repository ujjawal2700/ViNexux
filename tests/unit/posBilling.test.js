import { afterEach, describe, expect, jest, test } from '@jest/globals';
import mongoose from '../../backend/node_modules/mongoose/index.js';
import ExcelJS from '../../backend/node_modules/exceljs/excel.js';
import { PosSale, PosCounter, PosSettings } from '../../backend/src/models/PosSale.js';
import { Product } from '../../backend/src/models/Product.js';
import { posService } from '../../backend/src/services/pos.service.js';
import { posCustomerService } from '../../backend/src/services/posCustomer.service.js';
import { generatePosInvoice } from '../../backend/src/services/posInvoice.service.js';
import { generatePosExport } from '../../backend/src/services/posExport.service.js';
import { posSaleSchema, posSellerSchema } from '../../backend/src/validators/pos.validator.js';
import { calculatePosBill, financialYear, amountInWords, buildPosWhatsAppLink, POS_SELLER_DEFAULTS } from '../../shared/posBilling.js';
import { posInput, posInvoiceFixture, posAdminId, posProductId } from '../helpers/posFixture.js';
import { randomUUID } from 'node:crypto';

afterEach(() => jest.restoreAllMocks());

describe('POS calculation and input validation', () => {
  test('reproduces the reference invoice totals and rounding', () => {
    const input = posInput();
    expect(calculatePosBill(input.items, input)).toMatchObject({ subtotal: 6016.94, cgst: 541.52, sgst: 541.52, taxTotal: 1083.04, roundOffAmount: 0.02, total: 7100 });
  });
  test('inclusive prices and discounts reconcile without losing paise', () => {
    const input = posInput({ taxMode: 'inclusive', roundOff: false });
    input.items[0].unitPrice = 3550; input.items[0].discountPercent = 10;
    const result = calculatePosBill(input.items, input);
    expect(result.total).toBe(6390);
    expect(result.itemsTotal).toBe(7100); expect(result.discountTotal).toBe(710);
    expect(Math.round((result.subtotal + result.cgst + result.sgst) * 100)).toBe(639000);
  });
  test('interstate bills use IGST and reconcile HSN groups', () => {
    const input = posInput();
    const result = calculatePosBill(input.items, { ...input, interstate: true });
    expect(result).toMatchObject({ cgst: 0, sgst: 0, igst: 1083.05, total: 7100 });
    expect(result.taxGroups[0].igst).toBe(result.igst);
  });
  test('Indian financial year changes at midnight IST on April 1', () => {
    expect(financialYear('2026-03-31T18:29:59Z')).toBe('25-26');
    expect(financialYear('2026-03-31T18:30:00Z')).toBe('26-27');
  });
  test('amount words support Indian grouping and paise', () => {
    expect(amountInWords(7100)).toBe('INR Seven Thousand One Hundred Only');
    expect(amountInWords(1083.04)).toBe('INR One Thousand Eighty Three and Four paise Only');
    expect(amountInWords(100000)).toBe('INR One Lakh Only');
  });
  test('WhatsApp uses wa.me with a reviewed message and invoice link', () => {
    const invoice = posInvoiceFixture();
    const url = new URL(buildPosWhatsAppLink(invoice, 'https://example.com/api/pos/invoices/secret'));
    expect(url.hostname).toBe('wa.me'); expect(url.pathname).toBe('/919876543210');
    expect(url.searchParams.get('text')).toContain('https://example.com/api/pos/invoices/secret');
  });
  test('validates B2C details and rejects malformed quantities / money / serials', () => {
    expect(posSaleSchema.safeParse(posInput()).success).toBe(true);
    for (const change of [{ quantity: 0 }, { quantity: 1.5 }, { unitPrice: 0.001 }, { hsn: '' }, { serialNumbers: ['same', 'same'] }]) {
      const input = posInput(); Object.assign(input.items[0], change);
      expect(posSaleSchema.safeParse(input).success).toBe(false);
    }
    const duplicate = posInput(); duplicate.items.push({ ...duplicate.items[0] });
    expect(posSaleSchema.safeParse(duplicate).success).toBe(false);
    const badCustomer = posInput(); badCustomer.customer.pincode = '1';
    expect(posSaleSchema.safeParse(badCustomer).success).toBe(false);
    expect(posSellerSchema.safeParse(POS_SELLER_DEFAULTS).success).toBe(true);
  });
  test('date filters use IST inclusive days and escape regular expressions', () => {
    const filter = posService.buildFilter({ from: '2026-10-13', to: '2026-10-13', search: 'a.*b' });
    expect(filter.createdAt.$gte.toISOString()).toBe('2026-10-12T18:30:00.000Z');
    expect(filter.createdAt.$lt.toISOString()).toBe('2026-10-13T18:30:00.000Z');
    expect(filter.$or[0].invoiceNumber.test('axxxb')).toBe(false);
  });
});

// Transaction test double snapshots committed data. Every stock and sale write
// must use the same session; failures restore all data, including the counter.
const setup = ({ stock = 10, retry = false } = {}) => {
  let records = new Map(), stocks = new Map([[posProductId, stock]]), sequence = 0;
  const session = { endSession: jest.fn().mockResolvedValue(undefined) };
  session.withTransaction = jest.fn(async operation => {
    const previous = { records: structuredClone(records), stocks: structuredClone(stocks), sequence };
    const restore = () => { records = structuredClone(previous.records); stocks = structuredClone(previous.stocks); sequence = previous.sequence; };
    try { await operation(); if (retry) { restore(); await operation(); } }
    catch (error) { restore(); throw error; }
  });
  jest.spyOn(mongoose, 'startSession').mockResolvedValue(session);
  jest.spyOn(posCustomerService, 'persist').mockImplementation(async (customer, _adminId, used) => {
    expect(used).toBe(session); return { user: { _id: '507f1f77bcf86cd799439025' }, customer };
  });
  const query = lookup => ({ select() { return this; }, session(used) { expect(used).toBe(session); return Promise.resolve(lookup()); },
    then(resolve, reject) { return Promise.resolve(lookup()).then(resolve, reject); } });
  const doc = record => record ? new PosSale(record) : null;
  jest.spyOn(PosSale, 'findOne').mockImplementation(filter => query(() => doc([...records.values()].find(r => r.requestId === filter.requestId))));
  jest.spyOn(PosSale, 'findById').mockImplementation(id => query(() => doc(records.get(String(id)))));
  jest.spyOn(PosSale.prototype, 'save').mockImplementation(async function (options) {
    expect(options.session).toBe(session);
    records.set(String(this._id), JSON.parse(JSON.stringify(this.toObject()))); return this;
  });
  jest.spyOn(PosSettings, 'findById').mockReturnValue({ lean: async () => null });
  jest.spyOn(PosCounter, 'findOneAndUpdate').mockImplementation(async (_filter, _update, options) => {
    expect(options.session).toBe(session); return { sequence: ++sequence };
  });
  jest.spyOn(Product, 'findOneAndUpdate').mockImplementation(async (filter, update, options) => {
    expect(options.session).toBe(session);
    const id = String(filter._id), current = stocks.get(id);
    if (current === undefined || filter.stockQuantity && current < filter.stockQuantity.$gte) return null;
    stocks.set(id, current + update.$inc.stockQuantity);
    return { _id: id, name: 'Camera', sku: 'CAM-1', modelNumber: 'CAM-MODEL' };
  });
  return { stock: () => stocks.get(posProductId), records: () => records, session };
};

describe('POS transactional stock and payment lifecycle', () => {
  test('stock deduction and invoice save commit together; retry never duplicates', async () => {
    const state = setup({ retry: true }); const input = posInput();
    const sale = await posService.createSale(input, posAdminId);
    const repeat = await posService.createSale(input, posAdminId);
    expect(String(repeat._id)).toBe(String(sale._id)); expect(state.stock()).toBe(8); expect(state.records().size).toBe(1);
    expect(sale).toMatchObject({ total: 7100, paidAmount: 7100, balanceDue: 0, paymentStatus: 'paid' });
    expect(sale.shareToken).toMatch(/^[a-f\d]{64}$/);
  });
  test('insufficient stock rolls back the entire bill', async () => {
    const state = setup({ stock: 1 });
    await expect(posService.createSale(posInput(), posAdminId)).rejects.toMatchObject({ statusCode: 409 });
    expect(state.stock()).toBe(1); expect(state.records().size).toBe(0);
  });
  test('overpayment rolls back previously deducted stock', async () => {
    const state = setup();
    const input = posInput({ payments: [{ method: 'cash', amount: 8000, requestId: randomUUID() }] });
    await expect(posService.createSale(input, posAdminId)).rejects.toThrow('full invoice amount');
    expect(state.stock()).toBe(10); expect(state.records().size).toBe(0);
  });
  test('historical unpaid invoices retain idempotent receipts', async () => {
    const state = setup(); const sale = await posService.createSale(posInput(), posAdminId);
    const stored = state.records().get(String(sale._id));
    stored.payments = []; stored.paidAmount = 0; stored.balanceDue = 7100; stored.paymentStatus = 'unpaid';
    const payment = { method: 'upi', amount: 1000, reference: 'UTR', requestId: randomUUID() };
    await posService.addPayment(sale._id, payment, posAdminId);
    const updated = await posService.addPayment(sale._id, payment, posAdminId);
    expect(updated).toMatchObject({ paidAmount: 1000, balanceDue: 6100, paymentStatus: 'partial' });
    expect(updated.payments).toHaveLength(1);
    await expect(posService.addPayment(sale._id, { ...payment, requestId: randomUUID(), amount: 7000 }, posAdminId)).rejects.toThrow('exceeds');
  });
  test('returns, voids and refunds restore stock and settle money once', async () => {
    const state = setup();
    const input = posInput({ payments: [{ method: 'cash', amount: 7100, requestId: randomUUID(), reference: '' }] });
    const sale = await posService.createSale(input, posAdminId);
    const request = { requestId: randomUUID(), reason: 'Faulty unit', items: [{ productId: posProductId, quantity: 1 }] };
    await posService.returnItems(sale._id, request, posAdminId);
    const returned = await posService.returnItems(sale._id, request, posAdminId);
    expect(state.stock()).toBe(9); expect(returned.returns).toHaveLength(1); expect(returned.refundDue).toBe(3550);
    await expect(posService.returnItems(sale._id, { ...request, requestId: randomUUID(), items: [{ productId: posProductId, quantity: 2 }] }, posAdminId)).rejects.toThrow('exceeds');
    await posService.voidSale(sale._id, 'Sale correction', posAdminId);
    const voided = await posService.voidSale(sale._id, 'Sale correction', posAdminId);
    expect(state.stock()).toBe(10); expect(voided.refundDue).toBe(7100);
    const refund = { requestId: randomUUID(), method: 'cash', amount: 7100, reference: '' };
    await posService.addPayment(sale._id, refund, posAdminId, true);
    const refunded = await posService.addPayment(sale._id, refund, posAdminId, true);
    expect(refunded).toMatchObject({ paidAmount: 0, refundDue: 0, balanceDue: 0 });
    expect(refunded.refunds).toHaveLength(1);
  });
  test('full returns reconcile the invoice round-off', async () => {
    const state = setup(); const sale = await posService.createSale(posInput(), posAdminId);
    const updated = await posService.returnItems(sale._id, { requestId: randomUUID(), reason: 'Customer return', items: [{ productId: posProductId, quantity: 2 }] }, posAdminId);
    expect(updated.returnedAmount).toBe(sale.total); expect(updated.balanceDue).toBe(0); expect(state.stock()).toBe(10);
  });
  test.each([[], [{ method: 'cash', amount: 1000, requestId: randomUUID() }], [{ method: 'card', amount: 7100, requestId: randomUUID() }]].map(payments => [payments]))('new invoices reject credit, partial and card payments', async payments => {
    const state = setup();
    await expect(posService.createSale(posInput({ payments }), posAdminId)).rejects.toThrow('full invoice amount');
    expect(state.stock()).toBe(10); expect(state.records().size).toBe(0);
  });
});

describe('POS document outputs', () => {
  test('generates an A4 PDF with the embedded invoice assets', async () => {
    const buffer = await generatePosInvoice(posInvoiceFixture());
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-'); expect(buffer.length).toBeGreaterThan(10000);
  });
  test('Excel exports typed amounts, original phones and item detail', async () => {
    const invoice = posInvoiceFixture(); invoice.customer.name = '=HYPERLINK("malicious")';
    const buffer = await generatePosExport([invoice]);
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer);
    expect(workbook.worksheets.map(s => s.name)).toEqual(['Offline sales', 'Line items', 'Payments and refunds', 'Returns']);
    const sales = workbook.getWorksheet('Offline sales');
    expect(sales.getCell('D2').value).toBe(invoice.customer.name);
    expect(sales.getCell('E2').value).toBe('9876543210'); expect(sales.getCell('R2').value).toBe(7100);
    expect(sales.getCell('B2').value).toBeInstanceOf(Date);
    expect(sales.getCell('B2').value.toISOString()).toBe('2026-10-13T10:00:00.000Z');
    expect(workbook.getWorksheet('Line items').getCell('F2').value).toBe(2);
  });
});
