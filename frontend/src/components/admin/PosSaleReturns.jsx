import { useEffect, useState } from 'react';
import { Search, RotateCcw, ChevronLeft, ChevronRight, Receipt, UserRound, Phone, ArrowUpRight, Package, Wallet } from 'lucide-react';
import posService from '../../services/posService';
const money = amount => Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
const date = value => new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50';

export default function PosSaleReturns({ onSelect, version, busy }) {
  const [search, setSearch] = useState(''), [page, setPage] = useState(1);
  const [result, setResult] = useState({ sales: [], total: 0, pages: 0 });
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const data = await posService.sales({ search, page, limit: 20, status: 'all' });
        if (active) setResult(data);
      } catch (err) { if (active) setError(err.response?.data?.message || 'Could not search invoices.'); }
      finally { if (active) setLoading(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search, page, version, retry]);
  return <section aria-label="Sale returns" className="space-y-4">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><RotateCcw size={20} />Sale returns</h2>
      <p className="mt-2 text-sm text-slate-500">Find an invoice, return some or all remaining products, and track the refund.</p>
      <label className="mt-4 block text-xs font-semibold" htmlFor="return-invoice-search">Find invoice</label>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-300 px-3"><Search size={18} className="shrink-0 text-slate-400" /><input id="return-invoice-search" type="search" maxLength={150} value={search} onChange={event => { setSearch(event.target.value); setPage(1); setLoading(true); }} placeholder="Invoice, product, model, customer or phone" className="min-w-0 flex-1 !rounded-none !border-0 !bg-transparent py-3 text-sm outline-none !shadow-none focus:!ring-0" /></div>
      <p className="mt-2 text-xs leading-5 text-slate-500">Search by invoice number, product name, model name or number, SKU, variant, customer name or mobile number.</p>
    </div>
    {error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}<button type="button" className="ml-3 underline" onClick={() => setRetry(value => value + 1)}>Retry search</button></div>
      : loading ? <p role="status" className="p-6 text-sm text-slate-500">Searching invoices…</p>
        : <div className="grid items-start gap-4 xl:grid-cols-2">{result.sales.map(invoice => {
          const remaining = invoice.status === 'completed' && invoice.items.some(item => item.quantity > (item.returnedQuantity || 0));
          const returnedCount = invoice.items.reduce((sum, item) => sum + (item.returnedQuantity || 0), 0);
          const units = invoice.items.reduce((sum, item) => sum + item.quantity, 0);
          const stateLabel = invoice.status === 'voided' ? 'Voided' : !remaining ? 'Fully returned' : returnedCount ? 'Partially returned' : 'Available for return';
          const statusClass = invoice.status === 'voided' ? 'border-slate-200 bg-slate-100 text-slate-500' : returnedCount ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
          return <article key={invoice._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3"><div className="rounded-xl border border-primary/10 bg-primary/5 p-2.5 text-primary"><Receipt size={19} /></div><div className="min-w-0"><h3 className="break-all text-sm font-bold tracking-tight">{invoice.invoiceNumber}</h3><p className="mt-1 text-xs text-slate-400">{date(invoice.createdAt)}</p></div></div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}>{stateLabel}</span>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="flex min-w-0 items-center gap-2 font-semibold text-slate-700"><UserRound size={14} className="shrink-0 text-slate-400" />{invoice.customer.name}</span><span className="flex items-center gap-1.5 text-slate-500"><Phone size={13} />{invoice.customer.phone}</span></div>
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <div className="flex items-center justify-between gap-2 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500"><span className="flex items-center gap-1.5"><Package size={12} />Products</span><span>{returnedCount} / {units} units returned</span></div>
                <ul className="divide-y divide-slate-100">{invoice.items.slice(0, 3).map((item, index) => <li key={index} className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0"><p className="line-clamp-2 break-words text-xs font-semibold leading-5 text-slate-700">{item.productName}</p><p className="mt-0.5 break-words text-[10px] text-slate-400">{[item.modelName || item.model, item.modelNumber, item.variantName].filter(Boolean).join(' · ') || item.sku}</p></div>
                  <div className="shrink-0 text-right text-[10px] leading-5"><p className="font-semibold text-slate-600">Qty {item.quantity}</p><p className={(item.returnedQuantity || 0) ? 'font-semibold text-amber-700' : 'text-slate-400'}>{item.returnedQuantity || 0} returned</p></div>
                </li>)}</ul>
                {invoice.items.length > 3 && <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">+{invoice.items.length - 3} more products · View invoice for all items</p>}
              </div>
              <dl className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3"><div><dt className="text-[10px] text-slate-500">Invoice total</dt><dd className="mt-1 break-words text-xs font-bold tabular-nums sm:text-sm">{money(invoice.total)}</dd></div><div className="border-x border-slate-200 px-2"><dt className="text-[10px] text-slate-500">Return value</dt><dd className="mt-1 break-words text-xs font-semibold tabular-nums sm:text-sm">{money(invoice.returnedAmount)}</dd></div><div><dt className="text-[10px] text-slate-500">Refund pending</dt><dd className={`mt-1 break-words text-xs font-bold tabular-nums sm:text-sm ${invoice.refundDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{money(invoice.refundDue)}</dd></div></dl>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5"><button type="button" className={button} disabled={busy} onClick={() => onSelect(invoice, 'view')}>View invoice<ArrowUpRight size={13} /></button>
              {remaining && <button type="button" className={`${button} !border-primary !bg-primary !text-white`} disabled={busy} onClick={() => onSelect(invoice, 'return')}><RotateCcw size={13} />Return products</button>}
              {invoice.refundDue > 0 && <button type="button" className={`${button} !border-amber-200 !bg-amber-50 !text-amber-800`} disabled={busy} onClick={() => onSelect(invoice, 'refund')}><Wallet size={13} />Record refund</button>}
            </div>
          </article>;
        })}{!result.sales.length && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No invoices match this search.</p>}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>{result.total} invoices · Page {page} of {Math.max(1, result.pages)}</span><div className="flex gap-2"><button className={button} aria-label="Previous return search page" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}><ChevronLeft size={16} /></button><button className={button} aria-label="Next return search page" disabled={loading || page >= result.pages} onClick={() => setPage(value => value + 1)}><ChevronRight size={16} /></button></div></div>
  </section>;
}
