import { expect, test } from '@jest/globals';
import ExcelJS from '../../backend/node_modules/exceljs/excel.js';
import { posInvoiceFixture } from '../helpers/posFixture.js';
import { returnReportRows } from '../../backend/src/services/posReturnReport.service.js';
import { generatePosExport } from '../../backend/src/services/posExport.service.js';

test('returns identify customer, GSTIN, model, quantity and linked versus unallocated refunds', async () => {
  const sale = posInvoiceFixture();
  sale.customer.gstin = '08ABCDE1234F1Z5';
  sale.returns = [{ requestId: 'return-1', creditNoteNumber: 'CN-001', createdAt: new Date(), amount: 3550, reason: 'Damaged camera', items: [{ productId: sale.items[0].productId, quantity: 1 }] }];
  sale.refunds = [{ requestId: 'return-1', creditNoteNumber: 'CN-001', method: 'upi', amount: 1000, reference: 'UPI-123', createdAt: new Date() }, { requestId: 'later-refund', method: 'bank', amount: 500, reference: 'BANK-456', createdAt: new Date() }];
  sale.refundDue = 2050;
  const [row] = returnReportRows(sale);
  expect(row).toMatchObject({ customerName: sale.customer.name, phone: sale.customer.phone, gstin: sale.customer.gstin, invoiceRefunded: 1500, refundDue: 2050, refundStatus: 'Refund pending on invoice' });
  expect(row.items).toContain('Qty: 1'); expect(row.items).toContain(sale.items[0].modelNumber);
  expect(row.linkedRefunds).toContain('UPI-123'); expect(row.linkedRefunds).not.toContain('BANK-456');
  expect(row.otherRefunds).toContain('Bank transfer'); expect(row.otherRefunds).toContain('BANK-456');
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await generatePosExport([sale]));
  const returns = workbook.getWorksheet('Returns');
  const values = Object.fromEntries(returns.getRow(1).values.slice(1).map((header, index) => [header, returns.getRow(2).getCell(index + 1).value]));
  expect(values['Customer GSTIN']).toBe(sale.customer.gstin);
  expect(values['Refunds linked to this return']).toContain('UPI-123');
  expect(values['Invoice refund still due']).toBe(2050);
  const headers = workbook.getWorksheet('Offline sales').getRow(1).values;
  for (const header of ['Taxable value', 'CGST', 'SGST', 'IGST']) expect(headers).toContain(header);
});
