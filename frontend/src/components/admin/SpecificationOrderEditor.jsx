import React, { useRef, useState } from 'react';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
export default function SpecificationOrderEditor({ specifications, onChange, disabled }) {
  const source = useRef(null);
  const [over, setOver] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const move = (from, to) => {
    if (disabled || from === null || from === to || to < 0 || to >= specifications.length) return;
    const next = [...specifications]; const [item] = next.splice(from, 1); next.splice(to, 0, item);
    onChange(next); setAnnouncement(`${item.key} moved to position ${to + 1}.`);
  };
  if (specifications.length < 2) return null;
  return <section aria-label="Specification display order" className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
    <div><h4 className="text-sm font-bold text-gray-900">Specification display order</h4><p className="mt-1 text-xs text-gray-600">Drag rows up or down, or use the arrow buttons. Save the product to apply the order.</p></div>
    <p role="status" className="sr-only">{announcement}</p>
    <ol className="space-y-2">{specifications.map((spec, index) => <li key={index} draggable={!disabled}
      aria-label={`${spec.key}: ${spec.value}`} tabIndex={disabled ? -1 : 0}
      onKeyDown={event => { if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); move(index, index + (event.key === 'ArrowUp' ? -1 : 1)); } }}
      onDragStart={event => { source.current = index; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(index)); }}
      onDragOver={event => { if (!disabled && source.current !== null) { event.preventDefault(); setOver(index); } }}
      onDragEnd={() => { source.current = null; setOver(null); }}
      onDrop={event => { event.preventDefault(); move(source.current, index); source.current = null; setOver(null); }}
      className={`flex items-center gap-2 rounded-lg border bg-white p-2 text-xs ${over === index ? 'border-primary' : 'border-gray-200'} ${disabled ? 'opacity-60' : 'cursor-grab'}`}>
      <GripVertical size={16} className="shrink-0 text-gray-600" /><span className="min-w-0 flex-1"><strong>{spec.key}</strong><span className="ml-2 break-words text-gray-600">{spec.value}</span></span>
      <button type="button" aria-label={`Move ${spec.key} up`} disabled={disabled || index === 0} onClick={() => move(index, index - 1)} className="rounded border p-1 disabled:opacity-30"><ChevronUp size={16} /></button>
      <button type="button" aria-label={`Move ${spec.key} down`} disabled={disabled || index === specifications.length - 1} onClick={() => move(index, index + 1)} className="rounded border p-1 disabled:opacity-30"><ChevronDown size={16} /></button>
    </li>)}</ol>
  </section>;
}
