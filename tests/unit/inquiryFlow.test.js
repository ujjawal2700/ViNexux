import { describe, expect, test } from '@jest/globals';
import { createEnquirySchema } from '../../backend/src/validators/enquiry.validator.js';
import { createAddressSchema } from '../../backend/src/validators/address.validator.js';
import { normalizeEnquiryPhone, validateEnquiryContact } from '../../frontend/src/utils/enquiryValidation.js';
import { getMaximumEnquiryQuantity, getMaximumOrderQuantity } from '../../frontend/src/utils/inventory.js';
import { CATALOG_FIELDS_VERSION, CATALOG_SOURCE_PATHS, computeCatalogFields, requiredSearchTokens } from '../../backend/src/utils/productCatalogFields.js';
const payload = { addressId: '507f1f77bcf86cd799439011', contactName: 'Camera Customer', contactEmail: 'customer@example.test', contactPhone: '9876543210', whatsappNumber: '9876543210', selectedProductIds: ['507f1f77bcf86cd799439012'], deliveryAddress: { line1: 'A', line2: 'B'.repeat(255), city: 'C', state: 'D', pincode: '302001' } };
describe('inquiry validation', () => {
  test('addresses valid in the address book are accepted at checkout, including short fields and 255 characters', () => {
    for (const line1 of ['A', 'A'.repeat(255)]) {
      const address = { ...payload.deliveryAddress, line1 };
      expect(createAddressSchema.body.safeParse(address).success).toBe(true);
      expect(createEnquirySchema.body.safeParse({ ...payload, deliveryAddress: address }).success).toBe(true);
    }
  });
  test('invalid contact fields return actionable field paths', () => {
    const result = createEnquirySchema.body.safeParse({ ...payload, contactName: '', contactEmail: 'bad', contactPhone: '12' });
    expect(result.error.issues.map(issue => issue.path[0])).toEqual(['contactName', 'contactEmail', 'contactPhone']);
    expect(result.error.issues[0].message).toContain('full name');
  });
  test('Indian country codes are normalized without accepting arbitrary extra digits', () => {
    expect(normalizeEnquiryPhone('+91 98765 43210')).toBe('9876543210');
    expect(validateEnquiryContact({ fullName: 'Customer', email: 'customer@example.test', phone: '+91 9876543210' })).toEqual({});
    expect(validateEnquiryContact({ fullName: 'C', email: 'bad', phone: '12349876543210' })).toHaveProperty('contactPhone');
  });
});
test('zero-stock availability inquiries are allowed while order fulfillment remains blocked', () => {
  expect(getMaximumEnquiryQuantity({ stockQuantity: 0 })).toBe(1000);
  expect(getMaximumOrderQuantity({ stockQuantity: 0 })).toBe(0);
  expect(getMaximumEnquiryQuantity({ stockQuantity: 2 })).toBe(2);
  expect(getMaximumEnquiryQuantity({ stockQuantity: 8 })).toBe(8);
});
test('model numbers participate in catalog derivation, including changes and backfill version', () => {
  const fields = computeCatalogFields({ name: 'Camera', sku: 'CAM', modelNumber: 'DS-2CD2043G2-I', stockQuantity: 10 });
  expect(CATALOG_SOURCE_PATHS).toContain('modelNumber');
  expect(CATALOG_FIELDS_VERSION).toBeGreaterThan(1);
  expect(fields.searchTokens).toEqual(expect.arrayContaining(requiredSearchTokens('2cd2043g2')));
});
