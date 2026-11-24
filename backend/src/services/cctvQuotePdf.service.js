import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';
const assets = fileURLToPath(new URL('../assets/pos/', import.meta.url));
const cash = value => `Rs. ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export async function generateCctvQuotePdf(quote) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, info: { Title: `Quotation ${quote.quoteNumber}`, Author: quote.seller.name } });
  doc.registerFont('regular', `${assets}LiberationSans-Regular.ttf`); doc.registerFont('bold', `${assets}LiberationSans-Bold.ttf`); doc.font('regular');
  const chunks = []; const complete = new Promise((resolve, reject) => { doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  const width = 515;
  const header = () => { doc.image(`${assets}invoice-logo.jpg`, 40, 35, { fit: [65, 55] }); doc.font('bold').fontSize(21).fillColor('#800020').text('CCTV QUOTATION', 120, 43); doc.font('regular').fontSize(9).fillColor('#333').text(`${quote.quoteNumber}  |  ${new Date(quote.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 120, 73); doc.y = 110; doc.x = 40; };
  const ensure = height => { if (doc.y + height > 765) { doc.addPage(); header(); } };
  const text = (value, options = {}) => { const height = doc.heightOfString(String(value || ''), { width, ...options }); ensure(height + 8); doc.text(String(value || ''), 40, doc.y, { width, ...options }); doc.moveDown(.4); };
  header(); doc.fillColor('#222').fontSize(10).font('bold'); text(quote.seller.name); doc.font('regular').fontSize(9); text(`${quote.seller.address}\n${quote.seller.email}  ${quote.seller.phone || ''}\nGSTIN: ${quote.seller.gstin || 'Not provided'}`);
  doc.moveDown(); doc.font('bold'); text(`Prepared for: ${quote.customer.name}${quote.customer.company ? ` / ${quote.customer.company}` : ''}`); doc.font('regular'); text(`${quote.customer.address}\n${quote.customer.email} | ${quote.customer.phone}${quote.customer.hasGst ? `\nGSTIN: ${quote.customer.gstin}` : ''}`);
  text(`System: ${quote.selection.systemType} | Cameras: ${quote.pricing.count} | ${quote.selection.propertyType}\nArea: ${quote.selection.area} | State: ${quote.selection.state}\nMobile viewing: ${quote.selection.mobileView ? 'Yes' : 'No'}`);
  const tableHeader = () => { ensure(36); const y = doc.y; doc.rect(40, y, width, 25).fill('#f6eef0'); doc.fillColor('#222').font('bold').fontSize(9); doc.text('Product / Service', 46, y + 7, { width: 265 }); doc.text('Qty', 313, y + 7, { width: 35, align: 'right' }); doc.text('Unit price', 354, y + 7, { width: 85, align: 'right' }); doc.text('Amount', 445, y + 7, { width: 104, align: 'right' }); doc.y = y + 32; };
  tableHeader();
  for (const line of quote.pricing.lines) {
    doc.font('regular').fontSize(9); const label = `${line.name}${line.modelNumber ? `\nModel: ${line.modelNumber}` : ''}`; const height = Math.max(30, doc.heightOfString(label, { width: 260 }) + 12);
    if (doc.y + height > 740) { doc.addPage(); header(); tableHeader(); }
    const y = doc.y; doc.fillColor('#222').text(label, 46, y, { width: 260 }); doc.text(String(line.quantity), 313, y, { width: 35, align: 'right' }); doc.text(quote.pricing.priced ? cash(line.unitPrice) : 'To confirm', 354, y, { width: 85, align: 'right' }); doc.text(quote.pricing.priced ? cash(line.amount) : 'To confirm', 445, y, { width: 104, align: 'right' }); doc.strokeColor('#ddd').moveTo(40, y + height - 5).lineTo(555, y + height - 5).stroke(); doc.y = y + height;
  }
  doc.moveDown();
  if (quote.pricing.priced) {
    ensure(150);
    const p = quote.pricing;
    for (const [label, amount] of [['Subtotal', p.subtotal], ...(p.igst ? [[`IGST (${p.gstRate}%)`, p.igst]] : [[`CGST (${p.gstRate / 2}%)`, p.cgst], [`SGST (${p.gstRate / 2}%)`, p.sgst]]), ['Round off', p.roundOff], ['Total including GST', p.total]]) { ensure(24); const y = doc.y; doc.font(label.startsWith('Total') ? 'bold' : 'regular').fontSize(label.startsWith('Total') ? 12 : 10); doc.text(label, 300, y, { width: 145 }); doc.text(cash(amount), 445, y, { width: 110, align: 'right' }); doc.y = y + 22; }
  } else { doc.font('bold').fontSize(11); text('Pricing / availability requires confirmation.'); doc.font('regular').fontSize(9); text(quote.pricing.reasons.join('\n')); }
  doc.moveDown(); doc.font('bold').fontSize(10); text('Terms and validity'); doc.font('regular').fontSize(9); text(`Valid until ${new Date(quote.expiresAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}. This is a quotation, not an order or tax invoice. Stock is not reserved.`); text(quote.terms); text(`Customer requirement: ${quote.customer.message}`);
  const pages = doc.bufferedPageRange(); for (let index = 0; index < pages.count; index++) { doc.switchToPage(index); doc.font('regular').fontSize(8).fillColor('#666').text(`${quote.quoteNumber} · Page ${index + 1} of ${pages.count}`, 40, 790, { width, align: 'center', lineBreak: false }); }
  doc.end(); return complete;
}
