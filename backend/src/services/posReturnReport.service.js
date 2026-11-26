import { productLineKey } from '../../../shared/productVariants.js';
import { refundMethodLabel } from '../../../shared/posReturns.js';

const refundDetails = entries => entries.length ? entries.map(entry => `${refundMethodLabel(entry.method)} | INR ${Number(entry.amount).toFixed(2)} | ${new Date(entry.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST${entry.reference ? ` | Ref: ${entry.reference}` : ''}`).join('\n') : 'None recorded';
export const returnReportRows = sale => (sale.returns || []).map(entry => {
  const refunds = sale.refunds || [];
  const linked = refunds.filter(refund => refund.creditNoteNumber === entry.creditNoteNumber || refund.requestId === entry.requestId);
  const other = refunds.filter(refund => !refund.creditNoteNumber && !(sale.returns || []).some(returned => returned.requestId === refund.requestId));
  return {
    invoiceNumber: sale.invoiceNumber, creditNoteNumber: entry.creditNoteNumber, createdAt: entry.createdAt,
    customerName: sale.customer.name, phone: sale.customer.phone, gstin: sale.customer.gstin || '',
    amount: entry.amount, reason: entry.reason,
    items: entry.items.map(item => {
      const line = sale.items.find(product => productLineKey(product.productId, product.variantId) === productLineKey(item.productId, item.variantId));
      return `${line?.productName || item.productId}${line?.variantName ? ` (${line.variantName})` : ''} | SKU: ${line?.sku || '-'} | Model: ${line?.modelNumber || line?.model || '-'} | Qty: ${item.quantity}`;
    }).join('\n'),
    linkedRefunds: refundDetails(linked), otherRefunds: refundDetails(other),
    invoiceRefunded: Math.round(refunds.reduce((total, refund) => total + refund.amount, 0) * 100) / 100,
    refundDue: sale.refundDue || 0,
    refundStatus: sale.refundDue > 0 ? 'Refund pending on invoice' : refunds.length ? 'Invoice refund settled' : 'No cash refund due; credit adjusted',
  };
});
