import { posBillLabel } from '../../../../shared/posDocumentLabels.js';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import posService from '../../services/posService';
const money = value => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
export default function AccountBalancePanel({ userId, compact = false }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [version, setVersion] = useState(0);
  useEffect(() => {
    if (!userId) return;
    let active = true; setData(null); setError('');
    posService.accountBalance(userId).then(result => { if (active) { setData(result); setError(''); } }).catch(err => { if (active) setError(err.response?.data?.message || 'Could not load account balances.'); });
    return () => { active = false; };
  }, [userId, version]);
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5" aria-label="Customer account balance"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Account balance</h2><p className="mt-1 text-xs text-slate-500">Sale Bills, Proforma Bills and open delivery notes. Converted notes are counted once through their bill.</p></div><button className="text-xs font-semibold text-primary" onClick={() => setVersion(value => value + 1)}>Refresh balances</button></div>{error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : !data ? <p className="text-sm text-slate-500">Loading balance…</p> : <><div className="grid gap-3 sm:grid-cols-3">{[['Credit due', data.balanceDue], ['Net received', data.paidAmount], ['Refund owed to customer', data.refundDue]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold">{money(value)}</p></div>)}</div>{!compact && <div className="max-h-80 space-y-2 overflow-auto">{(data.documents || []).map(doc => <Link key={doc._id} to={`/admin/pos?${doc.documentType === 'delivery-note' ? 'deliveryNote' : 'invoice'}=${doc._id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 text-xs hover:bg-slate-50"><div><p className="font-semibold">{doc.invoiceNumber} · {doc.documentType === 'delivery-note' ? 'Delivery Note' : posBillLabel(doc)}</p><p className="mt-1 text-slate-500">{doc.status === 'voided' ? 'Voided' : doc.paymentStatus}{doc.dueDate ? ` · Due ${doc.dueDate}` : ''}</p></div><div className="text-right"><p>Paid {money(doc.paidAmount)}</p><p className="mt-1 font-semibold text-amber-700">Outstanding {money(doc.balanceDue)}</p>{doc.refundDue > 0 && <p className="mt-1 text-rose-700">Refund due {money(doc.refundDue)}</p>}</div></Link>)}</div>}{!compact && data.documentCount > 100 && <p className="text-xs text-slate-500">Showing the latest 100 documents. Totals include all documents.</p>}</>}</section>;
}
