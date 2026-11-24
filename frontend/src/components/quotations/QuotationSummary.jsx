import { Link } from 'react-router-dom';
import { quoteMoney } from '../../../../shared/cctvQuote.js';
export default function QuotationSummary({ pricing, pricesVisible = true }) {
  return <section aria-label="Your quotation" className="space-y-4 rounded-2xl border border-[var(--store-border,#e2e8f0)] bg-[var(--store-surface,white)] p-5 text-[var(--store-text,#0f172a)]">
    <h2 className="text-lg font-bold">Your Quotation</h2><p className="text-sm text-slate-600">{pricing.brand || 'CCTV system'} · {pricing.count || 0} cameras</p>
    <div className="space-y-3">{pricing.lines.map(line => <div key={line.key} className="flex items-start justify-between gap-3 text-sm"><span className="min-w-0 break-words"><strong>{line.quantity} × </strong>{line.name}</span>{pricesVisible && line.amount !== undefined && <span className="shrink-0 font-semibold">{quoteMoney(line.amount)}</span>}</div>)}</div>
    {!pricesVisible ? <p className="rounded-lg bg-slate-50 p-3 text-sm">Sign in to see your applicable prices and save a quotation. <Link to="/login" state={{ from: { pathname: '/cctv-quote' } }} className="font-semibold text-primary underline">Sign in</Link></p> : pricing.priced ? <div className="space-y-2 border-t pt-4 text-sm">
      <p className="flex justify-between gap-3"><span>Subtotal</span><span>{quoteMoney(pricing.subtotal)}</span></p>
      {pricing.igst > 0 ? <p className="flex justify-between gap-3"><span>IGST {pricing.gstRate}%</span><span>{quoteMoney(pricing.igst)}</span></p> : <><p className="flex justify-between gap-3"><span>CGST {pricing.gstRate / 2}%</span><span>{quoteMoney(pricing.cgst)}</span></p><p className="flex justify-between gap-3"><span>SGST {pricing.gstRate / 2}%</span><span>{quoteMoney(pricing.sgst)}</span></p></>}
      {pricing.roundOff !== 0 && <p className="flex justify-between gap-3"><span>Round off</span><span>{quoteMoney(pricing.roundOff)}</span></p>}
      <p className="flex justify-between gap-3 border-t pt-3 text-lg font-bold"><span>Total incl. GST</span><span data-testid="quotation-total">{quoteMoney(pricing.total)}</span></p>
    </div> : <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Our team will confirm the final price and availability for this setup.</p>}
    {pricesVisible && pricing.reasons?.length > 0 && <ul className="list-disc space-y-1 pl-4 text-xs text-amber-800">{pricing.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
    <p className="text-xs text-slate-500">This estimate is not an order and does not reserve stock.</p>
  </section>;
}
