import { useState } from 'react';
import Modal from '../ui/Modal';

export default function DealerInvoiceNumberDialog({ customerName, onClose, onCreate }) {
  const [number, setNumber] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const submit = async event => {
    event.preventDefault();
    const invoiceNumber = number.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9/-]{0,63}$/.test(invoiceNumber)) { setError('Enter 1 to 64 letters, numbers, slashes or hyphens.'); return; }
    setBusy(true); setError('');
    try { await onCreate(invoiceNumber); }
    catch (err) { setError(err.response?.data?.message || err.message || 'Could not create the Tax Invoice. Please retry.'); }
    finally { setBusy(false); }
  };
  return <Modal isOpen title="Dealer Tax Invoice number" description={customerName} onClose={busy ? undefined : onClose} closeOnOutsideClick={false} size="md">
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-600">Payment details are ready. Enter the dealer’s custom invoice number to create the Tax Invoice and add it to the sales register.</p>
      <label className="block space-y-2 text-sm font-semibold">Invoice number *<input autoFocus required maxLength={64} value={number} onChange={event => setNumber(event.target.value)} disabled={busy} className="block w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold">Back</button><button disabled={busy || !number.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">{busy ? 'Creating…' : 'Create Tax Invoice'}</button></div>
    </form>
  </Modal>;
}
