import { beforeEach, afterEach, expect, jest, test } from '@jest/globals';
import { Enquiry } from '../../backend/src/models/Enquiry.js';
import { Product } from '../../backend/src/models/Product.js';
import { posCustomerService } from '../../backend/src/services/posCustomer.service.js';
import { prepareEnquiryBill } from '../../backend/src/services/posEnquiry.service.js';
const secondOption = '507f1f77bcf86cd799439044';
const id = '507f1f77bcf86cd799439011', productId = '507f1f77bcf86cd799439022', optionId = '507f1f77bcf86cd799439033';
let order, products;
beforeEach(() => {
  order = { _id: id, source: 'whatsapp', userType: 'customer', enquiryNumber: 'WA-123', contactName: 'Order Customer', contactPhone: '+919876543210', contactEmail: 'order@example.test', whatsappNumber: '8769959424', deliveryAddress: { line1: 'Order street', city: 'Kota', state: 'Rajasthan', pincode: '324005' }, items: [{ productId, quantity: 3, priceShown: 123.45 }] };
  products = [{ _id: productId, name: 'Camera', sku: 'CAM', standardPrice: 150, dealerPrice: 130, stockQuantity: 5, hsnCode: '8525', isActive: true }];
  jest.spyOn(Enquiry, 'findById').mockImplementation(() => ({ lean: async () => order }));
  jest.spyOn(Product, 'find').mockImplementation(() => ({ lean: async () => products }));
  jest.spyOn(posCustomerService, 'lookup').mockResolvedValue({ found: true, customer: { name: 'Old name', address: 'Old address', gstin: '08ABCDE1234F1Z5' } });
});
afterEach(() => jest.restoreAllMocks());
test('handoff keeps customer snapshot, quantities and quoted prices without mutating orders or stock', async () => {
  const result = await prepareEnquiryBill(id, 'admin');
  expect(result).toMatchObject({ orderId: id, customerKnown: true, draft: { billType: 'b2c', customer: { name: 'Order Customer', phone: '9876543210', whatsappNumber: '8769959424', address: 'Order street', stateCode: '08' }, items: [{ productId, quantity: 3, unitPrice: 123.45, standardPrice: 150, hsn: '8525' }] } });
  expect(products[0].stockQuantity).toBe(5); expect(order.items[0].quantity).toBe(3);
});
test('dealer orders use B2B and retain individual variants and their exact prices', async () => {
  order.userType = 'dealer'; order.items.push({ productId, variantId: secondOption, quantity: 2, priceShown: 99 });
  products[0].variants = [{ _id: optionId, name: '4 MP', standardPrice: 120, dealerPrice: 110, stockQuantity: 4, isActive: true }, { _id: secondOption, name: '8 MP', standardPrice: 140, dealerPrice: 120, stockQuantity: 2, isActive: true }];
  order.items[0].variantId = optionId;
  const result = await prepareEnquiryBill(id, 'admin');
  expect(posCustomerService.lookup).toHaveBeenCalledWith(order.contactPhone, 'admin', 'b2b');
  expect(result.draft.billType).toBe('b2b'); expect(result.draft.items).toHaveLength(2); expect(result.draft.items[1]).toMatchObject({ variantId: secondOption, quantity: 2, unitPrice: 99 }); expect(result.draft.items[0]).toMatchObject({ variantId: optionId, quantity: 3, unitPrice: 123.45 });
});
test('missing orders, availability enquiries and unavailable products cannot become incomplete bills', async () => {
  const saved = order; order = null; await expect(prepareEnquiryBill(id, 'admin')).rejects.toMatchObject({ statusCode: 404 });
  order = saved; order.enquiryType = 'out-of-stock'; await expect(prepareEnquiryBill(id, 'admin')).rejects.toMatchObject({ statusCode: 400 });
  order.enquiryType = 'order'; products = []; await expect(prepareEnquiryBill(id, 'admin')).rejects.toMatchObject({ statusCode: 409 });
});

test('billed orders reopen their invoice and already fulfilled orders cannot be billed again', async () => {
  order.posSaleId = productId;
  expect(await prepareEnquiryBill(id, 'admin')).toMatchObject({ invoiceId: productId });
  delete order.posSaleId; order.stockDeductedAt = new Date();
  await expect(prepareEnquiryBill(id, 'admin')).rejects.toMatchObject({ statusCode: 409 });
});

test('storefront order enquiries can also prepare a bill from their detail page', async () => {
  order.source = 'storefront';
  expect((await prepareEnquiryBill(id, 'admin')).draft.notes).toBe('Enquiry WA-123');
});
