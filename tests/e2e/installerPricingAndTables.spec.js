import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011';
const dealer = { _id: id, companyName: 'SUNRISE OPTILINK & TELECOM SERVICES', organisationType: 'Installer', gstin: '08DBOPS7892L1ZD', pan: 'DBOPS7892L', city: 'Chittorgarh', state: 'Rajasthan', status: 'approved', userId: { _id: id, fullName: 'Ravi Sharma', email: 'long-dealer-contact@example.com', phone: '9876543210', accountStatus: 'active' }, kycVerifiedBy: { fullName: 'System Administrator', role: 'admin' }, kycVerifiedAt: new Date().toISOString() };
async function setup(page) {
  await mockApi(page); await seedBrowserSession(page, 'admin'); let percent = 0;
  await page.route('**/api/admin/dealer-accounts**', route => {
    if (new URL(route.request().url()).pathname.endsWith('/installer-pricing')) {
      if (route.request().method() === 'PUT') percent = route.request().postDataJSON().installerPriceIncreasePercent;
      return route.fulfill({ json: { success: true, data: { installerPriceIncreasePercent: percent } } });
    }
    return route.fulfill({ json: { success: true, data: { dealers: [dealer], pagination: { total: 1, totalPages: 1, page: 1 } } } });
  });
}
for (const width of [1440, 1280, 1024, 390]) test(`dealer text and every action fit without horizontal scrolling at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 }); await setup(page); await page.goto('/admin/dealer-accounts');
  await expect(page.getByRole('button', { name: 'Inspect', exact: true })).toBeVisible();
  const table = page.locator('.dealer-directory');
  expect(await table.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const name of ['Inspect', 'Edit', 'Delete', 'Revoke']) {
    const action = table.getByRole('button', { name, exact: true }); await expect(action).toBeVisible();
    expect(await action.evaluate(element => { const r = element.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath(`dealer-directory-${width}.png`), fullPage: false });
});
test('super admin saves a global installer rate and can assign Installer in account edit', async ({ page }, testInfo) => {
  await setup(page); let edit;
  await page.route(`**/api/admin/dealer-accounts/${id}`, route => { edit = route.request().postDataJSON(); return route.fulfill({ json: { success: true, data: { user: dealer.userId } } }); });
  await page.goto('/admin/dealer-accounts');
  const settings = page.getByRole('region', { name: 'Installer pricing settings' });
  await expect(settings).toHaveCount(0);
  const pricingButton = page.getByRole('button', { name: 'Installer Pricing', exact: true });
  const createButton = page.getByRole('button', { name: 'Create Dealer', exact: true });
  expect(Math.abs((await pricingButton.boundingBox()).y - (await createButton.boundingBox()).y)).toBeLessThan(5);
  await pricingButton.click();
  await expect(page.getByRole('dialog')).toContainText('Only super admins can change this setting.');
  await settings.getByLabel('Installer price increase (%)', { exact: true }).fill('10');
  await expect(settings).toContainText('₹110');
  await page.screenshot({ path: testInfo.outputPath('installer-pricing-popup.png'), fullPage: false });
  await settings.getByRole('button', { name: 'Save installer pricing' }).click();
  await expect(settings).toContainText('Installer pricing saved for all approved Installer dealers.');
  await page.reload(); await page.getByRole('button', { name: 'Installer Pricing', exact: true }).click();
  await expect(settings.getByLabel('Installer price increase (%)', { exact: true })).toHaveValue('10');
  await settings.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Organisation type', { exact: true })).toHaveValue('Installer');
  await dialog.getByRole('button', { name: 'Save Account', exact: true }).click();
  await expect(dialog).toHaveCount(0); expect(edit.organisationType).toBe('Installer'); expect(edit.role).toBeUndefined();
});
test('admin catalogue searches each product identifier with the same search field', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin'); const searches = [];
  await page.route('**/api/admin/products?**', route => {
    searches.push(new URL(route.request().url()).searchParams.get('search'));
    return route.fulfill({ json: { success: true, data: { products: [], pagination: { page: 1, total: 0, totalPages: 1 } } } });
  });
  await page.goto('/admin/products');
  const search = page.getByPlaceholder('Search by product name, SKU, model number or model name...');
  for (const value of ['Outdoor Camera', 'OEM-9553', 'HL-106', 'SOLAR TRIPLE CAMERA']) {
    await search.fill(value); await search.press('Enter');
    await expect.poll(() => searches.at(-1)).toBe(value);
  }
});

for (const kind of ['customers', 'verification']) for (const width of [1440, 1280, 1024, 390]) test(`${kind} uses the same directory layout without horizontal scrolling at ${width}px`, async ({ page }, testInfo) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.setViewportSize({ width, height: 1000 });
  const customer = { ...dealer.userId, createdAt: new Date().toISOString() };
  const base = kind === 'customers' ? '/admin/customers' : '/admin/dealers';
  await page.route(`**/api${base}**`, route => route.fulfill({ json: { success: true, data: { [kind === 'customers' ? 'customers' : 'dealers']: [kind === 'customers' ? customer : { ...dealer, status: 'pending' }], pagination: { total: 1, totalPages: 1, page: 1 } } } }));
  await page.goto(base);
  const table = page.locator(kind === 'customers' ? '.customer-directory' : '.dealer-directory');
  await expect(table).toBeVisible();
  expect(await table.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  for (const name of kind === 'customers' ? ['View', 'Edit', 'Delete', 'Block'] : ['Inspect', 'Approve', 'Reject']) {
    const button = table.getByRole('button', { name, exact: true }); await expect(button).toBeVisible();
    expect(await button.evaluate(element => { const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth; })).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath(`${kind}-${width}.png`), fullPage: false });
});
