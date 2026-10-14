import jwt from 'jsonwebtoken';
import { Cart } from '../../src/models/Cart.js';
import { Brand } from '../../src/models/Brand.js';
// Shared setup for feature tests. Exercise today's phone-first signup flow;
// business-section tests should not depend on an obsolete signup contract.
import bcrypt from 'bcryptjs';
import { authService } from '../../src/services/auth.service.js';
import { User } from '../../src/models/User.js';
export function accountRequests(rawRequest) {
  const signups = new Map();
  return async (path, options = {}, body = null) => {
    if (path === '/api/auth/signup' && body && body.role !== 'admin') {
      await authService.sendOtp({ identifier: body.phone, purpose: 'signup' });
      await authService.verifySignupOtp({ identifier: body.phone, otp: '123456' });
      body = { acceptPrivacyPolicy: true, acceptTerms: true,
        ...(body.role === 'dealer' ? { companyName: 'Fixture Dealer', organisationType: 'Proprietorship', gstin: '27ABCDE1234F1Z5', pan: 'ABCDE1234F', msmeNumber: 'UDYAM-MH-01-1234567', whatsappNumber: body.phone, aadhaarNumber: '123456789012', address: 'Test street', city: 'Kota', state: 'Rajasthan', pincode: '324001', officeLocation: { latitude: 25.18, longitude: 75.85 } } : {}), ...body };
    } else if (path === '/api/auth/verify-otp' && body?.purpose === 'signup') {
      const signup = signups.get(body.identifier);
      if (signup?.body?.data?.accessToken) return { ...signup, status: 200 };
      await authService.sendOtp({ identifier: body.identifier, purpose: 'login', portal: 'customer' });
      body = { ...body, purpose: 'login', portal: 'customer' };
    }
    if (['/api/admin/products', '/api/products'].includes(path) && options.method === 'POST' && body?.name && body?.sku) {
      const brand = await Brand.findOneAndUpdate({ slug: 'fixture-brand' }, { $setOnInsert: { name: 'Fixture Brand', isActive: true } }, { upsert: true, new: true });
      body = { modelNumber: body.sku, brandId: String(brand._id), ...body };
    }
    if (path === '/api/enquiries' && options.method === 'POST') {
      const token = options.headers?.Authorization?.replace(/^Bearer /, '');
      const user = token && await User.findById(jwt.decode(token)?.userId);
      if (user) {
        if (!user.savedAddresses.length) {
          user.savedAddresses.push({ line1: 'Fixture street', city: 'Kota', state: 'Rajasthan', pincode: '324001' });
          await user.save();
        }
        const cart = await Cart.findOne({ userId: user._id });
        const address = user.savedAddresses[0];
        body = { addressId: String(address._id), contactName: user.fullName, contactEmail: user.email, contactPhone: user.phone,
          deliveryAddress: { line1: address.line1, line2: address.line2, city: address.city, state: address.state, pincode: address.pincode },
          selectedProductIds: (cart?.items || []).map(item => String(item.productId)), whatsappNumber: user.phone, ...body };
      }
    }
    const response = await rawRequest(path, options, body);
    if (path === '/api/auth/signup' && body?.phone) signups.set(body.phone, response);
    return response;
  };
}
export async function loginFixture(user) {
  const password = 'Fixture-admin-password-2026';
  if (user.role === 'admin') {
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
  }
  await authService.sendOtp({ identifier: user.email, purpose: 'login', portal: user.role === 'admin' ? 'admin' : 'customer', ...(user.role === 'admin' ? { password } : {}) });
  return authService.verifyOtp({ identifier: user.email, purpose: 'login', portal: user.role === 'admin' ? 'admin' : 'customer', otp: '123456' });
}
