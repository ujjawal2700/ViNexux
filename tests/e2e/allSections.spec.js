import { expect, test } from '@playwright/test';
import { frontendRouteCases } from '../helpers/frontendRouteInventory.js';
import { mockApi, seedBrowserSession } from './mockApi.js';

for (const routeCase of frontendRouteCases()) {
  test(`${routeCase.section}: ${routeCase.pattern}`, async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await mockApi(page);
    await seedBrowserSession(page, routeCase.section);

    const response = await page.goto(routeCase.path, { waitUntil: 'domcontentloaded' });
    expect(response?.status() || 200).toBeLessThan(400);
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('#root')).not.toContainText('Something went wrong');
    await expect.poll(async () => (await page.locator('#root').innerText()).trim().length).toBeGreaterThan(0);
    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  });
}

test('customer login suggests the previously used mobile number', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    localStorage.setItem('vinexus_storage_choices_v1', JSON.stringify({ preferences: false }));
    localStorage.setItem('vinexus_last_customer_phone', '9876543210');
  });
  await page.goto('/login');
  await expect(page.getByPlaceholder('Email ID Or 9876543210')).toHaveValue('9876543210');
  await expect(page.getByText('Your previously used mobile number has been filled in.')).toBeVisible();
});

test('dealer registration exposes compliance, contact, location, and one legal acceptance', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => localStorage.setItem('vinexus_storage_choices_v1', JSON.stringify({ preferences: false })));
  await page.goto('/register?role=dealer');

  await expect(page.getByText(/^ORGANISATION TYPE \*$/)).toBeVisible();
  await expect(page.getByText(/^MSME \/ UDYAM NUMBER \*$/)).toBeVisible();
  await expect(page.getByText(/^PAN NUMBER \*$/)).toBeVisible();
  await expect(page.getByText(/^WHATSAPP NUMBER \*$/)).toBeVisible();
  await expect(page.getByText(/MSME Certificate \(Optional\)/)).toBeVisible();
  await expect(page.getByText(/Location of Your Office/i)).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await expect(page.getByText(/I accept the Terms & Conditions and Privacy Policy/i)).toBeVisible();
});
