import React from 'react';
import NumberInput from '../ui/NumberInput';
import { Plus, Archive } from 'lucide-react';

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';
export default function ProductVariantsEditor({ value = [], onChange, disabled }) {
  const update = (index, patch) => onChange(value.map((row, i) => i === index ? { ...row, ...patch } : row));
  return <section className="space-y-4 rounded-xl border border-[#f0e6e8] p-5" aria-label="Product variants">
    <div className="flex flex-wrap items-start justify-between gap-3"><div>
      <h3 className="text-sm font-bold">Product variants</h3>
      <p className="mt-1 text-xs text-gray-500">Add lengths, sizes or other options. Each has separate prices and stock. Totals below are calculated automatically.</p>
    </div><button type="button" disabled={disabled || value.length >= 100} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold" onClick={() => onChange([...value, { _key: crypto.randomUUID(), name: '', sku: '', standardPrice: 0, dealerPrice: 0, stockQuantity: 0, isActive: true }])}><Plus size={14} />Add variant</button></div>
    {value.map((row, index) => <div key={row._id || row._key || index} className={`space-y-3 rounded-lg border p-4 ${row.isActive === false ? 'bg-gray-100 opacity-75' : 'bg-[#fdfbfb]'}`}>
      <div className="flex items-center justify-between gap-3"><label className="text-xs"><input type="checkbox" checked={row.isActive !== false} disabled={disabled} onChange={event => update(index, { isActive: event.target.checked })} /> Available to customers</label>
        <button type="button" disabled={disabled} className="inline-flex items-center gap-1 text-xs text-rose-700" onClick={() => row._id ? update(index, { isActive: false }) : onChange(value.filter((_, i) => i !== index))}><Archive size={13} />{row._id ? 'Archive' : 'Remove'}</button></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[['name', 'Option name', 'text', 'e.g. 5m'], ['sku', 'Variant SKU (optional)', 'text', 'e.g. CABLE-5M'], ['standardPrice', 'Retail price (₹)', 'number'], ['dealerPrice', 'Dealer price (₹)', 'number'], ['stockQuantity', 'Stock quantity', 'number']].map(([key, label, type, placeholder]) => { const Control = type === 'number' ? NumberInput : 'input'; return <label key={key} className="space-y-1 text-xs font-semibold"><span>{label}</span><Control className={inputClass} aria-label={`${label} ${index + 1}`} type={type} value={row[key] ?? ''} placeholder={placeholder} min={type === 'number' ? 0 : undefined} step={key === 'stockQuantity' ? 1 : type === 'number' ? '0.01' : undefined} disabled={disabled} maxLength={key === 'name' ? 100 : key === 'sku' ? 50 : undefined} onChange={event => update(index, { [key]: type === 'number' ? Number(event.target.value) : event.target.value })} /></label>; })}
      </div>
      {row.isActive === false && <p className="text-xs text-gray-500">Archived options stay linked to old invoices and returns.</p>}
    </div>)}
  </section>;
}
