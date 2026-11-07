import { auditRequestParams } from '../../../../shared/auditFilters.js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, MapPin, Search, ChevronRight, RefreshCw, Clock3, Download } from 'lucide-react';
import apiClient from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { ADMIN_SECTIONS } from '../../../../shared/adminAccess.js';
import { presentAuditLog, auditDateTime } from '../../../../shared/auditPresentation.js';

const dateTime = auditDateTime;
const input = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary';
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50';
const emptyFilters = { search: '', section: '', from: '', to: '', startTime: '', endTime: '', status: '' };
function Location({ location, detailed = false }) {
  if (location?.status !== 'available') return <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin size={13} />Location {location?.status || 'unavailable'}</span>;
  return <span className="inline-flex flex-wrap items-center gap-1 text-muted-foreground"><MapPin size={13} />
    <a className="text-primary underline underline-offset-2" href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`} target="_blank" rel="noopener noreferrer">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</a>
    {detailed && <span> · ±{Math.round(location.accuracy)} m · captured {dateTime(location.capturedAt)} · browser-reported</span>}
  </span>;
}
export default function AdminLogbookPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ logs: [], total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const sequence = useRef(0);
  const invalidate = useCallback(() => { sequence.current++; }, []);
  const update = patch => { sequence.current++; setLoading(true); setPage(1); setFilters(old => ({ ...old, ...patch })); };
  const load = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true); setError('');
    try {
      const response = await apiClient.get('/admin/access/logs', { params: auditRequestParams(filters, page) });
      if (current === sequence.current) setResult(response.data.data);
    } catch (err) { if (current === sequence.current) setError(err.response?.data?.message || err.message || 'Unable to load the logbook.'); }
    finally { if (current === sequence.current) setLoading(false); }
  }, [filters, page]);
  useEffect(() => { const timer = setTimeout(load, 250); return () => { clearTimeout(timer); invalidate(); }; }, [load, invalidate]);
  const open = async log => {
    if (detailLoading) return;
    const id = typeof log._id === 'string' ? log._id : log._id?.$oid;
    if (!/^[a-f\d]{24}$/i.test(id || '')) { setError('This entry has an invalid identifier. Refresh the logbook and try again.'); return; }
    setDetailLoading(true); setError('');
    try { const response = await apiClient.get(`/admin/access/logs/${id}`); setDetail(response.data.data.log); }
    catch (err) { setError(err.response?.data?.message || 'Unable to open this entry.'); }
    finally { setDetailLoading(false); }
  };
  const download = async format => {
    setExporting(format); setError('');
    try {
      const response = await apiClient.get('/admin/access/logs/export', { params: { ...auditRequestParams(filters), format }, responseType: 'blob' });
      const url = URL.createObjectURL(response.data), anchor = document.createElement('a');
      anchor.href = url; anchor.download = `vinexus-logbook-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      let message = err.response?.data?.message || err.message;
      if (err.response?.data instanceof Blob) { try { message = JSON.parse(await err.response.data.text()).message; } catch { /* Keep the network error. */ } }
      setError(message || 'Unable to export the report. Please retry.');
    } finally { setExporting(''); }
  };
  const detailView = detail ? presentAuditLog(detail) : null;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Super admin workspace</p><h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">The change logbook</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">See who changed each product or business record, what changed, and its previous and new values. All times are shown in IST. Logs older than 30 days are automatically deleted.</p></div><button className={button} disabled={loading} onClick={load}><RefreshCw size={15} />Refresh</button></div>
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-semibold">Find a change<div className="relative mt-1"><Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" /><input className={`${input} pl-9`} placeholder="Person, product, model, SKU or account" value={filters.search} onChange={e => update({ search: e.target.value })} /></div></label>
        <label className="text-xs font-semibold">Section<select className={`${input} mt-1`} value={filters.section} onChange={e => update({ section: e.target.value })}><option value="">All sections</option>{ADMIN_SECTIONS.map(section => <option key={section.key} value={section.key}>{section.label}</option>)}<option value="enquiries">Enquiries (shared actions)</option><option value="access">Team & roles</option><option value="auth">Profile & authentication</option><option value="profile">Admin profile</option></select></label>
        <label className="text-xs font-semibold">From date (IST)<input type="date" className={`${input} mt-1`} value={filters.from} max={filters.to || undefined} onChange={e => update({ from: e.target.value })} /></label>
        <label className="text-xs font-semibold">To date (IST)<input type="date" className={`${input} mt-1`} value={filters.to} min={filters.from || undefined} onChange={e => update({ to: e.target.value })} /></label>
        <label className="text-xs font-semibold">Time from (IST)<input type="time" className={`${input} mt-1`} value={filters.startTime} onChange={e => update({ startTime: e.target.value })} /></label>
        <label className="text-xs font-semibold">Time to (IST)<input type="time" className={`${input} mt-1`} value={filters.endTime} onChange={e => update({ endTime: e.target.value })} /></label>
        <label className="text-xs font-semibold">Result<select className={`${input} mt-1`} value={filters.status} onChange={e => update({ status: e.target.value })}><option value="">All results</option><option value="applied">Saved</option><option value="pending">In progress</option><option value="failed">Not saved</option></select></label>
        <div className="flex items-end"><button className={button} onClick={() => { sequence.current++; setLoading(true); setFilters(emptyFilters); setPage(1); }}>Clear filters</button></div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">The time window applies to each selected day. For noon to 6 PM, choose 12:00 and 18:00. Leave dates empty to search every day. Overnight windows are supported.</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground"><span>{result.total.toLocaleString('en-IN')} matching entries · newest first</span><div className="flex flex-wrap gap-2"><button className={button} disabled={loading || !!exporting} onClick={() => download('pdf')}><Download size={14} />{exporting === 'pdf' ? 'Preparing PDF…' : 'Export PDF'}</button><button className={button} disabled={loading || !!exporting} onClick={() => download('xlsx')}><Download size={14} />{exporting === 'xlsx' ? 'Preparing Excel…' : 'Export Excel'}</button></div></div>
      <p className="mt-2 text-xs text-muted-foreground">Exports include all matching entries across pages, up to 1,000 entries per report. Use filters for larger reports. Passwords and sign-in secrets stay hidden.</p>
    </div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {loading ? <p role="status" className="p-5 text-sm text-muted-foreground">Loading changes…</p> : !result.logs.length ? <div className="rounded-xl border border-dashed bg-card p-12 text-center"><BookOpen size={32} className="mx-auto text-primary/50" /><h2 className="mt-3 font-bold">No matching changes</h2><p className="mt-2 text-sm text-muted-foreground">Try a different date, time window or search.</p></div> : <div className="space-y-3">{result.logs.map(log => {
      const view = presentAuditLog(log);
      return <article key={log._id} role="button" tabIndex={0} aria-label={`Inspect ${view.summary} by ${view.actor}`} aria-busy={detailLoading} onClick={() => open(log)} onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); open(log); } }} className="cursor-pointer rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1"><h2 className="line-clamp-1 text-sm font-bold">{view.actor}</h2><p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{view.role} · {view.section}</p><p className="mt-2 line-clamp-2 break-words text-sm text-primary">{view.summary}</p></div>
          <div className="space-y-2 text-right text-xs text-muted-foreground"><p className="inline-flex items-center gap-1"><Clock3 size={12} />{view.time}</p><p>{view.recordCount ?? view.records.length} record(s) · {view.status}</p><button className="inline-flex items-center gap-1 font-semibold text-primary" disabled={detailLoading} onClick={event => { event.stopPropagation(); open(log); }}>Inspect changes <ChevronRight size={15} /></button></div>
        </div>
      </article>;
    })}</div>}
    {result.pages > 1 && <div className="flex items-center justify-between"><button className={button} disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</button><span className="text-sm">Page {page} of {result.pages}</span><button className={button} disabled={page >= result.pages || loading} onClick={() => setPage(p => p + 1)}>Next</button></div>}
    <Modal isOpen={!!detail} onClose={() => setDetail(null)} size="xl" title="Change details" description={detailView ? `${detailView.actor} · ${detailView.time}` : ''}>
      {detailView && <div className="space-y-5"><div className="space-y-2 text-sm"><p className="font-bold">{detailView.summary}</p><p>{detailView.email} · {detailView.role}</p><p>{detailView.section} · {detailView.status}</p><Location location={detail.location} detailed /></div>
        {detailView.records.map(record => <section key={record.id} className="min-w-0 overflow-hidden rounded-xl border border-border"><h3 className="break-words bg-muted/40 px-4 py-3 text-sm font-bold">{record.action} {record.label}</h3><div className="divide-y divide-border">{record.changes.map((change, index) => <div key={index} className="p-4"><h4 className="mb-2 break-words text-sm font-bold text-primary">{change.field}</h4><div className="grid gap-3 sm:grid-cols-2"><div className="min-w-0"><p className="mb-1 text-xs font-bold text-muted-foreground">Before</p><p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-lg bg-rose-50/70 p-3 text-sm text-slate-700">{change.before}</p></div><div className="min-w-0"><p className="mb-1 text-xs font-bold text-muted-foreground">After</p><p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-lg bg-emerald-50/70 p-3 text-sm text-slate-700">{change.after}</p></div></div></div>)}{!record.changes.length && <p className="p-4 text-sm">No further field details were recorded.</p>}</div></section>)}
      </div>}
    </Modal>
  </div>;
}
