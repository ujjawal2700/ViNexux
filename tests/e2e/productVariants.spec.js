import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
import { POS_SELLER_DEFAULTS } from '../../shared/posBilling.js';

const id = '507f1f77bcf86cd799439011';
const first = '507f1f77bcf86cd799439071', second = '507f1f77bcf86cd799439072', third = '507f1f77bcf86cd799439073';
const variants = [
  { _id: first, name: '5m', sku: 'CAT6-5M', standardPrice: 150, dealerPrice: 120, applicablePrice: 150, stockQuantity: 4, isActive: true },
  { _id: second, name: '10m', sku: 'CAT6-10M', standardPrice: 250, dealerPrice: 210, applicablePrice: 250, stockQuantity: 7, isActive: true },
  { _id: third, name: '15m', sku: 'CAT6-15M', standardPrice: 350, dealerPrice: 300, applicablePrice: 350, stockQuantity: 0, isActive: true },
];
const product = { _id: id, name: 'Ethernet cable', sku: 'CAT6', modelNumber: 'CAT6-MODEL', isActive: true, standardPrice: 150, dealerPrice: 120, stockQuantity: 11, specifications: [], images: [{ url: 'https://example.com/cable.webp' }], variants };

test('a customer selects length-specific price and stock and submits that variant to the cart', async ({ page }, testInfo) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  await page.route(`**/api/products/${id}`, route => route.fulfill({ json: { success: true, data: product } }));
  const added = [];
  await page.route('**/api/cart/items', route => {
    added.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: true, data: { items: [], totalQuantity: 0 } } });
  });
  await page.goto(`/products/${id}`);
  const configuration = page.getByRole('group', { name: 'Choose Configuration', exact: true });
  const purchase = configuration.locator('..');
  await expect(configuration.getByRole('radio', { name: '5m', exact: true })).toBeChecked();
  await expect(purchase.getByTestId('purchase-price')).toHaveText('₹150');
  await configuration.getByRole('radio', { name: '10m', exact: true }).check();
  await expect(purchase.getByTestId('purchase-price')).toHaveText('₹250');
  await expect(purchase).toContainText('CAT6-10M');
  await configuration.screenshot({ path: testInfo.outputPath('variant-cards.png') });
  await purchase.getByRole('button', { name: 'Add to Cart', exact: true }).click();
  await expect.poll(() => added.length).toBe(1);
  expect(added[0]).toEqual({ productId: id, quantity: 1, variantId: second });
  await configuration.getByRole('radio', { name: '15m', exact: true }).check();
  await expect(purchase.getByText('OUT OF STOCK', { exact: true })).toBeVisible();
  await expect(purchase.getByRole('button', { name: 'Increase quantity' })).toHaveCount(0);
});

