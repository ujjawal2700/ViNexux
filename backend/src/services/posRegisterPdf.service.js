import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';
import { posBillLabel } from '../../../shared/posDocumentLabels.js';

const assets = fileURLToPath(new URL('../assets/pos/', import.meta.url));
const amount = value => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = value => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export async function generatePosRegisterPdf(sales, filters = {}) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28, bufferPages: true, info: { Title: 'VI NEXUS Sales Register', Author: 'VI NEXUS' } });
  doc.registerFont('regular', `${assets}LiberationSans-Regular.ttf`);
  doc.registerFont('bold', `${assets}LiberationSans-Bold.ttf`);
  const chunks = [];
  const result = new Promise((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
  });
  const widths = [122, 153, 30, 80, 80, 80, 80, 80, 80], left = 28, width = widths.reduce((sum, value) => sum + value, 0);
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
  const row = (cells, header = false, index = 0) => {
    let x = left;
    const rowHeight = Math.max(header ? 30 : 44, ...cells.map((cell, i) => doc.font(header ? 'bold' : 'regular').fontSize(8).heightOfString(String(cell), { width: widths[i] - 12, lineGap: 2 }) + 16));
    if (!header && y + rowHeight > bottom) { doc.addPage(); pageHeader(false); }
    doc.rect(left, y, width, rowHeight).fill(header ? '#26364A' : index % 2 ? '#F3F5F8' : '#FFFFFF');
    cells.forEach((cell, i) => {
      let size = 8;
      // Keep large monetary amounts on one line without clipping.
      if (!header && i >= 3 && i <= 7) {
        doc.font('regular').fontSize(size);
        while (doc.widthOfString(String(cell)) > widths[i] - 12 && size > 5) { size -= 0.25; doc.fontSize(size); }
      }
      text(cell, x + 6, y + 8, widths[i] - 12, { bold: header, size, color: header ? '#FFFFFF' : '#172033', align: i >= 2 && i <= 7 ? 'right' : 'left' });
      x += widths[i];
    });
    doc.moveTo(left, y + rowHeight).lineTo(left + width, y + rowHeight).strokeColor('#DCE1E9').lineWidth(0.5).stroke();
    y += rowHeight;
  };
  const summary = sales.reduce((totals, sale) => ({
    net: totals.net + (sale.status === 'voided' ? 0 : sale.total - (sale.returnedAmount || 0)),
    received: totals.received + Number(sale.paidAmount || 0),
    refunds: totals.refunds + Number(sale.refundDue || 0), due: totals.due + Number(sale.balanceDue || 0),
  }), { net: 0, received: 0, refunds: 0, due: 0 });
  function pageHeader(first) {
    text('VI NEXUS | Sales register', left, 25, width, { bold: true, size: 17 });
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
    row(['Bill / date (IST)', 'Customer / phone', 'Qty', 'Bill total', 'Net sales', 'Net received', 'Credit due', 'Refund due', 'Status'], true);
  }
  pageHeader(true);
  sales.forEach((sale, index) => row([
    `${sale.invoiceNumber}\n${posBillLabel(sale)}\n${date(sale.createdAt)}`,
    `${sale.customer?.name || '-'}\n${sale.customer?.phone || '-'}`,
    sale.totalQuantity ?? sale.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    amount(sale.total), amount(sale.status === 'voided' ? 0 : sale.total - (sale.returnedAmount || 0)),
    amount(sale.paidAmount), amount(sale.balanceDue), amount(sale.refundDue),
    `${sale.status === 'voided' ? 'Voided' : sale.paymentStatus === 'paid' ? 'Paid' : sale.paymentStatus === 'partial' ? 'Part paid' : 'Unpaid'}${sale.returnedAmount > 0 ? `\nReturned\n${amount(sale.returnedAmount)}` : ''}`,
  ], false, index));
  if (!sales.length) text('No sales match the selected filters.', left + 6, y + 18, width - 12, { size: 10 });
  const pages = doc.bufferedPageRange();
  const generatedAt = date(new Date());
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    text(`${sales.length} bills | Generated ${generatedAt} IST`, left, doc.page.height - 39, width - 100, { size: 7, color: '#475569' });
    text(`Page ${i + 1} of ${pages.count}`, left + width - 100, doc.page.height - 39, 100, { size: 7, align: 'right', color: '#475569' });
  }
  doc.end(); return result;
}
