import Modal from '../ui/Modal';
import NumberInput from '../ui/NumberInput';
import { calculatePosReturn, selectedReturnItems, refundMethodLabel } from '../../../../shared/posReturns.js';
import { productLineKey } from '../../../../shared/productVariants.js';
const money = amount => Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
const inputClass = 'mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';
const button = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50';
const primary = `${button} !border-primary !bg-primary !text-white`;

export default function PosSaleActionDialog({ action, sale, onChange, onClose, onSubmit, busy, notice }) {
  const returning = action?.type === 'return';
  const voiding = action?.type === 'void';
  const refunding = action?.type === 'refund';
  const preview = returning && sale ? calculatePosReturn(sale, selectedReturnItems(action.quantities)) : null;
  const refundable = preview ? Math.max(0, Math.min(preview.creditAmount, Math.round((sale.paidAmount - (sale.total - preview.returnedAmount)) * 100) / 100)) : 0;
  const remaining = (sale?.items || []).filter(item => item.quantity > (item.returnedQuantity || 0));
  const patch = values => onChange(current => ({ ...current, ...values }));
  return <Modal isOpen={!!action} onClose={busy ? undefined : onClose} title={returning ? 'Sale return' : voiding ? 'Void sale' : refunding ? 'Record refund' : 'Record payment'} description={sale?.invoiceNumber} size={returning ? 'lg' : 'md'} closeOnOutsideClick={false}
    footer={<><button type="button" className={button} disabled={busy} onClick={onClose}>Cancel</button><button className={primary} form="pos-sale-action" type="submit" disabled={busy}>{busy ? 'Saving…' : returning ? 'Save return' : voiding ? 'Void sale & restore stock' : 'Save'}</button></>}>
    {notice?.type === 'error' && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{notice.message}</p>}
    {action && <form id="pos-sale-action" onSubmit={event => { event.preventDefault(); onSubmit(); }} className="space-y-5">
      <fieldset disabled={busy} className="space-y-5">
        {(returning || voiding) ? <>
          <p className="text-sm text-slate-500">{returning ? 'Return selected quantities or all remaining products. Stock is restored and a credit note is recorded against this invoice.' : 'The invoice will be voided and remaining stock restored. Record any customer refund separately.'}</p>
          {returning && <>
            <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => patch({ quantities: Object.fromEntries(remaining.map(item => [productLineKey(item.productId, item.variantId), item.quantity - (item.returnedQuantity || 0)])) })}>Return all remaining products</button><button type="button" className={button} onClick={() => patch({ quantities: {} })}>Clear selection</button></div>
            <div className="space-y-3">{remaining.map(item => {
              const key = productLineKey(item.productId, item.variantId), available = item.quantity - (item.returnedQuantity || 0);
              return <div key={key} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold">{item.productName}{item.variantName ? ` · ${item.variantName}` : ''}</p>
                <p className="mt-1 text-xs text-slate-500">{[item.sku, item.modelName || item.model, item.modelNumber].filter(Boolean).join(' · ')}<br />Purchased {item.quantity} · Already returned {item.returnedQuantity || 0} · Remaining {available}</p>
                <label className="mt-2 block text-xs font-semibold">Return quantity — {item.productName}{item.variantName ? ` · ${item.variantName}` : ''}
                  <NumberInput className={inputClass} min="0" max={available} step="1" value={action.quantities[key] || 0} onChange={event => patch({ quantities: { ...action.quantities, [key]: event.target.value } })} />
                </label>
              </div>;
            })}</div>
            <div className="rounded-lg bg-slate-50 p-3 text-sm"><strong>Return value: {money(preview.creditAmount)}</strong><p className="mt-1 text-xs text-slate-500">Based on the original invoice prices, tax and rounding.</p>{refundable !== preview.creditAmount && <p className="mt-2 text-xs font-semibold">Refund payable from recorded payments: {money(refundable)}</p>}</div>
          </>}
          <label className="block text-xs font-semibold">Reason<input className={inputClass} required minLength={3} maxLength={500} value={action.reason} onChange={event => patch({ reason: event.target.value })} /></label>
          {returning && <label className="block text-xs font-semibold">Refund status<select aria-label="Refund status" className={inputClass} value={action.refundNow ? 'paid' : 'pending'} onChange={event => patch({ refundNow: event.target.value === 'paid' })}><option value="pending">Refund pending — pay later</option><option value="paid" disabled={refundable <= 0}>Refund paid now</option></select><span className="mt-2 block text-xs font-normal text-slate-500">Select “Refund paid now” only after returning the money. This records the payment; it does not transfer funds.</span></label>}
        </> : <label className="block text-xs font-semibold">Amount (₹)<NumberInput className={inputClass} min="0.01" max={refunding ? sale?.refundDue : sale?.balanceDue} step="0.01" required value={action.amount} onChange={event => patch({ amount: event.target.value })} /></label>}
        {(!returning && !voiding || returning && action.refundNow) && <>
          <label className="block text-xs font-semibold">{returning || refunding ? 'Refund method' : 'Payment method'}<select aria-label={returning || refunding ? 'Refund method' : 'Payment method'} required className={inputClass} value={action.method} onChange={event => patch({ method: event.target.value })}>{['cash', 'upi', 'bank'].map(method => <option key={method} value={method}>{refundMethodLabel(method)}</option>)}</select></label>
          <label className="block text-xs font-semibold">{returning || refunding ? 'Refund reference (optional)' : 'Payment reference (optional)'}<input aria-label={returning || refunding ? 'Refund reference (optional)' : 'Payment reference (optional)'} maxLength={200} className={inputClass} value={action.reference} onChange={event => patch({ reference: event.target.value })} placeholder="Transaction ID, bank reference or cash receipt" /></label>
        </>}
      </fieldset>
    </form>}
  </Modal>;
}
