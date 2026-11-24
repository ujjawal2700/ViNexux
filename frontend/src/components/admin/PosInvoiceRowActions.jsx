import { Eye, Pencil, Download, Share2 } from 'lucide-react';
export default function PosInvoiceRowActions({ invoice, busy, canEdit, onView, onEdit, onDownload, onShare }) {
  const actions = [
    ['View invoice', 'View', Eye, onView],
    ...(canEdit ? [['Edit invoice', 'Edit', Pencil, onEdit]] : []),
    ['Download invoice', 'Download', Download, onDownload],
    ['Share invoice', 'Share', Share2, onShare],
  ];
  return <div aria-label={`Actions for ${invoice.invoiceNumber}`} className="grid min-w-44 grid-cols-2 gap-1.5">
    {actions.map(([label, text, Icon, handler]) => <button key={label} type="button" aria-label={label} title={`${label} · ${invoice.invoiceNumber}`} disabled={busy || label === 'Edit invoice' && invoice.status === 'voided'} onClick={() => handler(invoice)}
      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"><Icon size={14} className="shrink-0" />{text}</button>)}
  </div>;
}
