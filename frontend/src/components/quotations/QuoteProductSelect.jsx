import { useState } from 'react';
import { quoteMoney } from '../../../../shared/cctvQuote.js';
export default function QuoteProductSelect({ label, options, value = '', recommended, onChange, showPrices, emptyMessage, emptyLabel }) {
  const [search, setSearch] = useState('');
  const words = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = options.filter(item => words.every(word => `${item.name} ${item.modelNumber} ${item.sku} ${item.brand}`.toLowerCase().includes(word)));
  const current = options.find(item => item.key === value);
  const visible = current && !matches.some(item => item.key === current.key) ? [current, ...matches] : matches;
  return <div className="min-w-0 space-y-2">
    <label className="block text-sm font-semibold">Search {label.toLowerCase()}<input type="search" className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900" value={search} onChange={event => setSearch(event.target.value)} placeholder="Brand, name, model number or SKU" /></label>
    <label className="block text-sm font-semibold">{label}<select className="mt-1 w-full min-w-0 rounded-lg border bg-white px-3 py-3 text-sm text-slate-900" value={value} onChange={event => onChange(event.target.value)}><option value="">{options.length ? 'Choose a product' : emptyLabel || 'Our team will recommend a product'}</option>{visible.map(item => <option key={item.key} value={item.key}>{item.key === recommended?.key ? '★ Recommended — ' : ''}{item.name}{showPrices ? ` · ${quoteMoney(item.price)}` : ''}{item.stock <= 0 ? ' · Out of stock' : ''}</option>)}</select></label>
    {!options.length && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{emptyMessage || 'No compatible products are currently listed. Our team will confirm an alternative.'}</p>}
    {options.length > 0 && !recommended && <p className="text-xs text-amber-800">No automatic recommendation meets the requested quantity and pricing requirements. Choose a product for availability confirmation, or continue for assistance.</p>}
    {search && !matches.length && <p className="text-xs text-slate-600">No matching products. Try a different name or model number.</p>}
    {current && <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm">{current.image && <img src={current.image} alt="" className="h-14 w-14 shrink-0 rounded bg-white object-contain" />}<span className="min-w-0 break-words">{current.modelNumber && <span className="block text-xs text-slate-600">Model: {current.modelNumber}</span>}{showPrices && <strong>{quoteMoney(current.price)} per item + GST</strong>}{current.stock <= 0 && <span className="block text-amber-800">Availability needs confirmation</span>}</span></div>}
    {recommended && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"><span>★ Recommended: {recommended.name}</span>{value === recommended.key ? <strong>Selected</strong> : <button type="button" className="font-semibold underline" onClick={() => onChange(recommended.key)}>Use recommended</button>}</div>}
  </div>;
}