test('admin adds multiple options, saves their prices and stocks, and sends a stale-edit snapshot', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const current = { ...product, variants: [] }; const updates = [];
  await page.route(`**/api/admin/products/${id}`, route => {
    if (route.request().method() === 'PUT') { const body = route.request().postDataJSON(); updates.push(body); Object.assign(current, body); }
    return route.fulfill({ json: { success: true, data: current } });
  });
  await page.goto(`/admin/products/${id}`);
  await page.getByRole('button', { name: /^Pricing & Media/ }).click();
  await page.getByRole('button', { name: 'Add variant', exact: true }).click();
  await page.getByLabel('Option name 1', { exact: true }).fill('5m');
  await page.getByLabel('Retail price (₹) 1', { exact: true }).fill('150');
  await page.getByLabel('Dealer price (₹) 1', { exact: true }).fill('120');
  await page.getByLabel('Stock quantity 1', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Add variant', exact: true }).click();
  await page.getByLabel('Option name 2', { exact: true }).fill('10m');
  await page.getByLabel('Retail price (₹) 2', { exact: true }).fill('250');
  await page.getByLabel('Dealer price (₹) 2', { exact: true }).fill('210');
  await page.getByLabel('Stock quantity 2', { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Save & Publish', exact: true }).click();
  await expect.poll(() => updates.length).toBe(1);
  expect(updates[0]).toMatchObject({ expectedVariants: [], variants: [
    { name: '5m', standardPrice: 150, dealerPrice: 120, stockQuantity: 4 },
    { name: '10m', standardPrice: 250, dealerPrice: 210, stockQuantity: 7 },
  ] });
});

test('POS can add two lengths of the same product as independent lines', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.route('**/api/admin/pos/**', route => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/settings') ? POS_SELLER_DEFAULTS : path.endsWith('/products')
      ? variants.slice(0, 2).map(option => ({ ...product, ...option, _id: id, variantId: option._id, name: `Ethernet cable — ${option.name}`, specifications: [{ key: 'HSN', value: '85444290' }] })) : [];
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/admin/pos');
  await page.getByRole('button', { name: /Ethernet cable — 5m CAT6-5M/ }).click();
  await page.getByRole('button', { name: /Ethernet cable — 10m CAT6-10M/ }).click();
  await expect(page.getByLabel('Unit price (₹)', { exact: true })).toHaveCount(2);
  await expect(page.getByLabel('Unit price (₹)', { exact: true }).nth(0)).toHaveValue('150');
  await expect(page.getByLabel('Unit price (₹)', { exact: true }).nth(1)).toHaveValue('250');
  await page.locator('[data-pos-field="items.0.quantity"]').fill('3');
  await expect(page.locator('[data-pos-field="items.1.quantity"]')).toHaveValue('1');
});

test('cart selection and removal distinguish two options with the same product ID', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  let items = variants.slice(0, 2).map(option => ({ productId: { ...product, name: `Ethernet cable — ${option.name}`, sku: option.sku, stockQuantity: option.stockQuantity }, variantId: option._id, variantName: option.name, quantity: 1, priceSnapshot: option.standardPrice }));
  const removed = [];
  await page.route('**/api/cart', route => route.fulfill({ json: { success: true, data: { items } } }));
  await page.route(`**/api/cart/items/${id}**`, route => {
    const optionId = new URL(route.request().url()).searchParams.get('variantId');
    removed.push(optionId); items = items.filter(item => item.variantId !== optionId);
    return route.fulfill({ json: { success: true, data: { items } } });
  });
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Remove Ethernet cable — 5m', exact: true }).filter({ visible: true }).click();
  await expect.poll(() => removed.length).toBe(1);
  expect(removed[0]).toBe(first);
  await expect(page.getByRole('button', { name: 'Remove Ethernet cable — 10m', exact: true }).filter({ visible: true })).toBeVisible();
});

test('catalogue stock and price shortcuts update only the chosen option', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  let current = structuredClone(product); const stockEdits = [], priceEdits = [];
  await page.route('**/api/admin/products**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/stock')) {
      const body = route.request().postDataJSON(); stockEdits.push(body);
      current.variants = current.variants.map(option => option._id === body.variantId ? { ...option, stockQuantity: option.stockQuantity + body.quantity } : option);
      current.stockQuantity += body.quantity;
    } else if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON(); priceEdits.push(body); current.variants = body.variants;
    }
    const data = path === '/api/admin/products' ? { products: [current], pagination: { total: 1, page: 1, limit: 20, totalPages: 1 } } : current;
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/admin/products');
  await page.getByRole('button', { name: 'Update stock for Ethernet cable', exact: true }).click();
  await page.getByLabel('Stock variant', { exact: true }).selectOption(second);
  await page.getByLabel('Units to add', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Add Stock', exact: true }).click();
  await expect.poll(() => stockEdits.length).toBe(1);
  expect(stockEdits[0]).toMatchObject({ quantity: 3, operation: 'add', variantId: second });
  expect(current.variants[0].stockQuantity).toBe(4); expect(current.variants[1].stockQuantity).toBe(10);
  await page.getByRole('button', { name: 'Update standard price for Ethernet cable', exact: true }).click();
  await page.getByLabel('Price variant', { exact: true }).selectOption(second);
  await page.getByLabel('New standard price (₹)', { exact: true }).fill('275');
  await page.getByRole('button', { name: 'Save Price', exact: true }).click();
  await expect.poll(() => priceEdits.length).toBe(1);
  expect(priceEdits[0].variants[0].standardPrice).toBe(150);
  expect(priceEdits[0].variants[1].standardPrice).toBe(275);
  expect(priceEdits[0].expectedVariants[1].stockQuantity).toBe(10);
});

