import React, { useEffect, useRef, useState } from 'react';
import { PRODUCT_IMAGE_ACCEPT, getProductImageMimeType } from '../../../../shared/productImageTypes.js';
import NumberInput from '../ui/NumberInput';
import { Plus, Archive, X, ChevronLeft, ChevronRight } from 'lucide-react';

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';
export default function ProductVariantsEditor({ value = [], onChange, disabled, specifications = [] }) {
  const [mediaError, setMediaError] = useState('');
  const previews = useRef(new Set());
  useEffect(() => () => { previews.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  const release = image => { if (image.previewUrl) { URL.revokeObjectURL(image.previewUrl); previews.current.delete(image.previewUrl); } };
  const selectImages = (index, files) => {
    if ((value[index].images?.length || 0) + files.length > 30 || files.length > 30) { setMediaError('Use up to 30 images per variant.'); return; }
    if (files.some(file => !getProductImageMimeType(file.name, file.type) || file.size > 5 * 1024 * 1024)) { setMediaError('Choose JPG, PNG, WebP or SVG files, up to 5 MB each.'); return; }
    const images = files.map(file => { const url = URL.createObjectURL(file); previews.current.add(url); return { file, previewUrl: url, url, altText: value[index].name || 'Variant image' }; });
    setMediaError(''); update(index, { images: [...(value[index].images || []), ...images] });
  };
  const moveImage = (index, imageIndex, direction) => {
    const images = [...value[index].images]; const next = imageIndex + direction;
    [images[imageIndex], images[next]] = [images[next], images[imageIndex]];
    update(index, { images });
  };
  const update = (index, patch) => onChange(value.map((row, i) => i === index ? { ...row, ...patch } : row));
  return <section className="space-y-4 rounded-xl border border-[#f0e6e8] p-5" aria-label="Product variants">
    <div className="flex flex-wrap items-start justify-between gap-3"><div>
      <h3 className="text-sm font-bold">Product variants</h3>
      <p className="mt-1 text-xs text-gray-500">Add lengths, sizes or other options. Each has separate prices and stock, with optional model details, images and specification overrides. Empty overrides use the main product details.</p>
    </div><button type="button" disabled={disabled || value.length >= 100} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold" onClick={() => onChange([...value, { _key: crypto.randomUUID(), name: '', sku: '', standardPrice: 0, dealerPrice: 0, stockQuantity: 0, isActive: true, modelNumber: '', model: '', images: [], specifications: [] }])}><Plus size={14} />Add variant</button></div>
    {mediaError && <p role="alert" className="text-sm text-rose-700">{mediaError}</p>}
    {value.map((row, index) => <div key={row._id || row._key || index} className={`space-y-3 rounded-lg border p-4 ${row.isActive === false ? 'bg-gray-100 opacity-75' : 'bg-[#fdfbfb]'}`}>
      <div className="flex items-center justify-between gap-3"><label className="text-xs"><input type="checkbox" checked={row.isActive !== false} disabled={disabled} onChange={event => update(index, { isActive: event.target.checked })} /> Available to customers</label>
        <button type="button" disabled={disabled} className="inline-flex items-center gap-1 text-xs text-rose-700" onClick={() => row._id ? update(index, { isActive: false }) : onChange(value.filter((_, i) => i !== index))}><Archive size={13} />{row._id ? 'Archive' : 'Remove'}</button></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[['name', 'Option name', 'text', 'e.g. 5m'], ['sku', 'Variant SKU (optional)', 'text', 'e.g. CABLE-5M'], ['modelNumber', 'Model number override (optional)', 'text', 'Use main model number'], ['model', 'Model name override (optional)', 'text', 'Use main model name'], ['standardPrice', 'Retail price (₹)', 'number'], ['dealerPrice', 'Dealer price (₹)', 'number'], ['stockQuantity', 'Stock quantity', 'number']].map(([key, label, type, placeholder]) => { const Control = type === 'number' ? NumberInput : 'input'; return <label key={key} className="space-y-1 text-xs font-semibold"><span>{label}</span><Control className={inputClass} aria-label={`${label} ${index + 1}`} type={type} value={row[key] ?? ''} placeholder={placeholder} min={type === 'number' ? 0 : undefined} step={key === 'stockQuantity' ? 1 : type === 'number' ? '0.01' : undefined} disabled={disabled} maxLength={['name', 'modelNumber', 'model'].includes(key) ? 100 : key === 'sku' ? 50 : undefined} onChange={event => update(index, { [key]: type === 'number' ? Number(event.target.value) : event.target.value })} /></label>; })}
      </div>
      <div className="space-y-3 border-t pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold">Variant images</h4>
          {(row.images || []).length > 0 && <button type="button" disabled={disabled} className="text-xs font-semibold text-primary underline" onClick={() => { row.images.forEach(release); update(index, { images: [] }); }}>Use main product images</button>}
        </div>
        <p className="text-xs text-slate-600">No variant images means the main gallery is used. The first image is this variant’s primary photo. Uploads are saved when you save the product.</p>
        <input type="file" multiple accept={PRODUCT_IMAGE_ACCEPT} aria-label={`Variant images ${index + 1}`} disabled={disabled} className="block w-full min-w-0 text-xs file:mr-3 file:rounded-lg file:border file:bg-white file:px-3 file:py-2" onChange={event => { selectImages(index, Array.from(event.target.files || [])); event.target.value = ''; }} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{(row.images || []).map((image, imageIndex) => <div key={image.publicId || image.url} className="space-y-2 rounded-lg border bg-white p-2">
          <img src={image.previewUrl || image.url} alt={`Variant ${index + 1} photo ${imageIndex + 1}`} className="aspect-square w-full object-contain" />
          <div className="flex items-center justify-between gap-1">
            <button type="button" disabled={disabled || imageIndex === 0} aria-label={`Move variant ${index + 1} photo ${imageIndex + 1} earlier`} onClick={() => moveImage(index, imageIndex, -1)} className="rounded border p-1 disabled:opacity-30"><ChevronLeft size={16} /></button>
            <button type="button" disabled={disabled} aria-label={`Remove variant ${index + 1} photo ${imageIndex + 1}`} onClick={() => { release(image); update(index, { images: row.images.filter((_, i) => i !== imageIndex) }); }} className="rounded border p-1 text-rose-700"><X size={16} /></button>
            <button type="button" disabled={disabled || imageIndex === row.images.length - 1} aria-label={`Move variant ${index + 1} photo ${imageIndex + 1} later`} onClick={() => moveImage(index, imageIndex, 1)} className="rounded border p-1 disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>)}</div>
      </div>
      <div className="space-y-3 border-t pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold">Specification overrides</h4><button type="button" disabled={disabled || (row.specifications || []).length >= 100} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold" onClick={() => update(index, { specifications: [...(row.specifications || []), { key: '', value: '' }] })}>Add override {index + 1}</button></div>
        <p className="text-xs text-slate-600">Enter only the specifications that change. Matching names replace the main value; new names add a specification. Everything else is inherited.</p>
        <datalist id={`variant-spec-keys-${index}`}>{specifications.map(spec => <option key={spec.key} value={spec.key} />)}</datalist>
        {(row.specifications || []).map((spec, specIndex) => <div key={specIndex} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2">
          <input aria-label={`Variant ${index + 1} specification ${specIndex + 1} name`} list={`variant-spec-keys-${index}`} className={inputClass} placeholder="e.g. Resolution" maxLength={100} value={spec.key} disabled={disabled} onChange={event => update(index, { specifications: row.specifications.map((item, i) => i === specIndex ? { ...item, key: event.target.value } : item) })} />
          <textarea aria-label={`Variant ${index + 1} specification ${specIndex + 1} value`} className={inputClass} placeholder="e.g. 4MP" maxLength={2000} rows={2} value={spec.value} disabled={disabled} onChange={event => update(index, { specifications: row.specifications.map((item, i) => i === specIndex ? { ...item, value: event.target.value } : item) })} />
          <button type="button" aria-label={`Remove variant ${index + 1} specification ${specIndex + 1}`} className="rounded border p-2 text-rose-700" disabled={disabled} onClick={() => update(index, { specifications: row.specifications.filter((_, i) => i !== specIndex) })}><X size={16} /></button>
        </div>)}
      </div>
      {row.isActive === false && <p className="text-xs text-gray-500">Archived options stay linked to old invoices and returns.</p>}
    </div>)}
  </section>;
}
