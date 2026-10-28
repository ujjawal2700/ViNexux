import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function CategoryMultiSelect({ label, options, value, onChange }) {
  return <details className="relative min-w-0 rounded-lg border border-border bg-card">
    <summary aria-label={label} className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-semibold">
      <span>{label}{value.length ? ` (${value.length})` : ''}</span><ChevronDown size={14} />
    </summary>
    <div className="absolute left-0 top-full z-30 mt-1 w-72 max-w-[80vw] rounded-lg border border-border bg-card p-3 shadow-lg">
      <button type="button" onClick={() => onChange([])} disabled={!value.length} className="mb-2 text-xs text-primary disabled:opacity-50">Clear selection</button>
      <div role="group" aria-label={label} className="max-h-64 space-y-2 overflow-y-auto">
        {options.map(option => <label key={option._id} className="flex cursor-pointer items-start gap-2 text-xs">
          <input type="checkbox" checked={value.includes(option._id)} onChange={event => onChange(event.target.checked ? [...value, option._id] : value.filter(id => id !== option._id))} className="mt-0.5 accent-primary" />
          <span>{option.name}</span>
        </label>)}
        {!options.length && <p className="text-xs text-muted-foreground">No categories available.</p>}
      </div>
    </div>
  </details>;
}
