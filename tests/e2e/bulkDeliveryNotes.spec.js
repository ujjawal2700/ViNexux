import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
import { posInvoiceFixture } from '../helpers/posFixture.js';

async function setup(page) {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const fixture = posInvoiceFixture(), owner = '507f1f77bcf86cd799439011';
  let notes = [1, 2, 3].map(index => ({ ...structuredClone(fixture), _id: `507f1f77bcf86cd79943908${index}`, documentType: 'delivery-note', customerId: index === 3 ? '507f1f77bcf86cd799439012' : owner, customer: { ...fixture.customer, name: index === 3 ? 'Other Customer' : 'Same Customer', phone: index === 3 ? '9876543211' : fixture.customer.phone }, invoiceNumber: `NOTE-${index}`, deliveryNoteNumber: `NOTE-${index}`, deliveryNoteDate: '2026-11-26', updatedAt: fixture.createdAt.toISOString(), deliveryNoteIds: [], refunds: [] }));
  let invoice, conversion, edit;
  await page.route('**/api/admin/pos/**', route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    const reply = data => route.fulfill({ json: { success: true, data } });
    if (path.endsWith('/settings')) return reply(fixture.seller);
    if (path.endsWith('/held') || path.endsWith('/products')) return reply([]);
    if (path.endsWith('/sales')) return reply({ sales: url.searchParams.get('documentType') === 'delivery-note' ? notes : invoice ? [invoice] : [], total: notes.length, pages: 1, summary: {} });
    if (path.endsWith('/delivery-notes/invoice')) {
      conversion = req.postDataJSON();
      expect(conversion.noteIds).toEqual(notes.slice(0, 2).map(note => note._id));
      invoice = { ...fixture, _id: '507f1f77bcf86cd799439099', documentType: 'invoice', invoiceNumber: 'COMBINED-001', customer: notes[0].customer, total: fixture.total * 2, totalQuantity: 4, deliveryNoteIds: conversion.noteIds };
      notes = notes.map(note => conversion.noteIds.includes(note._id) ? { ...note, invoiceId: invoice._id } : note);
      return reply(invoice);
    }
    const note = notes.find(note => path.endsWith(`/${note._id}`));
    if (note) {
      if (req.method() === 'PUT') { edit = req.postDataJSON(); Object.assign(note, edit, { updatedAt: new Date().toISOString() }); }
      return reply(note);
    }
    return reply(invoice || {});
  });
  await page.goto('/admin/pos');
  await page.getByRole('button', { name: 'Delivery notes', exact: true }).click();
  return { notes, conversion: () => conversion, edit: () => edit };
}

test('admin combines selected delivery notes for one customer and rejects another customer', async ({ page }) => {
  const state = await setup(page);
  await page.getByRole('checkbox', { name: 'Select NOTE-1', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Select NOTE-3', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('one customer');
  await expect(page.getByRole('checkbox', { name: 'Select NOTE-3', exact: true })).not.toBeChecked();
  await page.getByRole('checkbox', { name: 'Select NOTE-2', exact: true }).check();
  await page.getByRole('button', { name: 'Create Tax Invoice (2)', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Create combined Tax Invoice?', exact: true });
  await expect(confirmation).toContainText('Same Customer');
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(state.conversion()).toBeUndefined();
  await page.getByRole('button', { name: 'Create Tax Invoice (2)', exact: true }).click();
  await confirmation.getByRole('button', { name: 'Create bill', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'COMBINED-001', exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Sales register', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'COMBINED-001' })).toContainText('Same Customer');
});

test('admin edits delivery-note products and dates from the list', async ({ page }) => {
  const state = await setup(page);
  await page.getByRole('row').filter({ hasText: 'NOTE-1' }).getByRole('button', { name: 'Edit note', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit Delivery Note', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('spinbutton', { name: /^Quantity for/ }).fill('3');
  await dialog.getByLabel('Delivery note date', { exact: true }).fill('2026-11-27');
  await dialog.getByLabel('Payment due date (optional)', { exact: true }).fill('2026-12-10');
  await dialog.getByRole('button', { name: 'Save delivery note details', exact: true }).click();
  await expect.poll(() => state.edit()?.items[0].quantity).toBe(3);
  expect(state.edit()).toMatchObject({ dueDate: '2026-12-10', deliveryNoteDate: '2026-11-27' });
});