test('different products and multiple cable variants keep their own cart prices without horizontal scrolling', async ({ page }, testInfo) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  const other = { ...product, _id: '507f1f77bcf86cd799439088', name: 'Power adapter', variants: [], standardPrice: 100, applicablePrice: 100, stockQuantity: 10 };
  let items = [];
  for (const item of [product, other]) await page.route(`**/api/products/${item._id}`, route => route.fulfill({ json: { success: true, data: item } }));
  await page.route('**/api/cart', route => route.fulfill({ json: { success: true, data: { cart: { items } } } }));
  await page.route('**/api/cart/items', route => {
    const body = route.request().postDataJSON(); const option = variants.find(v => v._id === body.variantId);
    const selected = option ? { ...product, name: `${product.name} — ${option.name}`, standardPrice: option.standardPrice, applicablePrice: option.standardPrice, stockQuantity: option.stockQuantity, sku: option.sku } : other;
    items.push({ productId: selected, variantId: option?._id, variantName: option?.name, priceSnapshot: selected.applicablePrice, quantity: 1 });
    return route.fulfill({ json: { success: true, data: { cart: { items } } } });
  });
  await page.goto(`/products/${id}`);
  for (const [name, total] of [['5m', 1], ['10m', 2]]) {
    await page.getByRole('radio', { name, exact: true }).check();
    await page.getByRole('button', { name: 'Add to Cart', exact: true }).click();
    await expect.poll(() => items.length).toBe(total);
  }
  await page.goto(`/products/${other._id}`);
  await page.getByRole('button', { name: 'Add to Cart', exact: true }).click();
  await expect.poll(() => items.length).toBe(3);
  await page.goto('/cart');
  await expect(page.locator('[data-cart-item]')).toHaveCount(3);
  const summary = page.getByRole('heading', { name: 'Order Summary', exact: true }).locator('..');
  await expect(summary).toContainText('₹500');
  await expect(summary.getByText('Dealer savings', { exact: true })).toHaveCount(0);
  await expect(page.getByText('CD DISCOUNT', { exact: true })).toHaveCount(0);
  for (const [variant, price] of [[first, '₹150'], [second, '₹250']]) await expect(page.locator(`[data-cart-item="${id}:${variant}"]`)).toContainText(price);
  for (const width of [1920, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const card of await page.locator('[data-cart-item]').all()) expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`cart-${width}.png`) });
  }
});

test('variant cards hide prices from guests and update unavailable selections', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  await page.route(`**/api/products/${id}`, route => route.fulfill({ json: { success: true, data: product } }));
  await page.goto(`/products/${id}`);
  const options = page.getByRole('group', { name: 'Choose Configuration', exact: true });
  await expect(options).not.toContainText('₹');
  await options.getByRole('radio', { name: '15m', exact: true }).check();
  await expect(page.getByRole('heading', { name: 'Ethernet cable — 15m', exact: true })).toBeVisible();
  await expect(page.getByTestId('purchase-price')).toHaveCount(0);
  await options.getByRole('radio', { name: '15m', exact: true }).press('ArrowLeft');
  await expect(options.getByRole('radio', { name: '10m', exact: true })).toBeChecked();
  await expect(page.getByRole('heading', { name: 'Ethernet cable — 10m', exact: true })).toBeVisible();
});

test('dealer cart totals each variant price without exposing a discount breakdown', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  const dealer = { _id: id, role: 'dealer', fullName: 'Approved Dealer', email: 'dealer@example.test', dealerStatus: 'approved', kycStatus: 'approved' };
  await page.route('**/api/auth/refresh-token', route => route.fulfill({ json: { success: true, data: { user: dealer, accessToken: 'dealer-token', refreshToken: 'customer-refresh' } } }));
  await page.route('**/api/auth/me', route => route.fulfill({ json: { success: true, data: { user: dealer } } }));
  const items = variants.slice(0, 2).map(option => ({ productId: { ...product, name: `Ethernet cable — ${option.name}`, standardPrice: option.standardPrice, stockQuantity: option.stockQuantity }, variantId: option._id, variantName: option.name, quantity: 2, priceSnapshot: option.dealerPrice }));
  await page.route('**/api/cart', route => route.fulfill({ json: { success: true, data: { cart: { items } } } }));
  await page.goto('/cart');
  const summary = page.getByRole('heading', { name: 'Order Summary', exact: true }).locator('..');
  await expect(summary.getByText('Dealer savings', { exact: true })).toHaveCount(0);
  await expect(summary).not.toContainText('₹800'); // Retail comparison is hidden.
  await expect(summary).not.toContainText('₹140'); // Savings are hidden.
  await expect(summary).toContainText('₹660'); // payable: (120 + 210) × 2
  await expect(page.getByText('CD DISCOUNT', { exact: true })).toHaveCount(0);
});
