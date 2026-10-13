import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';
import { amountInWords, money } from '../../../shared/posBilling.js';

const assets = fileURLToPath(new URL('../assets/pos/', import.meta.url));
const format = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = value => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'Asia/Kolkata' }).replaceAll(' ', '-');

// Recreates the supplied boxed A4 invoice. Overflow uses continuation pages
// with repeated item headers; the totals / declarations remain on the last page.
export async function generatePosInvoice(sale) {
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true, info: { Title: `Tax Invoice ${sale.invoiceNumber}`, Author: sale.seller.name } });
  doc.registerFont('regular', `${assets}LiberationSans-Regular.ttf`);
  doc.registerFont('bold', `${assets}LiberationSans-Bold.ttf`);
  const chunks = [];
  const completed = new Promise((resolve, reject) => { doc.on('data', c => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  const left = 30, right = 565, width = right - left;
  const text = (value, x, y, w, size = 8, bold = false, align = 'left') => {
    doc.font(bold ? 'bold' : 'regular').fontSize(size).fillColor('black').text(String(value ?? ''), x, y, { width: w, align, lineGap: 0.6 });
  };
  const height = (value, w, size = 8, bold = false) => doc.font(bold ? 'bold' : 'regular').fontSize(size).heightOfString(String(value || ''), { width: w, lineGap: 0.6 });
  const line = (x1, y1, x2, y2) => doc.lineWidth(0.4).strokeColor('black').moveTo(x1, y1).lineTo(x2, y2).stroke();
  const box = (x, y, w, h) => doc.lineWidth(0.4).rect(x, y, w, h).stroke();
  const seller = sale.seller;
  const metaRows = [
    ['Invoice No.', sale.invoiceNumber, 'Dated', date(sale.createdAt)],
    ['Delivery Note', sale.delivery?.deliveryNote, 'Mode/Terms of Payment', sale.delivery?.paymentTerms || sale.payments.map(p => p.method.toUpperCase()).join(' / ') || 'Credit'],
    ['Reference No. & Date.', sale.delivery?.reference, 'Other References', sale.delivery?.otherReferences],
    ['Dispatch Doc No.', sale.delivery?.dispatchDoc, 'Delivery Note Date', sale.delivery?.deliveryNoteDate],
    ['Dispatched through', sale.delivery?.dispatchedThrough, 'Destination', sale.delivery?.destination],
    ['Vessel/Flight No.', sale.delivery?.vesselFlight, 'Place of receipt by shipper:', sale.delivery?.receiptPlace],
    ['City/Port of Loading', sale.delivery?.loadingPort, 'City/Port of Discharge', sale.delivery?.dischargePort],
  ];
  const customerLines = (person, buyer) => [person.name, [person.address, person.city, person.pincode].filter(Boolean).join(', '),
    `GSTIN/UIN : ${person.gstin || '-'}`, `State Name : ${person.state}, Code : ${person.stateCode}`,
    ...(buyer ? [`Place of Supply : ${sale.customer.state}`] : []), `Contact : ${person.phone}`];
  const personHeight = (person, buyer) => 13 + customerLines(person, buyer).reduce((sum, value) => sum + height(value, 303, 8.3), 0) + 8;
  const drawPerson = (person, buyer, y) => {
    text(buyer ? 'Buyer (Bill to)' : 'Consignee (Ship to)', left + 3, y + 2, 307, 8.5);
    let cursor = y + 15;
    customerLines(person, buyer).forEach((value, i) => { text(value, left + 3, cursor, 303, 8.3, i === 0); cursor += height(value, 303, 8.3, i === 0); });
  };
  const sellerLines = [seller.name, seller.address, `GSTIN/UIN: ${seller.gstin}`, `State Name : ${seller.state}, Code : ${seller.stateCode}`, `E-Mail : ${seller.email}`];
  const sellerHeight = Math.max(62, sellerLines.reduce((sum, value) => sum + height(value, 247, 8.4), 0) + 6);
  const shipHeight = personHeight(sale.shipping || sale.customer, false);
  const buyerHeight = personHeight(sale.customer, true);
  const metadataHeights = metaRows.map(([l1, v1, l2, v2]) => Math.max(21, 4 + height(l1, 103) + height(v1, 103, 8, true), 4 + height(l2, 103) + height(v2, 103, 8, true)));
  const termsHeight = 15 + height(sale.delivery?.terms, 209);
  const topHeight = Math.max(212, sellerHeight + shipHeight + buyerHeight, metadataHeights.reduce((a, b) => a + b, 0) + termsHeight);
  const columns = [30, 43, 319, 364, 409, 453, 473, 502, 565];
  let tableStart, cursor, pageNumber = 1;
  const tableHeader = y => {
    box(left, y, width, 19);
    for (const x of columns.slice(1, -1)) line(x, y, x, y + 19);
    ['Sl\nNo.', 'Description of Goods', 'HSN/SAC', 'Quantity', 'Rate', 'per', 'Disc. %', 'Amount'].forEach((label, i) => text(label, columns[i] + 1, y + 2, columns[i + 1] - columns[i] - 2, i === 0 ? 5.5 : 7.1, false, 'center'));
    tableStart = y + 19; cursor = tableStart + 5;
  };
  const closeTable = bottom => {
    line(left, tableStart, left, bottom); line(right, tableStart, right, bottom);
    for (const x of columns.slice(1, -1)) line(x, tableStart, x, bottom);
    line(left, bottom, right, bottom);
  };
  const footer = () => {
    text(`SUBJECT TO ${seller.jurisdiction.toUpperCase()} JURISDICTION`, left, 804, width, 7.5, false, 'center');
    text('This is a Computer Generated Invoice', left, 816, width, 7.5, false, 'center');
  };
  const continuation = () => {
    closeTable(784); text('Continued on next page', 380, 788, 185, 7, false, 'right'); footer();
    doc.addPage(); pageNumber++;
    text(`${seller.name} - Tax Invoice ${sale.invoiceNumber} (continued)`, left, 30, width, 10, true);
    tableHeader(50);
  };
  text(sale.status === 'voided' ? 'Tax Invoice - VOID' : 'Tax Invoice', left, 30, width, 10, true, 'center');
  const top = 43, split = 349;
  box(left, top, width, topHeight); line(split, top, split, top + topHeight);
  doc.image(`${assets}invoice-logo.jpg`, left + 2, top + 7, { fit: [56, 49] });
  let sy = top + 3;
  sellerLines.forEach((value, i) => { text(value, left + 67, sy, 247, 8.4, i === 0); sy += height(value, 247, 8.4, i === 0); });
  line(left, top + sellerHeight, split, top + sellerHeight);
  drawPerson(sale.shipping || sale.customer, false, top + sellerHeight);
  line(left, top + sellerHeight + shipHeight, split, top + sellerHeight + shipHeight);
  drawPerson(sale.customer, true, top + sellerHeight + shipHeight);
  let my = top;
  metaRows.forEach(([label1, value1, label2, value2], i) => {
    const h = metadataHeights[i];
    line(457, my, 457, my + h);
    text(label1, split + 3, my + 2, 102); text(value1, split + 3, my + 2 + height(label1, 102), 102, 8, true);
    text(label2, 460, my + 2, 102); text(value2, 460, my + 2 + height(label2, 102), 102, 8, true);
    my += h; line(split, my, right, my);
  });
  text('Terms of Delivery', split + 3, my + 2, 209); text(sale.delivery?.terms, split + 3, my + 14, 209);
  tableHeader(top + topHeight);
  sale.items.forEach((item, i) => {
    const rowHeight = Math.max(16, height(item.productName, 270, 8.3, true) + 4);
    if (cursor + rowHeight > 752) continuation();
    text(i + 1, columns[0] + 1, cursor, 11, 8, false, 'right');
    text(item.productName, columns[1] + 3, cursor, 270, 8.3, true);
    text(item.hsn, columns[2] + 2, cursor, 41, 7.5, false, 'center');
    text(`${item.quantity} ${item.unit}`, columns[3] + 2, cursor, 41, 8, true, 'right');
    text(format(item.taxableUnitRate), columns[4] + 2, cursor, 40, 7.5, false, 'right');
    text(item.unit, columns[5] + 1, cursor, 18, 7, false, 'center');
    text(item.discountPercent ? item.discountPercent : '', columns[6] + 1, cursor, 27, 7.5, false, 'right');
    text(format(item.taxable), columns[7] + 2, cursor, 59, 8, true, 'right');
    cursor += rowHeight;
    for (const serial of item.serialNumbers) {
      const serialHeight = height(serial, 260, 8) + 1;
      if (cursor + serialHeight > 752) {
        continuation();
        text(`${item.productName} (serial numbers continued)`, columns[1] + 3, cursor, 270, 8.3, true);
        cursor += height(`${item.productName} (serial numbers continued)`, 270, 8.3, true) + 4;
      }
      text(serial, columns[1] + 9, cursor, 260, 8);
      cursor += serialHeight;
    }
    cursor += 6;
  });
  const taxRows = sale.interstate ? [['IGST', sale.igst]] : [['CGST', sale.cgst], ['SGST', sale.sgst]];
  taxRows.push(['Round Off', sale.roundOffAmount]);
  const needsAnnexure = sale.taxGroups.length > 30;
  const summaryGroups = needsAnnexure ? [{ hsn: 'See HSN annexure', gstRate: null, taxable: sale.subtotal, cgst: sale.cgst, sgst: sale.sgst, igst: sale.igst }] : sale.taxGroups;
  const groupCount = summaryGroups.length;
  const declarationHeight = seller.declarations.reduce((sum, value, i) => sum + height(`${i + 1}. ${value}`, 278, 7), 0);
  const bankLines = [`A/c Holder's Name : ${seller.accountHolder}`, `Bank Name : ${seller.bankName}`, `A/c No. : ${seller.accountNumber}`, `Branch & IFS Code : ${seller.branch} & ${seller.ifsc}`];
  const detailsHeight = Math.max(45, declarationHeight + 12, 12 + bankLines.reduce((sum, value, i) => sum + height(value, 248, 7, i > 0), 0));
  const wordsHeight = Math.max(24, height(amountInWords(sale.total), width - 6, 8.5, true) + 14);
  const taxWordsHeight = Math.max(12, height(`Tax Amount (in words) : ${amountInWords(sale.taxTotal)}`, width - 6, 8) + 4);
  const bottomHeight = wordsHeight + 19 + (groupCount + 1) * 10 + taxWordsHeight + detailsHeight + 35;
  if (cursor + taxRows.length * 12 + 14 + bottomHeight > 795) continuation();
  taxRows.forEach(([label, value]) => { text(label, 200, cursor + 2, 116, 8.5, true, 'right'); text(format(value), 505, cursor + 2, 57, 8.5, true, 'right'); cursor += 12; });
  const totalY = Math.max(cursor + 8, 795 - bottomHeight - 14);
  closeTable(totalY);
  for (const x of columns) line(x, totalY, x, totalY + 14);
  line(left, totalY + 14, right, totalY + 14);
  text('Total', 200, totalY + 2, 116, 8, false, 'right');
  const units = new Set(sale.items.map(item => item.unit));
  text(`${sale.totalQuantity} ${units.size === 1 ? sale.items[0].unit : 'Units'}`, 366, totalY + 2, 41, 8, true, 'right');
  // A small vector rupee mark avoids a missing glyph in the reference font.
  const rx = 507, ry = totalY + 3;
  line(rx, ry, rx + 5, ry); line(rx, ry + 1.7, rx + 5, ry + 1.7);
  doc.moveTo(rx + 2, ry).bezierCurveTo(rx + 6, ry + 1, rx + 5, ry + 4, rx, ry + 4).lineTo(rx + 5, ry + 8).stroke();
  text(format(sale.total), 515, totalY + 1, 48, 9, true, 'right');
  let y = totalY + 14;
  box(left, y, width, wordsHeight);
  text('Amount Chargeable (in words)', left + 3, y + 2, 300, 7.5); text('E. & O.E', right - 70, y + 2, 67, 7.5, false, 'right');
  text(amountInWords(sale.total), left + 3, y + 13, width - 6, 8.5, true); y += wordsHeight;
  const taxCols = sale.interstate ? [30, 309, 359, 405, 461, 565] : [30, 309, 359, 388, 437, 466, 515, 565];
  const taxHeaderHeight = 19, taxTableHeight = taxHeaderHeight + (groupCount + 1) * 10;
  box(left, y, width, taxTableHeight);
  taxCols.slice(1, -1).forEach(x => line(x, y + (!sale.interstate && [388, 466].includes(x) ? 9 : 0), x, y + taxTableHeight));
  text('HSN/SAC', 32, y + 2, 275, 7.5, false, 'center'); text('Taxable\nValue', 311, y + 2, 46, 7.5, false, 'center');
  if (sale.interstate) { text('IGST Rate', 361, y + 2, 42, 7.5, false, 'center'); text('IGST\nAmount', 407, y + 2, 52, 7.5, false, 'center'); }
  else {
    text('CGST', 361, y + 2, 74, 7.5, false, 'center'); text('SGST/UTGST', 439, y + 2, 74, 7.5, false, 'center');
    line(359, y + 9, 515, y + 9);
    ['Rate', 'Amount', 'Rate', 'Amount'].forEach((label, i) => text(label, taxCols[i + 2] + 1, y + 10, taxCols[i + 3] - taxCols[i + 2] - 2, 7, false, 'center'));
  }
  text('Total\nTax Amount', taxCols.at(-2) + 1, y + 2, right - taxCols.at(-2) - 2, 7.5, false, 'center');
  line(left, y + 19, right, y + 19);
  summaryGroups.forEach((group, i) => {
    const gy = y + 20 + i * 10;
    const values = sale.interstate ? [group.hsn, format(group.taxable), group.gstRate === null ? '-' : `${group.gstRate}%`, format(group.igst), format(group.igst)]
      : [group.hsn, format(group.taxable), group.gstRate === null ? '-' : `${group.gstRate / 2}%`, format(group.cgst), group.gstRate === null ? '-' : `${group.gstRate / 2}%`, format(group.sgst), format(money(group.cgst + group.sgst))];
    values.forEach((value, col) => text(value, taxCols[col] + 2, gy, taxCols[col + 1] - taxCols[col] - 4, 7.5, false, col === 0 ? 'left' : 'right'));
    line(left, gy + 9, right, gy + 9);
  });
  const totals = sale.interstate ? ['Total', format(sale.subtotal), '', format(sale.igst), format(sale.taxTotal)] : ['Total', format(sale.subtotal), '', format(sale.cgst), '', format(sale.sgst), format(sale.taxTotal)];
  totals.forEach((value, col) => text(value, taxCols[col] + 2, y + 20 + groupCount * 10, taxCols[col + 1] - taxCols[col] - 4, 7.5, true, 'right'));
  y += taxTableHeight;
  box(left, y, width, taxWordsHeight + detailsHeight);
  text(`Tax Amount (in words) : ${amountInWords(sale.taxTotal)}`, left + 3, y + 3, width - 6, 8);
  y += taxWordsHeight;
  text('Declaration', left + 3, y + 2, 280, 7.5);
  let dy = y + 12;
  seller.declarations.forEach((value, i) => { text(`${i + 1}. ${value}`, left + 3, dy, 278, 7); dy += height(`${i + 1}. ${value}`, 278, 7); });
  text("Company's Bank Details", 313, y + 2, 248, 7.5);
  let by = y + 12;
  bankLines.forEach((value, i) => { text(value, 313, by, 248, 7, i > 0); by += height(value, 248, 7, i > 0); });
  y += detailsHeight;
  box(left, y, width, 35); line(298, y, 298, y + 35);
  text("Customer's Seal and Signature", left + 3, y + 2, 260, 7.5); text(`for ${seller.name}`, 302, y + 2, 260, 8, true, 'right');
  text('Authorised Signatory', 302, y + 24, 260, 7.5, false, 'right'); footer();
  if (needsAnnexure) {
    const cols = [30, 215, 260, 335, 405, 475, 565];
    for (let start = 0; start < sale.taxGroups.length; start += 50) {
      doc.addPage(); pageNumber++;
      text(`${seller.name} - Tax Invoice ${sale.invoiceNumber}`, left, 30, width, 10, true);
      text('HSN / SAC tax summary annexure', left, 48, width, 9);
      const groups = sale.taxGroups.slice(start, start + 50), h = 22 + groups.length * 13;
      box(left, 70, width, h); cols.slice(1, -1).forEach(x => line(x, 70, x, 70 + h));
      ['HSN/SAC', 'GST %', 'Taxable', 'CGST', 'SGST', 'IGST'].forEach((label, i) => text(label, cols[i] + 3, 76, cols[i + 1] - cols[i] - 6, 8, true));
      line(left, 92, right, 92);
      groups.forEach((group, i) => {
        [group.hsn, group.gstRate, format(group.taxable), format(group.cgst), format(group.sgst), format(group.igst)].forEach((value, col) => text(value, cols[col] + 3, 95 + i * 13, cols[col + 1] - cols[col] - 6, 8));
        line(left, 105 + i * 13, right, 105 + i * 13);
      });
      footer();
    }
  }
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    if (range.count > 1) text(`Page ${i + 1} of ${pageNumber}`, right - 100, 829, 100, 6.5, false, 'right');
  }
  doc.end();
  return completed;
}
