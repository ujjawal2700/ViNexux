import { productLineKey } from './productVariants.js';
import { money } from './posBilling.js';

export const refundMethodLabel = method => ({ cash: 'Cash', upi: 'UPI', bank: 'Bank transfer' }[method] || method || 'Not recorded');

// Allocate the invoice's actual total, including its round-off, across returns.
export function calculatePosReturn(sale, requested = []) {
  const quantities = new Map(requested.map(item => [productLineKey(item.productId, item.variantId), Number(item.quantity) || 0]));
  const lines = sale.items.map(item => ({ quantity: item.quantity, lineTotal: item.lineTotal,
    returnedQuantity: (item.returnedQuantity || 0) + (quantities.get(productLineKey(item.productId, item.variantId)) || 0),
  }));
  const allReturned = lines.every(item => item.returnedQuantity === item.quantity);
  const unrounded = lines.reduce((sum, item) => sum + item.lineTotal, 0);
  const returnedAmount = allReturned ? sale.total : Math.min(sale.total, money(lines.reduce((sum, item) => sum + money(
    unrounded ? sale.total * item.lineTotal / unrounded * item.returnedQuantity / item.quantity : 0,
  ), 0)));
  return { returnedAmount, creditAmount: money(returnedAmount - (sale.returnedAmount || 0)), allReturned };
}

export function selectedReturnItems(quantities = {}) {
  return Object.entries(quantities).filter(([, quantity]) => Number(quantity) > 0).map(([key, quantity]) => {
    const [productId, variantId] = key.split(':');
    return { productId, ...(variantId ? { variantId } : {}), quantity: Number(quantity) };
  });
}
