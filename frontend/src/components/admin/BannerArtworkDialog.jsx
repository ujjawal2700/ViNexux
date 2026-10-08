import React, { useRef, useState } from 'react';
import Modal from '../ui/Modal';
import { bannerFramingStyle } from '../../../../shared/bannerGrid';
import { themeVariables } from '../../../../shared/seasonalThemes';
import { useSeasonalTheme } from '../../hooks/useSeasonalTheme';

export function BentoGridPreview({ grid, section, candidate, device = 'desktop', onDragStart, onDragMove, onDragEnd }) {
  const { theme } = useSeasonalTheme();
  const desktop = device === 'desktop';
  return <div style={themeVariables(theme.config)} className="mx-auto w-full" data-testid="bento-artwork-preview">
    <div className="grid gap-2" style={{ maxWidth: device === 'mobile' ? 390 : device === 'tablet' ? 640 : undefined, margin: 'auto', gridTemplateColumns: desktop ? '2fr 1fr 1fr' : '1fr 1fr', gridTemplateRows: '1fr 1fr', aspectRatio: desktop ? '3.5' : '4 / 3' }}>
      {Array.from({ length: 4 }, (_, i) => {
        const image = i === section && candidate ? candidate : grid.sections[i]?.images[0];
        return <div key={i} className="relative min-h-0 min-w-0 overflow-hidden rounded-lg border bg-[var(--store-surface)]" data-preview-section={i + 1} style={{ ...(desktop && i === 0 ? { gridRow: 'span 2' } : {}), ...(desktop && i === 1 ? { gridColumn: 2, gridRow: 1 } : {}), ...(desktop && i === 2 ? { gridColumn: 2, gridRow: 2 } : {}), ...(desktop && i === 3 ? { gridColumn: 3, gridRow: '1 / span 2' } : {}), borderColor: i === section ? 'var(--store-primary)' : 'var(--store-border)', outline: i === section ? '2px solid var(--store-primary)' : undefined, touchAction: i === section && onDragStart ? 'none' : undefined, cursor: i === section && onDragStart ? 'grab' : undefined }} onPointerDown={i === section ? onDragStart : undefined} onPointerMove={i === section ? onDragMove : undefined} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
          {image?.url ? <img src={image.url} alt={`Section ${i + 1} crop preview`} draggable={false} className="absolute inset-0 h-full w-full pointer-events-none" style={bannerFramingStyle(image)} /> : <div className="flex h-full items-center justify-center text-xs text-[var(--store-muted)]">Section {i + 1}</div>}
          {image?.title && <span className="absolute bottom-2 left-2 max-w-[90%] truncate rounded bg-[var(--store-surface)] px-2 py-1 text-xs text-[var(--store-text)]">{image.title}</span>}
        </div>;
      })}
    </div>
  </div>;
}

export default function BannerArtworkDialog({ staging, grid, busy, error, onClose, onConfirm }) {
  const [drafts, setDrafts] = useState(() => staging.items.map(item => ({ fit: 'cover', positionX: 50, positionY: 50, zoom: 1, ...item.details })));
  const [index, setIndex] = useState(0);
  const [device, setDevice] = useState('desktop');
  const drag = useRef(null);
  const frame = drafts[index];
  const change = patch => setDrafts(previous => previous.map((d, i) => i === index ? { ...d, ...patch } : d));
  const candidate = { url: staging.items[index].url, ...frame };
  return <Modal isOpen onClose={() => { if (!busy) onClose(); }} size="xl" closeOnOutsideClick={false} title={`Preview, crop & adjust — section ${staging.section + 1}`} description="Adjust the visible crop without destroying your original image. Check all device previews before saving." footer={<><button type="button" className="rounded-lg border px-4 py-2" disabled={busy} onClick={onClose}>Cancel</button><button type="button" className="rounded-lg bg-primary px-4 py-2 font-semibold text-white" disabled={busy} onClick={() => onConfirm(drafts)}>{busy ? 'Saving…' : staging.existing ? 'Save crop & adjustments' : `Upload ${drafts.length} banner${drafts.length === 1 ? '' : 's'}`}</button></>}>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
<div className="flex flex-wrap gap-2">{staging.items.map((item, i) => <button type="button" key={i} aria-pressed={i === index} disabled={busy} className={`max-w-full break-all rounded-lg border px-3 py-2 text-xs ${i === index ? 'border-primary font-bold text-primary' : ''}`} onClick={() => setIndex(i)}>Image {i + 1}{item.file ? ` · ${item.file.name}` : ''}</button>)}</div>
<div className="flex flex-wrap gap-2">{['desktop', 'tablet', 'mobile'].map(view => <button type="button" key={view} aria-pressed={device === view} className={`rounded-lg border px-3 py-2 text-sm capitalize ${device === view ? 'bg-primary text-white' : ''}`} onClick={() => setDevice(view)}>{view[0].toUpperCase() + view.slice(1)} preview</button>)}</div>
    <BentoGridPreview grid={grid} section={staging.section} candidate={candidate} device={device} onDragStart={event => { if (busy || event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); const box = event.currentTarget.getBoundingClientRect(); drag.current = { x: event.clientX, y: event.clientY, width: box.width, height: box.height, frame }; }} onDragMove={event => { if (!drag.current) return; const d = drag.current; change({ positionX: Math.max(0, Math.min(100, d.frame.positionX - (event.clientX - d.x) / d.width * 100)), positionY: Math.max(0, Math.min(100, d.frame.positionY - (event.clientY - d.y) / d.height * 100)) }); }} onDragEnd={() => { drag.current = null; }} />
    <p className="text-xs text-gray-500">Drag the highlighted banner to reposition it, or use the sliders. The same framing is used on all devices; tile proportions change on mobile.</p>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Crop mode<select aria-label="Crop mode" value={frame.fit} className="mt-1 block w-full rounded-lg border px-3 py-2" onChange={e => change({ fit: e.target.value })}><option value="cover">Fill tile / crop edges</option><option value="contain">Fit entire artwork</option></select></label>
      {[['zoom', 'Zoom', 1, 3, .05], ['positionX', 'Horizontal position', 0, 100, 1], ['positionY', 'Vertical position', 0, 100, 1]].map(([key, label, min, max, step]) => <label key={key} className="text-sm"><span className="flex justify-between">{label}<span>{key === 'zoom' ? `${Number(frame[key]).toFixed(2)}×` : `${Math.round(frame[key])}%`}</span></span><input aria-label={label} type="range" min={min} max={max} step={step} className="mt-2 w-full accent-[#800020]" value={frame[key]} onChange={e => change({ [key]: Number(e.target.value) })} /></label>)}
      <button type="button" className="w-fit text-sm font-semibold text-primary underline" onClick={() => change({ fit: 'cover', positionX: 50, positionY: 50, zoom: 1 })}>Reset crop</button>
    </fieldset>
    <details><summary className="cursor-pointer text-sm">View original image</summary><img src={staging.items[index].url} alt="Original banner before cropping" className="mt-3 max-h-72 w-full object-contain" /></details>
  </Modal>;
}
