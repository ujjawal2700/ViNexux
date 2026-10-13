import ExcelJS from 'exceljs';

export async function generatePosExport(sales) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VI NEXUS'; workbook.created = new Date();
  const make = (name, columns) => {
    const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.columns = columns.map(([header, key, width = 20, format]) => ({ header, key, width, ...(format ? { style: { numFmt: format } } : {}) }));
    const row = sheet.getRow(1); row.height = 30;
    row.eachCell(cell => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF26364A' } }; cell.alignment = { vertical: 'middle', wrapText: true }; });
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
    sheet.properties.defaultRowHeight = 20;
    return sheet;
  };
  const currency = '#,##0.00';
  const orders = make('Offline sales', [
    ['Invoice', 'invoiceNumber', 25], ['Date (IST)', 'date', 24, 'dd-mmm-yyyy hh:mm'], ['Status', 'status', 14], ['Customer', 'name', 28],
    ['Phone', 'phone'], ['WhatsApp', 'whatsappNumber'], ['Email', 'email', 30], ['Address', 'address', 55], ['City', 'city'],
    ['State', 'state'], ['PIN code', 'pincode', 12], ['Customer GSTIN', 'gstin', 24],
    ['Taxable value', 'subtotal', 20, currency], ['CGST', 'cgst', 18, currency], ['SGST', 'sgst', 18, currency], ['IGST', 'igst', 18, currency],
    ['Round off', 'roundOffAmount', 18, currency], ['Invoice total', 'total', 20, currency], ['Returns', 'returnedAmount', 18, currency],
    ['Net sales', 'net', 20, currency], ['Net received', 'paidAmount', 20, currency], ['Balance due', 'balanceDue', 20, currency],
    ['Refund due', 'refundDue', 20, currency], ['Payment status', 'paymentStatus'], ['Void reason', 'voidReason', 35], ['Notes', 'notes', 40],
    ['Item subtotal (price mode)', 'itemsTotal', 26, currency], ['Discount (price mode)', 'discountTotal', 24, currency], ['Prices include GST', 'taxMode', 22],
  ]);
  const items = make('Line items', [['Invoice', 'invoiceNumber', 25], ['SKU', 'sku', 25], ['Product', 'productName', 45], ['Model', 'modelNumber', 25],
    ['HSN/SAC', 'hsn'], ['Quantity', 'quantity', 12, '0'], ['Returned qty', 'returnedQuantity', 15, '0'], ['Unit', 'unit', 12],
    ['Unit price', 'unitPrice', 18, currency], ['Discount %', 'discountPercent', 15, '0.00'], ['GST %', 'gstRate', 12, '0.00'],
    ['Taxable', 'taxable', 18, currency], ['CGST', 'cgst', 18, currency], ['SGST', 'sgst', 18, currency], ['IGST', 'igst', 18, currency], ['Line total', 'lineTotal', 18, currency], ['Serial numbers', 'serials', 55]]);
  const payments = make('Payments and refunds', [['Invoice', 'invoiceNumber', 25], ['Date (IST)', 'date', 24, 'dd-mmm-yyyy hh:mm'], ['Type', 'type', 15], ['Method', 'method', 15], ['Amount', 'amount', 18, currency], ['Reference', 'reference', 35]]);
  const returns = make('Returns', [['Invoice', 'invoiceNumber', 25], ['Credit note', 'creditNoteNumber', 28], ['Date (IST)', 'date', 24, 'dd-mmm-yyyy hh:mm'], ['Amount', 'amount', 18, currency], ['Reason', 'reason', 45], ['Items', 'items', 60]]);
  // Excel has no timezone. Store a typed date representing the IST wall clock.
  const localDate = value => new Date(new Date(value).getTime() + 330 * 60000);
  for (const sale of sales) {
    orders.addRow({ ...sale, ...sale.customer, date: localDate(sale.createdAt), net: sale.status === 'voided' ? 0 : sale.total - sale.returnedAmount });
    sale.items.forEach(item => items.addRow({ ...item, invoiceNumber: sale.invoiceNumber, serials: item.serialNumbers.join(', ') }));
    for (const [type, entries] of [['Payment', sale.payments], ['Refund', sale.refunds || []]]) entries.forEach(p => payments.addRow({ ...p, invoiceNumber: sale.invoiceNumber, date: localDate(p.createdAt), type }));
    sale.returns.forEach(r => returns.addRow({ ...r, invoiceNumber: sale.invoiceNumber, date: localDate(r.createdAt), items: r.items.map(i => `${sale.items.find(line => String(line.productId) === String(i.productId))?.productName || i.productId} x ${i.quantity}`).join('; ') }));
  }
  workbook.eachSheet(sheet => {
    sheet.eachRow((row, n) => { if (n > 1) row.eachCell(cell => { cell.alignment = { vertical: 'top', wrapText: true }; }); });
    sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, printTitlesRow: '1:1' };
  });
  return workbook.xlsx.writeBuffer();
}
