import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

test('maintenance covers storefront routes with the custom message and keeps admin sign-in available', async ({ page }) => {
  await mockApi(page);
  let enabled = true;
  await page.route('**/api/content/website-settings', route => route.fulfill({ json: { success: true, data: { settings: {
    maintenanceEnabled: enabled, maintenanceMessage: 'Our catalogue is being updated. Back soon.',
  } } } }));
  for (const path of ['/', '/products', '/cart', '/login']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: "We're under maintenance" })).toBeVisible();
    await expect(page.getByText('Our catalogue is being updated. Back soon.')).toBeVisible();
    await expect(page.locator('.store-footer')).toHaveCount(0);
  }
  await expect(page.getByRole('link')).toHaveCount(0);
  await page.goto('/admin/login');
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole('heading', { name: "We're under maintenance" })).toHaveCount(0);
  enabled = false;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'All Products', exact: true })).toBeVisible();
});

test('super admin profile saves maintenance mode and message', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  let settings = { maintenanceEnabled: false, maintenanceMessage: 'We will be back soon.' };
  await page.route('**/api/admin/maintenance', route => {
    if (route.request().method() === 'PUT') settings = route.request().postDataJSON();
    return route.fulfill({ json: { success: true, data: settings } });
  });
  await page.goto('/admin/profile');
  await page.getByLabel('Enable maintenance mode').check();
  await page.getByLabel('Message shown to visitors').fill('Scheduled stock update.');
  await page.getByRole('button', { name: 'Save maintenance settings', exact: true }).click();
  await expect(page.getByText('Maintenance settings saved.', { exact: true })).toBeVisible();
  expect(settings).toEqual({ maintenanceEnabled: true, maintenanceMessage: 'Scheduled stock update.' });
  await page.reload();
  await expect(page.getByLabel('Enable maintenance mode')).toBeChecked();
});

test('support numbers use their selected dial or WhatsApp action and icon', async ({ page }) => {
  await mockApi(page);
  await page.route('**/api/content/footer-content', route => route.fulfill({ json: { success: true, data: { footer: {
    isActive: true, companyName: 'Vinexus', whatsappNumbers: [
      { number: '9876543210', label: 'Sales', type: 'call' },
      { number: '9876543211', label: 'Support', type: 'whatsapp' },
      { number: '9876543212', label: 'Legacy' },
    ],
  } } } }));
  await page.goto('/');
  const support = page.locator('.footer-support');
  const call = support.getByRole('link', { name: /Sales/ });
  await expect(call).toHaveAttribute('href', 'tel:9876543210');
  await expect(call.locator('svg.lucide-phone')).toHaveCount(1);
  await expect(call.getByRole('img', { name: 'WhatsApp contact' })).toHaveCount(0);
  await expect(support.getByRole('link', { name: /Support/ })).toHaveAttribute('href', 'https://wa.me/919876543211');
  await expect(support.getByRole('link', { name: /Legacy/ })).toHaveAttribute('href', 'https://wa.me/919876543212');
});

test('footer editor saves and reloads the selected support contact type', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  let footer = { companyName: 'Vinexus', companyDescription: 'IT products', isActive: true,
    phoneNumbers: [], emails: [], quickLinks: [], socialLinks: [], bankAccounts: [],
    whatsappNumbers: [{ number: '9876543210', label: 'WhatsApp', type: 'whatsapp' }] };
  await page.route('**/api/admin/cms/footer-content', route => {
    if (route.request().method() === 'PUT') footer = route.request().postDataJSON();
    return route.fulfill({ json: { success: true, data: { footer } } });
  });
  await page.goto('/admin/cms/footer-content');
  const type = page.getByRole('combobox', { name: 'Contact type for support number 1' });
  await type.selectOption('call');
  await expect(page.getByLabel('Call contact')).toBeVisible();
  await expect(page.getByRole('img', { name: 'WhatsApp contact' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Save Footer Settings' }).click();
  await expect.poll(() => footer.whatsappNumbers[0].type).toBe('call');
  await page.reload();
  await expect(type).toHaveValue('call');
  expect(footer.whatsappNumbers[0].label).toBe('Call');
  await expect(page.getByLabel('Call contact')).toBeVisible();
});
