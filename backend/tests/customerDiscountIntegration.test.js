import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { DealerProfile } from '../src/models/DealerProfile.js';
import { getPublicProducts, getPublicProductById } from '../src/services/catalog.service.js';
import { calculateApplicablePrices, addToCart, getCart } from '../src/services/cart.service.js';
import { createEnquiryFromCart } from '../src/services/enquiry.service.js';
import { saveAccount } from '../src/services/adminAccount.service.js';

try {
  await mongoose.connect(process.env.MONGODB_URI);
  const category = await Category.create({ name: 'Discount cameras', slug: 'discount-cameras', isActive: true });
  const product = await Product.create({ name: 'Discount Camera', sku: 'DISC-1', modelNumber: 'DISC-1', categoryId: category._id, standardPrice: 100, dealerPrice: 80, stockQuantity: 20, isActive: true });
  const users = await User.create([5, 10, 0].map((customerDiscountPercent, index) => ({ fullName: `Customer ${index}`, email: `discount${index}@example.test`, phone: `987654321${index}`, role: 'customer', accountStatus: 'active', customerDiscountPercent, savedAddresses: [{ line1: 'Customer Street', city: 'Kota', state: 'Rajasthan', pincode: '324001' }] })));
  assert.equal((await User.findById(users[0]._id).lean()).customerDiscountPercent, undefined, 'Discount configuration is private by default');
  for (const [index, user] of users.entries()) {
    const expected = [95, 90, 100][index];
    const prices = await calculateApplicablePrices(user._id, [product]);
    assert.equal(prices.get(String(product._id)), expected);
    const detail = await getPublicProductById(String(product._id), user);
    assert.equal(detail.applicablePrice, expected); assert.equal(detail.dealerPrice, undefined);
    assert.equal(detail.customerDiscountPercent, undefined);
    const filtered = await getPublicProducts({ minPrice: expected, maxPrice: expected, includeFacets: false }, user);
    assert.ok(filtered.products.some(row => String(row._id) === String(product._id)), 'Price filters use the final customer price');
    const cart = await addToCart(user._id, String(product._id), 1);
    assert.equal(cart.items[0].priceSnapshot, expected);
    const order = await createEnquiryFromCart(user._id, { addressId: String(user.savedAddresses[0]._id), whatsappNumber: user.phone, requestId: randomUUID() }, { source: 'whatsapp' });
    assert.equal(order.items[0].priceShown, expected, 'Order snapshots use server-calculated discounted prices');
  }
  const first = users[0];
  await saveAccount({ id: first._id, role: 'customer', data: { fullName: first.fullName, email: first.email, phone: first.phone, address: '', accountStatus: 'active', customerDiscountPercent: 12.5 }, actorId: users[2]._id });
  assert.equal((await getCart(first._id)).items[0].priceSnapshot, 87.5, 'Existing carts reprice after discount edits');
  assert.equal((await getPublicProductById(String(product._id), first)).applicablePrice, 87.5);
  await User.updateOne({ _id: first._id }, { $set: { customerDiscountPercent: 0 } });
  assert.equal((await getCart(first._id)).items[0].priceSnapshot, 100, 'Removing discount restores standard prices');
  const dealer = await User.create({ fullName: 'Dealer', email: 'discount-dealer@example.test', phone: '9876543220', role: 'dealer', customerDiscountPercent: 99 });
  await DealerProfile.create({ userId: dealer._id, companyName: 'Dealer Company', status: 'approved', dealerDiscountPercent: 3 });
  assert.equal((await calculateApplicablePrices(dealer._id, [product])).get(String(product._id)), 77.6, 'Customer discount never applies to dealer prices');
  console.log('Customer discounts passed: private settings, per-customer catalog/detail/filter prices, live cart repricing, order snapshots and dealer isolation.');
} finally { await mongoose.disconnect(); }
