import { randomUUID } from 'node:crypto';
import { calculatePosBill, POS_SELLER_DEFAULTS } from '../../shared/posBilling.js';

export const posProductId = '507f1f77bcf86cd799439022';
export const posAdminId = '507f1f77bcf86cd799439024';
export const posInput = (overrides = {}) => ({ requestId: randomUUID(),
  customer: { name: 'Sample Customer', phone: '9876543210', whatsappNumber: '9876543210', email: '',
    address: 'Plot 505, Rajeev Gandhi Nagar', city: 'Kota', state: 'Rajasthan', stateCode: '08', pincode: '324005', gstin: '' },
  delivery: {}, notes: '', items: [{ productId: posProductId, quantity: 2, unitPrice: 3008.47,
    discountPercent: 0, gstRate: 18, hsn: '85258900', unit: 'NOS', serialNumbers: ['7A7582WN1000224458', 'CF7650WN1000224434'] }],
  taxMode: 'exclusive', roundOff: true, payments: [{ method: 'cash', amount: 7100, reference: '', requestId: randomUUID() }], ...overrides });
export const posInvoiceFixture = () => {
  const input = posInput();
  const bill = calculatePosBill(input.items.map(i => ({ ...i, productName: 'TRUEVIEW 3MP 4G MINI PT T-18120-SF', sku: 'TV-18120', modelNumber: 'T-18120-SF', returnedQuantity: 0 })), input);
  return { ...input, ...bill, _id: '507f1f77bcf86cd799439099', invoiceNumber: 'VI/26-27/000001', seller: POS_SELLER_DEFAULTS,
    shipping: input.customer, createdAt: new Date('2026-10-13T10:00:00+05:30'), interstate: false, status: 'completed',
    payments: input.payments.map(payment => ({ ...payment, createdAt: new Date('2026-10-13T10:00:00+05:30') })),
    paidAmount: bill.total, balanceDue: 0, paymentStatus: 'paid', returns: [], refunds: [], returnedAmount: 0 };
};
