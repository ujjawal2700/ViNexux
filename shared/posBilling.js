export const POS_SELLER_DEFAULTS = {
  name: 'VI NEXUS', address: '1162, Dadwara, Kota Rajasthan', gstin: '08CQQPM3652N1Z1',
  state: 'Rajasthan', stateCode: '08', email: 'vinexus2024@gmail.com', phone: '',
  invoicePrefix: 'VI', accountHolder: 'VI NEXUS', bankName: 'BOB BANK CURRENT A/C (832)',
  accountNumber: '42660200000832', branch: 'STATION ROAD KOTA RAJ.', ifsc: 'BARB0STAKOT',
  jurisdiction: 'KOTA', declarations: [
    'Goods once sold will not be taken back',
    "Warranty is subject to manufacture's term & conditions.",
    'No warranty on burn & broken.',
    'If Payment will not be made, then Interest @18%p.a will be Charged.',
  ],
};

export const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
export const toPaise = value => Math.round((Number(value) + Number.EPSILON) * 100);

// All amounts cross the rounding boundary in integer paise. The server
// recalculates this from validated inputs; browser totals are previews only.
export function calculatePosBill(items, { taxMode = 'inclusive', interstate = false, roundOff = true } = {}) {
  const lines = items.map(item => {
    const originalAmount = toPaise(item.unitPrice) * item.quantity;
    const gross = Math.round(originalAmount * (1 - item.discountPercent / 100));
    const taxable = taxMode === 'inclusive' ? Math.round(gross / (1 + item.gstRate / 100)) : gross;
    const tax = taxMode === 'inclusive' ? gross - taxable : Math.round(taxable * item.gstRate / 100);
    const cgst = interstate ? 0 : taxMode === 'exclusive' ? Math.round(taxable * item.gstRate / 200) : Math.round(tax / 2);
    const sgst = interstate ? 0 : taxMode === 'exclusive' ? cgst : tax - cgst;
    const finalTax = interstate ? tax : cgst + sgst;
    return { ...item, originalAmount: originalAmount / 100, discountAmount: (originalAmount - gross) / 100,
      taxable: taxable / 100, cgst: cgst / 100, sgst: sgst / 100,
      igst: interstate ? tax / 100 : 0, lineTotal: (taxable + finalTax) / 100,
      taxableUnitRate: taxMode === 'inclusive' ? item.unitPrice / (1 + item.gstRate / 100) : item.unitPrice };
  });
  const sum = key => lines.reduce((total, line) => total + toPaise(line[key]), 0);
  const subtotal = sum('taxable'), cgst = sum('cgst'), sgst = sum('sgst'), igst = sum('igst');
  const beforeRounding = subtotal + cgst + sgst + igst;
  const total = roundOff ? Math.round(beforeRounding / 100) * 100 : beforeRounding;
  const groups = new Map();
  for (const line of lines) {
    const key = `${line.hsn}|${line.gstRate}`;
    const group = groups.get(key) || { hsn: line.hsn, gstRate: line.gstRate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    for (const field of ['taxable', 'cgst', 'sgst', 'igst']) group[field] = money(group[field] + line[field]);
    groups.set(key, group);
  }
  return { items: lines, taxGroups: [...groups.values()], itemsTotal: sum('originalAmount') / 100,
    discountTotal: sum('discountAmount') / 100, subtotal: subtotal / 100, cgst: cgst / 100,
    sgst: sgst / 100, igst: igst / 100, taxTotal: (cgst + sgst + igst) / 100,
    roundOffAmount: (total - beforeRounding) / 100, total: total / 100,
    totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0) };
}

const small = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function words(n) {
  if (n < 20) return small[n];
  if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${small[n % 10]}` : ''}`;
  for (const [value, label] of [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand'], [100, 'Hundred']]) {
    if (n >= value) return `${words(Math.floor(n / value))} ${label}${n % value ? ` ${words(n % value)}` : ''}`;
  }
  return '';
}
export function amountInWords(value) {
  const paise = toPaise(Math.abs(value));
  return `INR ${words(Math.floor(paise / 100))}${paise % 100 ? ` and ${words(paise % 100)} paise` : ''} Only`;
}

export const financialYear = (date = new Date()) => {
  const india = new Date(new Date(date).getTime() + 330 * 60000);
  const year = india.getUTCFullYear() - (india.getUTCMonth() < 3 ? 1 : 0);
  return `${String(year).slice(-2)}-${String(year + 1).slice(-2)}`;
};

export function buildPosWhatsAppLink(sale, invoiceUrl) {
  const digits = String(sale.customer.whatsappNumber || sale.customer.phone).replace(/\D/g, '');
  const number = digits.length === 10 ? `91${digits}` : digits;
  const text = `Hello ${sale.customer.name},\n\nThank you for shopping with ${sale.seller.name}.\nInvoice: ${sale.invoiceNumber}\nTotal: INR ${sale.total.toFixed(2)}\n${sale.items.map(item => `${item.productName} x ${item.quantity}`).join('\n')}\n\nView / download your invoice (verify your mobile number):\n${invoiceUrl}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
