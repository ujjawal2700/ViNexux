import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011';
const camera = { _id: id, name: 'Outdoor CCTV Camera', sku: 'CAM-1', modelNumber: 'DS-2CD', stockQuantity: 0, stockStatus: 'out-of-stock', standardPrice: 100, isActive: true, images: [], specifications: [] };
for (const portal of ['customer', 'admin']) test(`${portal} OTP submits automatically, shows invalid code and verifies a correction once`, async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  let attempts = [];
  await page.route('**/api/auth/send-otp', route => route.fulfill({ json: { success: true, data: { mockOtpEnabled: true, mockOtp: '123456' } } }));
  await page.route('**/api/auth/verify-otp', route => {
    const body = route.request().postDataJSON(); attempts.push(body);
    if (attempts.length === 1) return route.fulfill({ status: 400, json: { success: false, message: 'Invalid or expired verification code' } });
    return route.fulfill({ json: { success: true, data: { accessToken: 'e2e-access', refreshToken: portal === 'admin' ? 'admin-refresh' : 'customer-refresh', user: { _id: id, name: 'Login User', role: portal, phone: '9876543210' }, session: { expiresAt: new Date(Date.now() + 86400000).toISOString() } } } });
  });
  await page.goto(portal === 'admin' ? '/admin/login' : '/login');
  if (portal === 'admin') {
    await page.getByPlaceholder('Enter Email Address or Phone Number').fill('admin@example.test');
    await page.getByPlaceholder('Enter Administrator Password').fill('password123');
    await page.getByRole('button', { name: 'Request Admin OTP' }).click();
  } else {
    await page.getByPlaceholder('Email ID Or 9876543210').fill('9876543210');
    await page.getByRole('button', { name: 'Get OTP' }).click();
  }
  await expect(page).toHaveURL(/verify-otp/);
  for (let i = 0; i < 6; i++) await page.getByLabel(`OTP digit ${i + 1}`, { exact: true }).fill(String(i + 1));
  await expect(page.getByText('Invalid or expired verification code', { exact: true })).toBeVisible();
  expect(attempts).toHaveLength(1);
  await page.getByLabel('OTP digit 6', { exact: true }).focus();
  await page.keyboard.press('7');
  await expect(page).toHaveURL(portal === 'admin' ? '/admin/dashboard' : '/');
  expect(attempts).toHaveLength(2);
});

test('customer OTP accepts operating-system autofill without clicking Verify', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  await page.route('**/api/auth/send-otp', route => route.fulfill({ json: { success: true, data: { mockOtpEnabled: true } } }));
  await page.route('**/api/auth/verify-otp', route => route.fulfill({ json: { success: true, data: { accessToken: 'e2e-access', refreshToken: 'customer-refresh', user: { _id: id, role: 'customer', phone: '9876543210' } } } }));
  await page.goto('/login'); await page.getByPlaceholder('Email ID Or 9876543210').fill('9876543210');
  await page.getByRole('button', { name: 'Get OTP' }).click();
  await page.getByLabel('OTP digit 1', { exact: true }).fill('123456');
  await expect(page).toHaveURL('/');
});

test('checkout displays and focuses specific contact validation errors and submits completed fields', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  const address = { _id: id, label: 'Home', line1: 'A', line2: 'B'.repeat(255), city: 'C', state: 'D', pincode: '302001', isDefault: true };
  await page.route('**/api/addresses', route => route.fulfill({ json: { success: true, data: { addresses: [address] } } }));
  await page.route('**/api/cart', route => route.fulfill({ json: { success: true, data: { cart: { items: [{ productId: camera, quantity: 1, priceSnapshot: 100 }] } } } }));
  let payload, attempts = 0;
  await page.route('**/api/enquiries', route => {
    payload = route.request().postDataJSON(); attempts++;
    if (attempts === 1) return route.fulfill({ status: 400, json: { message: 'Validation error', details: [{ path: 'contactEmail', message: 'Please enter a valid email address.' }] } });
    return route.fulfill({ status: 201, json: { success: true, data: { enquiry: { _id: id, enquiryNumber: 'ENQ-TEST' } } } });
  });
  await page.goto('/account/checkout-enquiry');
  await page.getByLabel('Full Name', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Send Enquiry', exact: true }).click();
  await expect(page.getByLabel('Full Name', { exact: true })).toBeFocused();
  expect(attempts).toBe(0);
  await page.getByLabel('Full Name', { exact: true }).fill('Customer Name');
  await page.getByRole('button', { name: 'Send Enquiry', exact: true }).click();
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
  await expect(page.getByText('Please enter a valid email address.', { exact: true }).first()).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('valid@example.test');
  await page.getByRole('button', { name: 'Send Enquiry', exact: true }).click();
  await expect(page).toHaveURL(`/account/enquiries/${id}`);
  expect(payload.contactName).toBe('Customer Name'); expect(payload.deliveryAddress.line1).toBe('A'); expect(payload.selectedProductIds).toEqual([id]);
});

test('out-of-stock products expose an inquiry action and a product-specific WhatsApp order link', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  await page.route(`**/api/products/${id}`, route => route.fulfill({ json: { success: true, data: camera } }));
  await page.route('**/api/content/footer-content', route => route.fulfill({ json: { success: true, data: { footer: { whatsappNumbers: [{ number: '9876543210' }] } } } }));
  let added;
  await page.route('**/api/cart/items', route => { added = route.request().postDataJSON(); return route.fulfill({ json: { success: true, data: { cart: { items: [{ productId: camera, quantity: 1 }] } } } }); });
  await page.goto(`/products/${id}`);
  await expect(page.getByRole('link', { name: 'Order on WhatsApp', exact: true })).toHaveAttribute('href', /wa.me\/919876543210\?text=.*DS-2CD/);
  await page.getByRole('button', { name: 'Enquire about availability', exact: true }).click();
  await expect.poll(() => added).toEqual({ productId: id, quantity: 1 });
  await expect(page.locator('input[aria-label="Search products"]:visible').first()).toHaveAttribute('placeholder', 'Search for CCTVs and related products.');
});

// Guest cart persistence is also used when an inquiry continues after login.
test('a guest can retain an out-of-stock product with a positive inquiry quantity', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  await page.route(`**/api/products/${id}`, route => route.fulfill({ json: { success: true, data: camera } }));
  await page.goto(`/products/${id}`);
  await page.getByRole('button', { name: 'Enquire about availability', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vinexus_guest_cart') || '[]').map(item => ({ id: item.productId._id, quantity: item.quantity })))).toEqual([{ id, quantity: 1 }]);
  await page.goto('/cart');
  await expect(page.getByRole('button', { name: 'Order on WhatsApp', exact: true })).toBeVisible();
});
