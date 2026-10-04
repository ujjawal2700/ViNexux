import { describe, expect, test } from '@jest/globals';
import { signupSchema } from '../../backend/src/validators/auth.validator.js';

const validDealer = {
  fullName: 'Test Dealer', email: 'dealer@example.com', phone: '9876543210', password: 'Password123!', role: 'dealer',
  companyName: 'Test Company', organisationType: 'Proprietorship', gstin: '08ABCDE1234F1Z5', pan: 'ABCDE1234F',
  msmeNumber: 'UDYAM-RJ-01-1234567', whatsappNumber: '9876543210', aadhaarNumber: '123456789012',
  address: 'Office Road', city: 'Jaipur', state: 'Rajasthan', pincode: '302001',
  officeLocation: { latitude: 26.9124, longitude: 75.7873 }, acceptPrivacyPolicy: true, acceptTerms: true,
};

describe('dealer signup validation', () => {
  test('accepts every required registration section', () => {
    expect(signupSchema.body.safeParse(validDealer).success).toBe(true);
  });

  test.each(['organisationType', 'pan', 'msmeNumber', 'whatsappNumber', 'officeLocation'])(
    'rejects a dealer missing %s',
    (field) => {
      const payload = { ...validDealer };
      delete payload[field];
      expect(signupSchema.body.safeParse(payload).success).toBe(false);
    }
  );
});
