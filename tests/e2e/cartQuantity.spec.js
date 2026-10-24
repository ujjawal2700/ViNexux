import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

const product = { _id: '507f1f77bcf86cd799439011', name: 'Power Adapter', stockQuantity: 100, standardPrice: 100, images: [] };

for (const authenticated of [false, true]) {
  for (const mobile of [false, true]) {
    test(`${authenticated ? 'signed-in' : 'guest'} cart edits and saves quantities on ${mobile ? 'mobile' : 'desktop'}`, async ({ page }) => {
      if (mobile) await page.setViewportSize({ width: 390, height: 844 });
      await mockApi(page);
      await seedBrowserSession(page, authenticated ? 'account' : 'storefront');
      let cart = { items: [{ productId: product, quantity: 1, priceSnapshot: 100 }] };
      const updates = [];
      let failUpdate = false;
      if (authenticated) {
        await page.route('**/api/cart', route => route.fulfill({ json: { success: true, data: { cart } } }));
        await page.route(`**/api/cart/items/${product._id}`, route => {
          const { quantity } = route.request().postDataJSON();
          updates.push(quantity);
          if (failUpdate) return route.fulfill({ status: 400, json: { message: 'Quantity could not be saved' } });
          cart = { items: [{ ...cart.items[0], quantity }] };
          return route.fulfill({ json: { success: true, data: { cart } } });
        });
      } else {
        await page.addInitScript((items) => {
          if (!localStorage.getItem('vinexus_guest_cart')) localStorage.setItem('vinexus_guest_cart', JSON.stringify(items));
        }, cart.items);
      }
      await page.goto('/cart');
      const input = page.getByRole('spinbutton', { name: 'Quantity for Power Adapter' });
      await expect(input).toHaveValue('1');
      await input.fill('50');
      await input.press('Enter');
      await expect(input).toBeEnabled();
      await expect(input).toHaveValue('50');
      await expect(page.getByText('₹5,000', { exact: true }).filter({ visible: true }).first()).toBeVisible();
      if (authenticated) expect(updates).toEqual([50]);
      else await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vinexus_guest_cart'))[0].quantity)).toBe(50);
      await page.reload();
      await expect(input).toHaveValue('50');

      await input.fill('30');
      await input.blur();
      await expect(input).toBeEnabled();
      await expect(input).toHaveValue('30');
      for (const value of ['', '0', '-1', '1.5', '101']) {
        await input.fill(value);
        await input.press('Enter');
        await expect(input).toHaveValue('30');
      }
      await input.fill('20');
      await input.press('Escape');
      await expect(input).toHaveValue('30');
      if (authenticated) {
        expect(updates).toEqual([50, 30]);
        failUpdate = true;
        await input.fill('40');
        await input.press('Enter');
        await expect(page.getByText('Failed to update item quantity.', { exact: true })).toBeVisible();
        await expect(input).toHaveValue('30');
      }
    });
  }
}
