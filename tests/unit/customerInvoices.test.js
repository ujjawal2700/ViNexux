import { jest, afterEach, test, expect } from '@jest/globals';
import { PosSale } from '../../backend/src/models/PosSale.js';
import { customerInvoiceService, invoiceOwnerFilter } from '../../backend/src/services/customerInvoice.service.js';
const user = { _id: '507f1f77bcf86cd799439025', phone: '+919876543210', isPhoneVerified: true };
afterEach(() => jest.restoreAllMocks());

test('ownership permits the account and legacy invoices for a verified primary phone only', () => {
  expect(invoiceOwnerFilter(user)).toEqual({ $or: [{ customerId: user._id }, { customerId: null,
    'customer.phone': { $in: ['9876543210', '919876543210', '+919876543210'] } }] });
  expect(invoiceOwnerFilter({ ...user, isPhoneVerified: false })).toEqual({ $or: [{ customerId: user._id }] });
  expect(invoiceOwnerFilter({ _id: user._id })).toEqual({ $or: [{ customerId: user._id }] });
});
test('PDF retrieval scopes the guessed invoice ID to the authenticated account', async () => {
  const find = jest.spyOn(PosSale, 'findOne').mockResolvedValue(null);
  const id = '507f1f77bcf86cd799439099';
  await expect(customerInvoiceService.get(user, id)).rejects.toMatchObject({ statusCode: 404 });
  expect(find).toHaveBeenCalledWith({ $and: [invoiceOwnerFilter(user), { _id: id }] });
});
test('invoice lists and shared selections are both scoped and paginated without exposing share tokens', async () => {
  const query = { select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: async () => [{ _id: 'mine' }] };
  const find = jest.spyOn(PosSale, 'find').mockReturnValue(query);
  jest.spyOn(PosSale, 'countDocuments').mockResolvedValue(41);
  const selected = jest.spyOn(PosSale, 'findOne').mockReturnValue({ select: () => ({ lean: async () => null }) });
  const reference = 'b'.repeat(64);
  const result = await customerInvoiceService.list(user, { page: 2, reference });
  expect(result).toMatchObject({ invoices: [{ _id: 'mine' }], total: 41, pages: 3, selected: null });
  expect(find).toHaveBeenCalledWith(invoiceOwnerFilter(user));
  expect(query.skip).toHaveBeenCalledWith(20); expect(query.limit).toHaveBeenCalledWith(20);
  expect(query.select.mock.calls[0][0]).not.toContain('shareToken');
  expect(selected).toHaveBeenCalledWith({ $and: [invoiceOwnerFilter(user), { shareToken: reference }] });
});
