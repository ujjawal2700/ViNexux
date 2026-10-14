import { campaignInput } from '../../backend/src/validators/campaign.validator.js';
import { campaignValidationDetails } from '../../shared/campaignValidation.js';
import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
import { renderEmailDesign } from '../../shared/campaignDesign.js';
const id = '507f1f77bcf86cd799439090';
const providers = { email: { ready: true, mode: 'simulation' }, push: { ready: true, mode: 'simulation' }, siteReady: true };
async function campaignApi(page, readOnly = false) {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.route('**/api/admin/access/self', route => route.fulfill({ json: { success: true, data: { access: readOnly ? { role: 'admin', isEmployee: true, accessRoleActive: true, permissions: { campaigns: { read: true, write: false } } } : { role: 'admin', isEmployee: false } } } }));
  let campaign = null, queued = 0, tests = 0;
  await page.route('**/api/admin/campaigns**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname.replace('/api/admin/campaigns', ''); let data;
    if (path === '/configuration') data = providers;
    else if (path === '/recipients') data = { recipients: [] };
    else if (!path) {
      if (req.method() === 'POST') campaign = { ...req.postDataJSON(), _id: id, status: 'draft', revision: 0, createdAt: new Date().toISOString(), totalRecipients: 0 };
      data = req.method() === 'POST' ? { campaign } : { campaigns: campaign ? [campaign] : [], page: 1, pages: 1 };
    } else if (path.endsWith('/preview')) data = { html: renderEmailDesign(campaign.email, { fullName: 'Preview reader' }) };
    else if (path.endsWith('/review')) data = { count: 12, fingerprint: 'a'.repeat(64), revision: campaign.revision, providers };
    else if (path.endsWith('/queue')) { queued++; expect(req.postDataJSON().fingerprint).toBe('a'.repeat(64)); campaign.status = 'queued'; campaign.totalRecipients = 12; data = { queued: 12, mode: 'simulation' }; }
    else if (path.endsWith('/test')) { tests++; data = { result: { status: 'simulated' } }; }
    else if (req.method() === 'PUT') { const body = req.postDataJSON(); campaign = { ...campaign, ...body, revision: body.revision + 1 }; data = { campaign }; }
    else data = { campaign, stats: { pending: queued ? 12 : 0 }, deliveries: [], page: 1, pages: 1 };
    await route.fulfill({ json: { success: true, data } });
  });
  return { queued: () => queued, tests: () => tests, campaign: () => campaign };
}
test('admin builds an email, previews, tests and explicitly reviews before queueing', async ({ page }, testInfo) => {
  const api = await campaignApi(page);
  await page.goto('/admin/campaigns');
  await page.getByRole('button', { name: 'New campaign' }).click();
  await page.getByLabel('Campaign name (internal)').fill('Weekend collection');
  await page.getByLabel('Subject', { exact: true }).fill('New arrivals, {{name}}');
  await page.getByLabel('Destination URL').fill('https://example.test/products');
  await page.getByRole('button', { name: 'image', exact: true }).click();
  await page.getByLabel(/^Image URL/).fill('https://example.test/launch.webp');
  await page.getByLabel('Alternative text').fill('New collection');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved');
  expect(api.campaign().email.blocks).toHaveLength(4);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.frameLocator('iframe[title="Email preview"]').getByText('Unsubscribe from promotional emails')).toBeVisible();
  await page.getByRole('button', { name: 'Send myself a test' }).click();
  await expect(page.getByRole('dialog')).toContainText('your admin email');
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Test simulated'); expect(api.tests()).toBe(1); expect(api.queued()).toBe(0);
  await page.getByRole('button', { name: 'Review & send' }).click();
  await expect(page.getByRole('dialog')).toContainText('12 subscribers');
  expect(api.queued()).toBe(0);
  await page.getByRole('button', { name: 'Queue simulation' }).click();
  await expect(page.getByRole('status')).toContainText('Campaign queued'); expect(api.queued()).toBe(1);
  await page.locator('main').screenshot({ path: testInfo.outputPath('campaign-email-desktop.png') });
});
test('admin composes a Firebase notification with imagery and actions on mobile', async ({ page }, testInfo) => {
  const api = await campaignApi(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/admin/campaigns');
  await page.getByRole('button', { name: 'New campaign' }).click(); await page.getByRole('button', { name: 'Firebase push', exact: true }).click();
  await page.getByLabel('Campaign name (internal)').fill('Product launch push'); await page.getByLabel(/^Notification title/).fill('A new arrival, {{name}}'); await page.getByLabel(/^Message ·/).fill('Explore the collection today.');
  await page.getByLabel('Open this URL on click').fill('https://example.test/products'); await page.getByRole('button', { name: 'Add action' }).click();
  await page.getByLabel('Action 1 label').fill('Browse'); await page.getByLabel('Action URL', { exact: true }).fill('https://example.test/products');
  await page.getByRole('button', { name: 'Save draft' }).click(); await expect(page.getByRole('status')).toContainText('Draft saved'); expect(api.campaign().channel).toBe('push'); expect(api.campaign().push.actions[0].label).toBe('Browse');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('.campaign-push-preview').screenshot({ path: testInfo.outputPath('campaign-push-mobile.png') });
});
test('read-only campaign employees cannot create or send campaigns', async ({ page }) => {
  await campaignApi(page, true); await page.goto('/admin/campaigns');
  await expect(page.getByRole('button', { name: 'New campaign' })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Email & Push Campaigns' })).toBeVisible();
  await expect(page.getByText('Website & Content', { exact: true })).toHaveCount(0);
});
test('customers save channel preferences and unsubscribe without signing in', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account'); let preferences = { email: false, push: false }, unsubscribed = false;
  await page.route('**/api/communications/**', async route => { const req = route.request(); const path = new URL(req.url()).pathname; if (path.endsWith('/preferences') && req.method() === 'PUT') preferences = req.postDataJSON(); if (path.endsWith('/unsubscribe') && req.method() === 'POST') unsubscribed = true; await route.fulfill({ json: { success: true, data: path.endsWith('/preferences') ? { preferences } : { subscribed: !unsubscribed } } }); });
  await page.goto('/account/notifications'); await page.getByLabel('Promotional emails').check(); await page.getByRole('button', { name: 'Save preferences' }).click(); await expect(page.getByRole('status')).toContainText('saved'); expect(preferences).toEqual({ email: true, push: false });
  await page.goto('/email-preferences?token=test-link'); await page.getByRole('button', { name: 'Unsubscribe', exact: true }).click(); await expect(page.getByRole('status')).toContainText('unsubscribed'); expect(unsubscribed).toBe(true);
});


test('push validation highlights exact fields, opens hidden options and accepts pasted web links', async ({ page }) => {
  const api = await campaignApi(page);
  await page.route('**/api/admin/campaigns', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    const result = campaignInput.safeParse(route.request().postDataJSON());
    if (result.success) return route.fallback();
    const details = campaignValidationDetails(result.error.issues);
    await route.fulfill({ status: 400, json: { success: false, message: 'Please check the highlighted fields.', error: { code: 'CAMPAIGN_VALIDATION_ERROR', details }, details } });
  });
  await page.goto('/admin/campaigns');
  await page.getByRole('button', { name: 'New campaign' }).click();
  await page.getByRole('button', { name: 'Firebase push', exact: true }).click();
  await page.getByLabel(/^Notification title/).fill('Product launch');
  await page.getByLabel(/^Message ·/).fill('Browse our latest collection.');
  await page.getByText('Icons & delivery options', { exact: true }).click();
  await page.getByLabel('Notification icon', { exact: true }).fill('not a link');
  await page.getByText('Icons & delivery options', { exact: true }).click();
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.getByLabel('Action 1 label').fill('Browse');
  await page.getByLabel('Action URL', { exact: true }).fill('not a link');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('alert')).toContainText('Campaign name: Enter a campaign name');
  await expect(page.getByRole('alert')).toContainText('Action 1 URL: Enter a valid web link');
  await expect(page.getByLabel('Campaign name (internal)', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Campaign name (internal)', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Action URL', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: /^Notification icon: Enter a valid web link/ }).click();
  await expect(page.getByLabel('Notification icon', { exact: true })).toBeFocused();
  await page.getByLabel('Notification icon', { exact: true }).fill('example.com/icon.png');
  await page.getByLabel('Campaign name (internal)', { exact: true }).fill('Product launch campaign');
  await page.getByLabel('Action URL', { exact: true }).fill('another-store.example/products?offer=weekend');
  await page.getByLabel('Open this URL on click', { exact: true }).fill('example.com/products');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(api.campaign().push.link).toBe('https://example.com/products');
  expect(api.campaign().push.actions[0].url).toBe('https://another-store.example/products?offer=weekend');
});
