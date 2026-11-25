import { posDocumentLabel } from '../../../../shared/posDocumentLabels.js';
import { useState } from 'react';
import PosInvoiceItemsEditor from './PosInvoiceItemsEditor';
import { calculatePosBill } from '../../../../shared/posBilling.js';
import { validatePosItems } from '../../../../shared/posValidation.js';
import { refundMethodLabel } from '../../../../shared/posReturns.js';
import Modal from '../ui/Modal';
import StateCityFields from '../address/StateCityFields';
import { validatePosCustomer } from '../../../../shared/posValidation.js';
import posService from '../../services/posService';
const input = 'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 read-only:bg-slate-50 read-only:text-slate-500';
function ContactFields({ value, onChange, billing = false, financialLocked = false }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {[
      ['name', billing ? 'Billing name' : 'Delivery name', true], ['phone', billing ? 'Invoice owner phone' : 'Delivery phone', true],
      ['whatsappNumber', 'WhatsApp number', true], ['email', 'Email', false], ['address', 'Street address', true], ['pincode', 'PIN code', false], ['gstin', 'GSTIN', false],
    ].map(([key, title, required]) => <label key={key} className={`text-xs font-semibold ${key === 'address' ? 'sm:col-span-2' : ''}`}>{title}{required ? ' *' : ' (optional)'}<input className={input} value={value[key] || ''} required={required} readOnly={billing && key === 'phone'} type={key === 'email' ? 'email' : ['phone', 'whatsappNumber'].includes(key) ? 'tel' : 'text'} maxLength={key === 'address' ? 500 : key === 'name' ? 100 : key === 'pincode' ? 6 : key === 'email' ? 150 : key === 'gstin' ? 15 : 20}
      onChange={event => onChange({ ...value, [key]: key === 'gstin' ? event.target.value.toUpperCase() : event.target.value })} /></label>)}
    <StateCityFields required withStateCode stateDisabled={billing && financialLocked} value={value} onChange={onChange} />
  </div>;
}
export default function PosInvoiceEditDialog({ invoice, onClose, onSaved }) {
  const [customer, setCustomer] = useState({ ...invoice.customer });
  const [shipping, setShipping] = useState({ ...(invoice.shipping || invoice.customer) });
  const [separateShipping, setSeparateShipping] = useState(JSON.stringify(invoice.shipping || invoice.customer) !== JSON.stringify(invoice.customer));
  const financialLocked = invoice.documentType === 'delivery-note' || invoice.deliveryNoteIds?.length || invoice.returns.length > 0 || invoice.items.some(item => item.returnedQuantity > 0) || invoice.refunds.some(refund => refund.kind !== 'invoice-adjustment');
  const [editRequestId] = useState(() => crypto.randomUUID());
  const [items, setItems] = useState(invoice.items.map(item => ({ ...item })));
  const [taxMode, setTaxMode] = useState(invoice.taxMode || 'inclusive'), [roundOff, setRoundOff] = useState(invoice.roundOff !== false);
  const [billType, setBillType] = useState(invoice.billType || 'b2c'), [delivery, setDelivery] = useState({ ...(invoice.delivery || {}) });
  const [settled, setSettled] = useState(false), [method, setMethod] = useState('cash'), [reference, setReference] = useState('');
  const preview = calculatePosBill(items, { taxMode, roundOff, interstate: customer.stateCode !== invoice.seller.stateCode });
  const difference = Math.round((preview.total - invoice.paidAmount) * 100) / 100;
  const money = value => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  const [notes, setNotes] = useState(invoice.notes || '');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const save = async event => {
    event.preventDefault();
    const issues = [...validatePosCustomer(customer), ...(separateShipping ? validatePosCustomer(shipping, 'shipping') : []), ...(!financialLocked ? validatePosItems(items) : [])];
    if (issues.length) { setError(issues.map(issue => `${issue.path}: ${issue.message}`).join(' · ')); return; }
    setBusy(true); setError('');
    try {
      const updated = await posService.editSale(invoice._id, { expectedUpdatedAt: invoice.updatedAt || invoice.createdAt, editRequestId, customer, ...(separateShipping ? { shipping } : {}), notes, delivery, ...(!financialLocked ? { items: items.map(item => Object.fromEntries(['productId', 'variantId', 'quantity', 'unitPrice', 'discountPercent', 'gstRate', 'hsn', 'unit', 'serialNumbers'].map(key => [key, item[key]]))), taxMode, roundOff, billType, ...(settled && difference ? { settlement: { method, reference } } : {}) } : {}) });
      onSaved(updated);
    } catch (err) { setError(err.response?.data?.message || 'Could not save this invoice. Please try again.'); }
    finally { setBusy(false); }
  };
  return <Modal isOpen onClose={busy ? undefined : onClose} title={`Edit ${posDocumentLabel({ ...invoice, billType })}`} description={invoice.invoiceNumber} size="xl" closeOnOutsideClick={!busy}
    footer={<><button type="button" className="rounded-lg border px-4 py-2 text-xs font-semibold" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" form="pos-invoice-edit" className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={busy}>{busy ? 'Saving…' : 'Save invoice details'}</button></>}>
    <form id="pos-invoice-edit" onSubmit={save} className="space-y-5">
      <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">Edit products, quantities, prices, tax and delivery details. The invoice number and owner phone stay fixed. Stock and totals are recalculated when you save.</p>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <fieldset disabled={busy} className="space-y-5"><section className="space-y-3"><h3 className="text-sm font-bold">Billing contact</h3><ContactFields value={customer} onChange={setCustomer} billing financialLocked={financialLocked} /></section>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={separateShipping} onChange={event => { setSeparateShipping(event.target.checked); if (event.target.checked) setShipping({ ...customer }); }} />Use different delivery details</label>
        {separateShipping && <section className="space-y-3 border-t pt-4"><h3 className="text-sm font-bold">Delivery contact</h3><ContactFields value={shipping} onChange={setShipping} /></section>}
        {financialLocked ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Dispatched, invoiced or returned item records are locked. Products, prices and the tax state are locked to preserve their history. Contact details, delivery details and notes can still be corrected.</p> : <>
          <div className="grid gap-4 border-t pt-4 sm:grid-cols-3"><label className="text-xs font-semibold">Bill type<select aria-label="Bill type" className={input} value={billType} onChange={event => setBillType(event.target.value)}><option value="b2c">B2C / Retail</option><option value="b2b">B2B / Dealer</option></select></label><label className="text-xs font-semibold">Price mode<select aria-label="Price mode" className={input} value={taxMode} onChange={event => setTaxMode(event.target.value)}><option value="inclusive">Includes GST</option><option value="exclusive">Excludes GST</option></select></label><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={roundOff} onChange={event => setRoundOff(event.target.checked)} />Round to nearest rupee</label></div>
          <PosInvoiceItemsEditor items={items} onChange={setItems} billType={billType} disabled={busy} />
          <div className="space-y-3 rounded-xl border bg-slate-50 p-4"><div className="flex flex-wrap justify-between gap-3 text-sm"><span>Previous total <strong>{money(invoice.total)}</strong></span><span>New total <strong>{money(preview.total)}</strong></span></div>
            <p className="text-xs text-slate-500">Tax: {money(preview.taxTotal)} · Net payment already recorded: {money(invoice.paidAmount)}</p>
            {!!difference && <><p className={`text-sm font-bold ${difference > 0 ? 'text-primary' : 'text-amber-700'}`}>{difference > 0 ? 'Additional payment' : 'Refund'}: {money(Math.abs(difference))}</p><label className="block text-xs font-semibold">Settlement status<select aria-label="Settlement status" className={input} value={settled ? 'paid' : 'pending'} onChange={event => setSettled(event.target.value === 'paid')}><option value="pending">Keep payment / refund pending</option><option value="paid">Difference settled now</option></select></label>
              {settled && <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Settlement method<select aria-label="Settlement method" className={input} value={method} onChange={event => setMethod(event.target.value)}>{['cash', 'upi', 'bank'].map(value => <option key={value} value={value}>{refundMethodLabel(value)}</option>)}</select></label><label className="text-xs font-semibold">Settlement reference<input className={input} maxLength={200} value={reference} onChange={event => setReference(event.target.value)} /></label></div>}
              <p className="text-xs text-slate-500">Mark settled only after collecting or refunding the money. This records the transaction.</p></>}
          </div>
        </>}
        <details className="rounded-lg border p-3"><summary className="cursor-pointer text-xs font-semibold">Delivery & reference details</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{(invoice.documentType === 'delivery-note' ? [['paymentTerms', 'Payment terms']] : [['deliveryNote', 'Delivery note'], ['paymentTerms', 'Payment terms'], ['reference', 'Reference'], ['dispatchDoc', 'Dispatch document'], ['dispatchedThrough', 'Dispatched through'], ['destination', 'Destination'], ['terms', 'Delivery terms']]).map(([key, label]) => <label className="text-xs font-semibold" key={key}>{label}<input className={input} maxLength={key === 'terms' ? 500 : 100} value={delivery[key] || ''} onChange={event => setDelivery(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div></details>
        <label className="block text-xs font-semibold">Invoice notes<textarea className={input} rows={3} maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} /></label>
      </fieldset>
    </form>
  </Modal>;
}
