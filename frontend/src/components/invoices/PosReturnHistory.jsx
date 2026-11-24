import { productLineKey } from '../../../../shared/productVariants.js';
import { refundMethodLabel } from '../../../../shared/posReturns.js';
const money = amount => Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
const date = value => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

export default function PosReturnHistory({ invoice, showItems = true }) {
  const returns = invoice.returns || [], refunds = invoice.refunds || [], items = invoice.items || [];
  if (!returns.length && !refunds.length && !items.some(item => item.returnedQuantity > 0) && !(invoice.refundDue > 0)) return null;
  const events = [...returns.map(entry => ({ ...entry, type: 'return' })), ...refunds.map(entry => ({ ...entry, type: 'refund' }))]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return <section aria-label="Returns and refunds" className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-900">
    <h3 className="text-sm font-bold">Returns & refunds</h3>
    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
      <p>Return value <strong className="block">{money(invoice.returnedAmount)}</strong></p>
      <p>Refunded <strong className="block text-emerald-700">{money(refunds.reduce((sum, entry) => sum + entry.amount, 0))}</strong></p>
      <p>Refund pending <strong className={`block ${invoice.refundDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{money(invoice.refundDue)}</strong></p>
    </div>
    {showItems && <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{['Product', 'Purchased', 'Returned', 'Kept'].map(label => <th key={label} className="px-2 py-2">{label}</th>)}</tr></thead>
      <tbody>{items.map((item, index) => <tr key={productLineKey(item.productId, item.variantId) || index} className="border-t border-slate-200"><td className="px-2 py-2"><strong>{item.productName}</strong><p className="mt-1 text-slate-500">{[item.variantName, item.modelNumber, item.sku].filter(Boolean).join(' · ')}</p></td><td className="px-2">{item.quantity}</td><td className="px-2 font-semibold">{item.returnedQuantity || 0}</td><td className="px-2">{item.quantity - (item.returnedQuantity || 0)}</td></tr>)}</tbody></table></div>}
    <ol className="space-y-2">{events.map((entry, index) => <li key={`${entry.type}:${entry.creditNoteNumber || entry.createdAt}:${index}`} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
      <div className="flex flex-wrap justify-between gap-2"><strong>{entry.type === 'return' ? `Return · ${entry.creditNoteNumber}` : `Refund paid · ${refundMethodLabel(entry.method)}`}</strong><strong>{money(entry.amount)}</strong></div>
      <p className="mt-1 text-slate-500">{date(entry.createdAt)}</p>
      {entry.type === 'return' ? <><ul className="mt-2 space-y-1">{(entry.items || []).map((returned, i) => {
        const item = items.find(line => productLineKey(line.productId, line.variantId) === productLineKey(returned.productId, returned.variantId));
        return <li key={i}>{item?.productName || 'Product'}{item?.variantName ? ` · ${item.variantName}` : ''} × {returned.quantity}</li>;
      })}</ul><p className="mt-2 break-words">Reason: {entry.reason}</p></> : <>
        {entry.kind === 'invoice-adjustment' && <p className="mt-2 text-slate-500">Invoice correction</p>}
        {entry.creditNoteNumber && <p className="mt-2">Credit note: {entry.creditNoteNumber}</p>}
        {entry.reference && <p className="mt-2 break-words">Refund reference: {entry.reference}</p>}
      </>}
    </li>)}</ol>
    <p className="text-xs text-slate-500">Invoice, return and refund records are retained for this purchase.</p>
  </section>;
}
