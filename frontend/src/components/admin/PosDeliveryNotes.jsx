import Table from '../ui/Table';
import { posBillLabel } from '../../../../shared/posDocumentLabels.js';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Plus, Receipt, Search, Download } from 'lucide-react';
import posService from '../../services/posService';
const money = value => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-50';
export default function PosDeliveryNotes({ version, canInvoice, onNew, onView, onDownload, initialId, onConvert, busy, onEdit }) {
  const [data, setData] = useState({ sales: [], pages: 0, summary: {} }), [search, setSearch] = useState(''), [page, setPage] = useState(1);
  const [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
  const opened = useRef('');
  const [selected, setSelected] = useState(new Map());
  useEffect(() => { setSelected(new Map()); }, [version]);
  const eligible = note => !note.invoiceId && note.status === 'completed' && note.items?.some(item => item.quantity > (item.returnedQuantity || 0));
  const toggle = note => {
    if (selected.has(note._id)) { setSelected(previous => { const next = new Map(previous); next.delete(note._id); return next; }); return; }
    const first = [...selected.values()][0];
    if (first && (String(first.customerId) !== String(note.customerId) || first.customer.phone !== note.customer.phone || first.billType !== note.billType)) { setError('Select delivery notes for one customer or dealer and the same bill type only.'); return; }
    if (selected.size >= 50) { setError('Combine up to 50 delivery notes at a time.'); return; }
    setError(''); setSelected(previous => new Map(previous).set(note._id, note));
  };
  const selectCustomerNotes = () => {
    const first = [...selected.values()][0] || data.sales.find(eligible);
    if (!first) return;
    const next = new Map(selected);
    for (const note of data.sales) if (eligible(note) && String(note.customerId) === String(first.customerId) && note.customer.phone === first.customer.phone && note.billType === first.billType && next.size < 50) next.set(note._id, note);
    setSelected(next); setError('');
  };
  useEffect(() => {
    if (!initialId || opened.current === initialId) return;
    opened.current = initialId; onView({ _id: initialId, documentType: 'delivery-note' });
  }, [initialId]);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      posService.sales({ documentType: 'delivery-note', page, search, limit: 20 }).then(result => { if (active) { setData(result); setError(''); } }).catch(err => { if (active) setError(err.response?.data?.message || 'Could not load delivery notes.'); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [page, search, refresh, version]);
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card shadow-xs p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><Truck size={21} />Delivery notes</h2><p className="mt-2 max-w-3xl text-sm text-slate-500">Manage products given to customers or dealers, partial returns, receipts and credit dues. Convert the entire remaining note into a Tax Invoice.</p></div><button className={`${button} !bg-primary !text-white`} onClick={onNew}><Plus size={15} />New delivery note</button></div>
    <div className="grid gap-3 sm:grid-cols-3">{[['Open delivery-note credit due', data.summary?.balance], ['Net receipts on open notes', data.summary?.collected], ['Refunds due on open notes', data.summary?.refundsDue]].map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold">{money(value)}</p></div>)}</div>
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><label className="relative min-w-60 flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-600" /><input aria-label="Search delivery notes" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Note number, customer, phone, product or model" className="w-full rounded-lg border bg-white py-2 pl-10 pr-3 text-sm" /></label><button className={button} onClick={() => setRefresh(value => value + 1)}>Refresh</button>{canInvoice && <><button className={button} disabled={busy || !data.sales.some(eligible)} onClick={selectCustomerNotes}>Select customer’s notes on this page</button><button className={button} disabled={busy || !selected.size} onClick={() => onConvert([...selected.values()])}><Receipt size={15} />Create Tax Invoice ({selected.size})</button>{selected.size > 0 && <button className={button} disabled={busy} onClick={() => setSelected(new Map())}>Clear selection</button>}</>}</div>
      {error && <p role="alert" className="p-4 text-sm text-rose-700">{error}</p>}
      <div className="overflow-x-auto"><Table className="rounded-none border-0 shadow-none"><Table.Header><Table.Row>{[...(canInvoice ? ['Select'] : []), 'Delivery note / date', 'Customer / dealer', 'Value', 'Paid / outstanding', 'Status / actions'].map(label => <Table.Head key={label}>{label}</Table.Head>)}</Table.Row></Table.Header><Table.Body>{data.sales.map(note => <Table.Row key={note._id}>
        {canInvoice && <Table.Cell><input type="checkbox" aria-label={`Select ${note.deliveryNoteNumber || note.invoiceNumber}`} disabled={busy || !eligible(note)} checked={selected.has(note._id)} onChange={() => toggle(note)} /></Table.Cell>}
        <Table.Cell><p className="text-sm font-bold leading-6 text-foreground">{note.deliveryNoteNumber || note.invoiceNumber}</p><p className="mt-1 text-slate-600">{note.deliveryNoteDate || note.dispatchDetails?.date || new Date(note.createdAt).toLocaleDateString('en-IN')}</p>{note.dueDate && <p className="mt-1">Due {note.dueDate}</p>}</Table.Cell>
        <Table.Cell><p className="text-sm font-semibold text-foreground">{note.customer.name}</p><p className="mt-1 text-slate-600">{note.customer.phone} · {note.billType?.toUpperCase()}</p></Table.Cell>
        <Table.Cell>{money(note.total - (note.returnedAmount || 0))}</Table.Cell>
        <Table.Cell>{note.invoiceId ? <p className="text-blue-700">Balances follow the linked bill</p> : <><p>Paid {money(note.paidAmount)}</p><p className="mt-1 font-semibold text-amber-700">Due {money(note.balanceDue)}</p>{note.refundDue > 0 && <p className="mt-1 text-rose-700">Refund {money(note.refundDue)}</p>}</>}</Table.Cell>
        <Table.Cell><p className={`mb-2 font-semibold ${note.status === 'voided' ? 'text-rose-700' : 'text-emerald-700'}`}>{note.status === 'voided' ? 'Voided' : note.invoiceId ? `Converted to ${posBillLabel(note)}` : note.items?.every(item => item.quantity <= (item.returnedQuantity || 0)) ? 'Fully returned' : 'Open delivery note'}</p><div className="flex flex-wrap gap-2">{canInvoice && !note.invoiceId && note.status === 'completed' && note.items?.some(item => item.quantity > (item.returnedQuantity || 0)) && <button className={button} disabled={busy} onClick={() => onConvert(note)}><Receipt size={15} />Convert to bill</button>}<button className={button} onClick={() => onView(note)}>View note</button>{canInvoice && note.status === 'completed' && <button className={button} disabled={busy} onClick={() => onEdit(note)}>Edit note</button>}<button className={button} onClick={() => onDownload(note)}><Download size={13} />Download</button>{note.invoiceId && <Link className={button} to={`/admin/pos?invoice=${note.invoiceId}`}>View {posBillLabel(note)}</Link>}</div></Table.Cell>
      </Table.Row>)}</Table.Body></Table></div>{!data.sales.length && !error && <p className="p-8 text-center text-sm text-slate-500">No delivery notes found. Create a note to record products, payments and credit dues.</p>}<div className="flex items-center justify-between border-t p-4"><button className={button} disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><p className="text-xs text-slate-500">Page {page} of {data.pages || 1}</p><button className={button} disabled={page >= (data.pages || 1)} onClick={() => setPage(value => value + 1)}>Next</button></div>
    </div>
  </section>;
}
