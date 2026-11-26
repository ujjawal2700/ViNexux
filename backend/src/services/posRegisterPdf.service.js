import { returnReportRows } from './posReturnReport.service.js';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';
import { posBillLabel } from '../../../shared/posDocumentLabels.js';

const assets = fileURLToPath(new URL('../assets/pos/', import.meta.url));
const amount = value => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = value => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export async function generatePosRegisterPdf(sales, filters = {}) {
  const doc = new PDFDocument({ size: 'A3', layout: 'landscape', margin: 28, bufferPages: true, info: { Title: 'VI NEXUS Sales Register', Author: 'VI NEXUS' } });
  doc.registerFont('regular', `${assets}LiberationSans-Regular.ttf`);
  doc.registerFont('bold', `${assets}LiberationSans-Bold.ttf`);
  const chunks = [];
  const result = new Promise((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
  });
  const left = 28, width = doc.page.width - 56;
  let widths = [116, 132, 30, 75, 62, 62, 62, 75, 75, 75, 75, 75, 88];
  const fitColumns = values => values.map(value => value * width / values.reduce((sum, cell) => sum + cell, 0));
  widths = fitColumns(widths);
  let reportTitle = 'Sales register';
  let headers = ['Invoice / date (IST)', 'Customer / phone / GSTIN', 'Qty', 'Taxable value', 'CGST', 'SGST', 'IGST', 'Invoice total', 'Net sales', 'Net received', 'Credit due', 'Refund due', 'Status'];
  const bottom = doc.page.height - 48;
  const filterText = [
    `Dates (IST): ${filters.from || 'Any'} to ${filters.to || 'Any'}`,
    `Status: ${filters.status === 'voided' ? 'Voided' : filters.status === 'completed' ? 'Completed' : 'All sales'}`,
    ...(filters.paymentStatus && filters.paymentStatus !== 'all' ? [`Payment: ${filters.paymentStatus}`] : []),
    ...(filters.search ? [`Search: ${filters.search}`] : []),
  ].join('   |   ');
  let y;
  const text = (value, x, top, cellWidth, { bold = false, size = 8, color = '#172033', align = 'left' } = {}) => {
    doc.font(bold ? 'bold' : 'regular').fontSize(size).fillColor(color).text(String(value), x, top, { width: cellWidth, align, lineGap: 2 });
  };
  const wrappedLines = (value, cellWidth, bold) => {
    doc.font(bold ? 'bold' : 'regular').fontSize(8);
    return String(value).split('\n').flatMap(paragraph => {
      const lines = []; let line = '';
      for (const word of paragraph.split(/\s+/)) {
        if (line && doc.widthOfString(`${line} ${word}`) > cellWidth) { lines.push(line); line = ''; }
        for (const letter of word) {
          if (line && doc.widthOfString(line + letter) > cellWidth) { lines.push(line); line = ''; }
          line += letter;
        }
        line += ' ';
      }
      lines.push(line.trimEnd()); return lines;
    });
  };
  const row = (cells, header = false, index = 0) => {
    const lines = cells.map((cell, i) => wrappedLines(cell, widths[i] - 12, header));
    const length = Math.max(...lines.map(cell => cell.length));
    let offset = 0;
    while (offset < length) {
      if (!header && y + 40 > bottom) { doc.addPage(); pageHeader(false); }
      const count = header ? length : Math.min(length - offset, Math.max(1, Math.floor((bottom - y - 16) / 12)));
      const rowHeight = Math.max(header ? 30 : 40, count * 12 + 16);
      doc.rect(left, y, width, rowHeight).fill(header ? '#26364A' : index % 2 ? '#F3F5F8' : '#FFFFFF');
      let x = left;
      lines.forEach((cell, i) => {
        cell.slice(offset, offset + count).forEach((line, n) => text(line, x + 6, y + 8 + n * 12, widths[i] - 12, { bold: header, color: header ? '#FFFFFF' : '#172033', align: reportTitle === 'Sales register' && i >= 2 && i <= 11 ? 'right' : 'left' }));
        x += widths[i];
      });
      doc.moveTo(left, y + rowHeight).lineTo(left + width, y + rowHeight).strokeColor('#DCE1E9').lineWidth(0.5).stroke();
      y += rowHeight; offset += count;
      if (offset < length) { doc.addPage(); pageHeader(false); }
    }
  };
  const summary = sales.reduce((totals, sale) => ({
    net: totals.net + (sale.status === 'voided' ? 0 : sale.total - (sale.returnedAmount || 0)),
    received: totals.received + Number(sale.paidAmount || 0),
    refunds: totals.refunds + Number(sale.refundDue || 0), due: totals.due + Number(sale.balanceDue || 0),
  }), { net: 0, received: 0, refunds: 0, due: 0 });
  function pageHeader(first) {
    text(`VI NEXUS | ${reportTitle}`, left, 25, width, { bold: true, size: 17 });
    text('Amounts in INR. Bill dates and times are shown in IST.', left, 50, width, { size: 8, color: '#475569' });
    text(filterText, left, 66, width, { size: 8, color: '#475569' });
    y = 76 + doc.font('regular').fontSize(8).heightOfString(filterText, { width, lineGap: 2 });
    if (first) {
      const labels = [['Net sales', summary.net], ['Net received', summary.received], ['Credit due', summary.due], ['Refunds due', summary.refunds]];
      labels.forEach(([label, value], i) => {
        const x = left + i * width / 4;
        text(label, x + 6, y + 5, width / 4 - 12, { size: 8, color: '#475569' });
        text(amount(value), x + 6, y + 20, width / 4 - 12, { size: 13, bold: true });
      });
      y += 49;
    }
    row(headers, true);
  }
  pageHeader(true);
  sales.forEach((sale, index) => row([
    `${sale.invoiceNumber}\n${posBillLabel(sale)}\n${date(sale.createdAt)}`,
    `${sale.customer?.name || '-'}\n${sale.customer?.phone || '-'}\nGSTIN: ${sale.customer?.gstin || '-'}`,
    sale.totalQuantity ?? sale.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    amount(sale.subtotal), amount(sale.cgst), amount(sale.sgst), amount(sale.igst),
    amount(sale.total), amount(sale.status === 'voided' ? 0 : sale.total - (sale.returnedAmount || 0)),
    amount(sale.paidAmount), amount(sale.balanceDue), amount(sale.refundDue),
    `${sale.status === 'voided' ? 'Voided' : sale.paymentStatus === 'paid' ? 'Paid' : sale.paymentStatus === 'partial' ? 'Part paid' : 'Unpaid'}${sale.returnedAmount > 0 ? `\nReturned\n${amount(sale.returnedAmount)}` : ''}`,
  ], false, index));
  if (!sales.length) text('No sales match the selected filters.', left + 6, y + 18, width - 12, { size: 10 });
  const returnRows = sales.flatMap(returnReportRows);
  if (returnRows.length) {
    reportTitle = 'Returns and refund details';
    headers = ['Invoice / credit note / date', 'Customer / phone / GSTIN', 'Returned products', 'Credit / reason', 'Refunds linked to return', 'Other invoice refunds (unallocated)', 'Invoice refund status'];
    widths = fitColumns([140, 150, 250, 120, 160, 160, 135]);
    doc.addPage(); pageHeader(false);
    returnRows.forEach((entry, index) => row([
      `${entry.invoiceNumber}\n${entry.creditNoteNumber}\n${date(entry.createdAt)}`,
      `${entry.customerName}\n${entry.phone}\nGSTIN: ${entry.gstin || '-'}`,
      entry.items, `${amount(entry.amount)}\n${entry.reason}`, entry.linkedRefunds, entry.otherRefunds,
      `${entry.refundStatus}\nRefunded: ${amount(entry.invoiceRefunded)}\nStill due: ${amount(entry.refundDue)}`,
    ], false, index));
  }
  const pages = doc.bufferedPageRange();
  const generatedAt = date(new Date());
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    text(`${sales.length} bills | Generated ${generatedAt} IST`, left, doc.page.height - 39, width - 100, { size: 7, color: '#475569' });
    text(`Page ${i + 1} of ${pages.count}`, left + width - 100, doc.page.height - 39, 100, { size: 7, align: 'right', color: '#475569' });
  }
  doc.end(); return result;
}
