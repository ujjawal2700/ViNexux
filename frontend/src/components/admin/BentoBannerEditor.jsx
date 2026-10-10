import React, { useEffect, useState } from 'react';
import apiClient from '../../api/axios';
import { Upload, RefreshCw, Trash2, Crop } from 'lucide-react';
import BannerArtworkDialog, { BentoGridPreview } from './BannerArtworkDialog';
import { bannerFramingStyle, BENTO_TRANSITIONS, BENTO_TRANSITION_LABELS } from '../../../../shared/bannerGrid';

function ImageSettings({ image, disabled, onSave, onRemove, onReplace, onAdjust }) {
  const [title, setTitle] = useState(image.title || '');
  const [link, setLink] = useState(image.link || '');
  const [fit, setFit] = useState(image.fit || 'cover');
  return <div className="rounded-lg border border-gray-200 p-3 space-y-2">
    <div className="h-28 overflow-hidden rounded-md bg-gray-50"><img src={image.url} alt={image.title || 'Section banner preview'} className="h-full w-full" style={bannerFramingStyle({ ...image, fit })} /></div>
    <button type="button" disabled={disabled} className="inline-flex items-center gap-1 text-xs font-semibold text-primary" onClick={() => onAdjust({ title, link, fit, positionX: image.positionX ?? 50, positionY: image.positionY ?? 50, zoom: image.zoom ?? 1 })}><Crop size={14} />Preview / crop & adjust</button>
    <label className="block text-xs">Optional caption<input aria-label="Banner caption" className="mt-1 w-full rounded border px-2 py-1.5" maxLength={150} value={title} onChange={e => setTitle(e.target.value)} disabled={disabled} /></label>
    <label className="block text-xs">Destination link<input aria-label="Banner destination" placeholder="/products or https://…" className="mt-1 w-full rounded border px-2 py-1.5" maxLength={2000} value={link} onChange={e => setLink(e.target.value)} disabled={disabled} /></label>
<label className="block text-xs">Image fit<select aria-label="Banner image fit" className="mt-1 w-full min-w-0 rounded border px-2 py-1" value={fit} onChange={e => setFit(e.target.value)} disabled={disabled}><option value="cover">Fill tile (crop edges)</option><option value="contain">Show entire image</option></select></label>
    <div className="flex flex-wrap gap-3 text-xs"><button type="button" disabled={disabled} className="font-semibold text-primary" onClick={() => onSave({ title, link, fit, positionX: image.positionX ?? 50, positionY: image.positionY ?? 50, zoom: image.zoom ?? 1 })}>Save banner details</button><label className={`inline-flex cursor-pointer items-center gap-1 ${disabled ? 'opacity-50' : ''}`}><Upload size={12} />Replace image<input aria-label="Replace banner image" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} onChange={e => { onReplace(e.target.files, { title, link, fit, positionX: image.positionX ?? 50, positionY: image.positionY ?? 50, zoom: image.zoom ?? 1 }); e.target.value = ''; }} /></label><button type="button" aria-label="Remove banner image" disabled={disabled} className="text-red-700" onClick={onRemove}><Trash2 size={14} /></button></div>
  </div>;
}
export default function BentoBannerEditor() {
  const [grid, setGrid] = useState(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [staging, setStaging] = useState(null);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  useEffect(() => () => { for (const item of staging?.items || []) if (item.file) URL.revokeObjectURL(item.url); }, [staging]);
  const load = async () => {
    setBusy(true); setError('');
    try { const response = await apiClient.get('/admin/cms/banner-grid'); setGrid(response.data.data.grid); }
    catch (err) { setError(err.response?.data?.message || 'Unable to load the four banner sections.'); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    let cancelled = false;
    apiClient.get('/admin/cms/banner-grid')
      .then(response => { if (!cancelled) setGrid(response.data.data.grid); })
      .catch(err => { if (!cancelled) setError(err.response?.data?.message || 'Unable to load the four banner sections.'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, []);
  const mutate = async operation => {
    setBusy(true); setError(''); setMessage('');
    try { const next = await operation(); setGrid(next); setMessage('Homepage banner grid updated.'); return true; }
    catch (err) { setError(err.response?.data?.message || err.message || 'Unable to update banner grid. Refresh and try again.'); return false; }
    finally { setBusy(false); }
  };
  const upload = (section, fileList, image, details = {}) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const remaining = 3 - grid.sections[section].images.length;
    if ((!image && files.length > remaining) || files.some(f => f.size > 5 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(f.type))) {
      setError(`Choose up to ${image ? 1 : remaining} PNG, JPG or WebP images, each under 5 MB.`); return;
    }
    setError('');
    setStaging({ section, image, items: files.map(file => ({ file, url: URL.createObjectURL(file), details })) });
  };
  const confirmArtwork = async drafts => {
    const target = staging;
    let completed = 0;
    const succeeded = await mutate(async () => {
      if (target.existing) {
        const response = await apiClient.put(`/admin/cms/banner-grid/${target.section}/images/${target.image._id}`, { ...drafts[0], revision: grid.revision });
        return response.data.data.grid;
      }
      let current = grid;
      for (const [index, item] of target.items.entries()) {
        const form = new FormData(); form.append('file', item.file); form.append('revision', current.revision);
        for (const [key, value] of Object.entries(drafts[index])) form.append(key, value);
        const response = await apiClient.post(`/admin/cms/banner-grid/${target.section}/images${target.image ? `/${target.image._id}` : ''}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        current = response.data.data.grid;
        completed++;
        setGrid(current);
      }
      return current;
    });
    if (succeeded) setStaging(null);
    else if (completed) setStaging({ ...target, items: target.items.slice(completed).map((item, i) => ({ ...item, url: URL.createObjectURL(item.file), details: drafts[completed + i] })) });
  };
  return <section className="mb-8 rounded-xl border border-gray-200 bg-white p-4 sm:p-6" aria-label="Bento banner management">
    <div className="mb-4 flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">Homepage bento grid</h2><p className="mt-1 text-sm text-gray-500">Four sections · up to 3 images per section · independent autoplay. Changes save directly to the homepage.</p><p className="mt-1 text-xs text-gray-500">Desktop: large left tile, two stacked middle tiles, tall right tile. Mobile: balanced 2 × 2 grid. Use landscape artwork for section 1, wide artwork for 2–3, portrait artwork for 4; choose “Show entire image” to avoid cropping.</p></div><button type="button" disabled={busy} className="inline-flex items-center gap-2 self-start rounded-lg border px-3 py-2 text-sm" onClick={load}><RefreshCw size={16} />Refresh grid</button></div>
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="mb-4 text-sm text-green-700">{message}</p>}
{grid && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{grid.sections.map((section, i) => <div role="group" key={i} className="min-w-0 space-y-3 rounded-xl border bg-gray-50/50 p-3" aria-label={`Manage banner section ${i + 1}`}><div className="flex justify-between text-sm font-semibold"><h3>Section {i + 1}</h3><span>{section.images.length}/3 images</span></div><label className="block text-xs font-medium">Transition effect<select aria-label={`Transition effect for section ${i + 1}`} className="mt-1 w-full rounded border px-2 py-2 text-sm" value={section.transition || 'fade'} disabled={busy} onChange={e => { const transition = e.target.value; mutate(async () => { const response = await apiClient.put(`/admin/cms/banner-grid/${i}`, { transition, revision: grid.revision }); return response.data.data.grid; }); }}>{BENTO_TRANSITIONS.map((value, index) => <option key={value} value={value}>{BENTO_TRANSITION_LABELS[index]}</option>)}</select></label>{section.images.map(image => <ImageSettings key={JSON.stringify([image._id, image.url, image.title, image.link, image.fit, image.positionX, image.positionY, image.zoom])} image={image} disabled={busy} onAdjust={details => { setError(''); setStaging({ section: i, image, existing: true, items: [{ url: image.url, details }] }); }} onReplace={(files, details) => upload(i, files, image, details)} onSave={details => mutate(async () => { const response = await apiClient.put(`/admin/cms/banner-grid/${i}/images/${image._id}`, { ...details, revision: grid.revision }); return response.data.data.grid; })} onRemove={() => { if (window.confirm('Remove this image from the section? The original file will be retained.')) mutate(async () => { const response = await apiClient.delete(`/admin/cms/banner-grid/${i}/images/${image._id}`, { data: { revision: grid.revision } }); return response.data.data.grid; }); }} />)}<label className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm font-medium ${busy || section.images.length === 3 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer text-primary'}`}><Upload size={16} />{section.images.length === 3 ? 'Section full' : 'Upload images'}<input aria-label={`Upload images for section ${i + 1}`} type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy || section.images.length === 3} className="sr-only" onChange={e => { upload(i, e.target.files); e.target.value = ''; }} /></label></div>)}</div>}
    {grid && <details className="mt-5"><summary className="cursor-pointer font-semibold text-primary">Preview homepage grid</summary><div className="my-3 flex gap-2">{['desktop', 'tablet', 'mobile'].map(device => <button type="button" key={device} aria-pressed={previewDevice === device} className="rounded border px-3 py-2 text-sm capitalize" onClick={() => setPreviewDevice(device)}>{device} layout</button>)}</div><BentoGridPreview grid={grid} device={previewDevice} /></details>}
    {staging && <BannerArtworkDialog key={staging.items[0].url} staging={staging} grid={grid} busy={busy} error={error} onClose={() => setStaging(null)} onConfirm={confirmArtwork} />}
    {!grid && !error && <p className="text-sm text-gray-500">Loading banner sections…</p>}
    {grid && !grid.configured && <p className="mt-4 text-xs text-gray-500">Empty sections show collection links until you add artwork. Each section uses only the images assigned to that section.</p>}
  </section>;
}
