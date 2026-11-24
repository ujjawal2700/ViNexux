import { useEffect, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import NumberInput from '../ui/NumberInput';
import posService from '../../services/posService';
import { productLineKey } from '../../../../shared/productVariants.js';
import { getProductHsnCode } from '../../../../shared/productHsn.js';
const input = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm';
const money = value => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
export default function PosInvoiceItemsEditor({ items, onChange, billType, disabled }) {
  const [search, setSearch] = useState(''), [products, setProducts] = useState([]), [error, setError] = useState('');
  useEffect(() => {
    if (!search.trim()) return;
    let active = true;
    const timer = setTimeout(() => posService.products(search).then(result => { if (active) { setProducts(result); setError(''); } }).catch(() => { if (active) setError('Could not search products. Try again.'); }), 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search]);
  const patch = (index, changes) => onChange(items.map((item, i) => i === index ? { ...item, ...changes } : item));
  const add = product => {
    const key = productLineKey(product._id, product.variantId), existing = items.findIndex(item => productLineKey(item.productId, item.variantId) === key);
    if (existing >= 0) patch(existing, { quantity: Number(items[existing].quantity) + 1 });
    else onChange([...items, { productId: product._id, variantId: product.variantId || null, productName: product.name, sku: product.sku,
      variantName: product.variant || '', quantity: 1, unitPrice: billType === 'b2b' && product.dealerPrice > 0 ? product.dealerPrice : product.standardPrice,
      discountPercent: 0, gstRate: 18, hsn: getProductHsnCode(product), unit: 'NOS', serialNumbers: [] }]);
    setSearch(''); setProducts([]);
  };
  return <section aria-label="Invoice products" className="space-y-4">
    <div><h3 className="text-sm font-bold">Products & prices</h3><p className="mt-1 text-xs text-slate-500">Add or remove products, update quantities and rates. Saving adjusts stock by the quantity difference.</p></div>
    <label className="block text-xs font-semibold">Add product<div className="relative mt-1"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input aria-label="Add product" type="search" maxLength={150} disabled={disabled} className={`${input} pl-9`} placeholder="Search product, SKU or model" value={search} onChange={event => setSearch(event.target.value)} /></div></label>
    {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    {search.trim() && <div className="max-h-52 overflow-auto rounded-lg border">{products.map(product => <button type="button" disabled={disabled || product.stockQuantity < 1} key={productLineKey(product._id, product.variantId)} onClick={() => add(product)} className="flex w-full items-center justify-between gap-3 border-b p-3 text-left text-xs hover:bg-slate-50 disabled:opacity-50"><span><strong>{product.name}{product.variant ? ` · ${product.variant}` : ''}</strong><span className="mt-1 block text-slate-500">{product.sku} · {product.stockQuantity} in stock</span></span><Plus size={16} /></button>)}{!products.length && <p className="p-3 text-xs text-slate-500">No matching products.</p>}</div>}
    {items.map((item, index) => <article key={productLineKey(item.productId, item.variantId)} className="space-y-3 rounded-xl border border-slate-200 p-4">
      <div className="flex justify-between gap-3"><div><h4 className="text-xs font-bold">{item.productName}{item.variantName ? ` · ${item.variantName}` : ''}</h4><p className="mt-1 text-xs text-slate-500">{item.sku}</p></div><button type="button" aria-label={`Remove ${item.productName}`} disabled={disabled} onClick={() => onChange(items.filter((_, i) => i !== index))} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 size={15} /></button></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['quantity', 'Quantity', 1, 10000, 1], ['unitPrice', 'Unit price', 0, 100000000, 0.01], ['discountPercent', 'Discount %', 0, 100, 0.01], ['gstRate', 'GST %', 0, 100, 0.01]].map(([key, label, min, max, step]) => <label key={key} className="text-xs font-semibold">{label}<NumberInput aria-label={`${label} for ${item.productName}${item.variantName ? ` ${item.variantName}` : ''}`} required disabled={disabled} className={input} value={item[key]} min={min} max={max} step={step} onChange={event => patch(index, { [key]: event.target.value === '' ? '' : Number(event.target.value) })} /></label>)}</div>
      <div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold">HSN/SAC<input required disabled={disabled} className={input} maxLength={8} pattern="[0-9]{4,8}" value={item.hsn} onChange={event => patch(index, { hsn: event.target.value })} /></label><label className="text-xs font-semibold">Unit<input required disabled={disabled} className={input} maxLength={10} value={item.unit} onChange={event => patch(index, { unit: event.target.value })} /></label><label className="text-xs font-semibold">Serial numbers<input disabled={disabled} className={input} value={item.serialNumbers.join(', ')} onChange={event => patch(index, { serialNumbers: event.target.value.split(',').map(value => value.trim()).filter(Boolean) })} /></label></div>
      <p className="text-right text-xs text-slate-500">Before tax/discount: <strong>{money(Number(item.quantity) * Number(item.unitPrice))}</strong></p>
    </article>)}
    {!items.length && <p role="alert" className="text-xs text-rose-700">Add at least one product to this invoice.</p>}
  </section>;
}
