import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

test('footer follows the requested order and copies every bank account', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await mockApi(page);
  await seedBrowserSession(page, 'public');
  const bank = { accountName: 'VI NEXUS', accountNumber: '50200121980367', ifscCode: 'HDFC0000167', bankName: 'HDFC', branch: 'KOTA-RAJASTHAN', accountType: 'Current Account', upiId: '8003923316@hdfc' };
  await page.route('**/api/content/footer-content', route => route.fulfill({ json: { success: true, data: { footer: {
    isActive: true, companyName: 'ViNexus', contactHeading: 'Contact Us', address: 'Kota',
    bankAccounts: [bank, { accountName: 'Second account', upiId: 'second@hdfc' }],
    whatsappNumber: '8003923316',
  } } } }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const footer = page.locator('.store-footer');
  await expect(footer.locator('h4')).toHaveText(['Contact Us', 'About', 'Information', 'Bank Details', 'Sales & Support']);
  await footer.getByRole('button', { name: 'Copy all bank details' }).click();
  await expect(page.getByRole('alert')).toHaveText('Bank details successfully copied.');
  await expect(footer.getByText('Bank details successfully copied.')).toHaveCount(0);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'Name: VI NEXUS\nA/c Number: 50200121980367\nIFSC: HDFC0000167\nBank: HDFC\nBranch: KOTA-RAJASTHAN\nType: Current Account\nUPI ID: 8003923316@hdfc\n\nName: Second account\nUPI ID: second@hdfc'
  );
  const columns = await footer.locator('.store-footer-grid > div').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().x));
  expect(columns.every((x, i) => i === 0 || x > columns[i - 1])).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
