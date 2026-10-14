import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, MapPin, Search, ChevronRight, RefreshCw, Clock3 } from 'lucide-react';
import apiClient from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { ADMIN_SECTIONS } from '../../../../shared/adminAccess.js';

const dateTime = value => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(value));
const input = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary';
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50';
const json = value => value === null || value === undefined ? '—' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
const summary = log => log.documents?.reduce((count, doc) => count + (doc.changes?.length || 0), 0) || 0;
function Location({ location, detailed = false }) {
  if (location?.status !== 'available') return <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin size={13} />Location {location?.status || 'unavailable'}</span>;
  return <span className="inline-flex flex-wrap items-center gap-1 text-muted-foreground"><MapPin size={13} />
    <a className="text-primary underline underline-offset-2" href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`} target="_blank" rel="noopener noreferrer">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</a>
    {detailed && <span> · ±{Math.round(location.accuracy)} m · captured {dateTime(location.capturedAt)} IST · browser-reported</span>}
  </span>;
}
export default function AdminLogbookPage() {
  const [filters, setFilters] = useState({ search: '', section: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ logs: [], total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const update = patch => { setPage(1); setFilters(old => ({ ...old, ...patch })); };
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, search: filters.search };
      if (filters.section) params.section = filters.section;
      if (filters.from) params.from = new Date(`${filters.from}T00:00:00+05:30`).toISOString();
      if (filters.to) params.to = new Date(`${filters.to}T23:59:59.999+05:30`).toISOString();
      const response = await apiClient.get('/admin/access/logs', { params }); setResult(response.data.data);
    } catch (err) { setError(err.response?.data?.message || 'Unable to load the logbook.'); }
    finally { setLoading(false); }
  }, [filters, page]);
  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);
  const open = async log => {
    setDetailLoading(true); setError('');
    try { const response = await apiClient.get(`/admin/access/logs/${log._id}`); setDetail(response.data.data.log); }
    catch (err) { setError(err.response?.data?.message || 'Unable to open this entry.'); }
    finally { setDetailLoading(false); }
  };
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Super admin workspace</p><h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">The change logbook</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">A record of saved database changes across your admin panel. Follow the person, the record, and the exact values that changed. All times are shown in IST.</p></div><button className={button} disabled={loading} onClick={load}><RefreshCw size={15} />Refresh</button></div>
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-semibold">Find a change<div className="relative mt-1"><Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" /><input className={`${input} pl-9`} placeholder="Name, email, collection or record ID" value={filters.search} onChange={e => update({ search: e.target.value })} /></div></label>
        <label className="text-xs font-semibold">Section<select className={`${input} mt-1`} value={filters.section} onChange={e => update({ section: e.target.value })}><option value="">All sections</option>{ADMIN_SECTIONS.map(section => <option key={section.key} value={section.key}>{section.label}</option>)}<option value="enquiries">Enquiries (shared actions)</option><option value="access">Team & roles</option><option value="auth">Profile & authentication</option></select></label>
        <label className="text-xs font-semibold">From date (IST)<input type="date" className={`${input} mt-1`} value={filters.from} max={filters.to || undefined} onChange={e => update({ from: e.target.value })} /></label>
        <label className="text-xs font-semibold">To date (IST)<input type="date" className={`${input} mt-1`} value={filters.to} min={filters.from || undefined} onChange={e => update({ to: e.target.value })} /></label>
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground"><span>{result.total.toLocaleString('en-IN')} matching entries · newest first</span><span>Passwords and authentication secrets are redacted.</span></div>
    </div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {loading ? <p role="status" className="p-5 text-sm text-muted-foreground">Loading changes…</p> : !result.logs.length ? <div className="rounded-xl border border-dashed bg-card p-12 text-center"><BookOpen size={32} className="mx-auto text-primary/50" /><h2 className="mt-3 font-bold">A clear page</h2><p className="mt-2 text-sm text-muted-foreground">No changes match these filters. New saved database changes appear here automatically.</p></div> : <div className="space-y-3">{result.logs.map(log => <article key={log._id} className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3"><span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary sm:flex">{(log.actor?.name || 'A').slice(0, 1)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm"><strong>{log.actor?.name || 'Administrator'}</strong> <span className="text-muted-foreground">changed</span> <strong>{log.entity}</strong></p><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock3 size={12} />{dateTime(log.createdAt)} IST</span></div><p className="mt-1 break-all text-xs text-muted-foreground">{log.actor?.email} · {log.actor?.roleName || 'Super admin'} · {log.section || 'Account'}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-primary/5 px-2.5 py-1 font-semibold text-primary">{log.operation}</span><span>{log.documents?.length || 0} record(s) · {summary(log)} change(s)</span><span className={`rounded-full px-2 py-1 ${log.status === 'applied' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{log.status === 'applied' ? 'Saved' : log.status}</span></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs"><Location location={log.location} /><button className="inline-flex items-center gap-1 font-semibold text-primary" disabled={detailLoading} onClick={() => open(log)}>Inspect changes <ChevronRight size={15} /></button></div>
      </div></div>
    </article>)}</div>}
    {result.pages > 1 && <div className="flex items-center justify-between"><button className={button} disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</button><span className="text-sm">Page {page} of {result.pages}</span><button className={button} disabled={page >= result.pages || loading} onClick={() => setPage(p => p + 1)}>Next</button></div>}
    <Modal isOpen={!!detail} onClose={() => setDetail(null)} size="xl" title="Inspect database changes" description={detail ? `${detail.actor?.name} · ${dateTime(detail.createdAt)} IST` : ''}>
      {detail && <div className="space-y-5"><div className="rounded-lg border border-border bg-muted/30 p-4 text-xs leading-6"><p><strong>{detail.entity}</strong> · {detail.operation} · {detail.status}</p><p className="break-all">{detail.method} {detail.path}</p><p>Request ID: {detail.requestId}</p><p>IP address: {detail.ip || 'Unavailable'}</p><Location location={detail.location} detailed /><p className="mt-1 break-all text-muted-foreground">{detail.userAgent}</p></div>
        {detail.documents?.map(doc => <div key={doc.id} className="overflow-hidden rounded-xl border border-border"><h3 className="break-all bg-muted/40 px-4 py-3 text-xs font-bold">Record {doc.id}</h3><div className="divide-y divide-border">{doc.changes?.map((change, index) => <div key={index} className="p-4"><h4 className="mb-2 break-all text-xs font-bold text-primary">{change.field}</h4><div className="grid gap-3 sm:grid-cols-2"><div className="min-w-0"><p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Before</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-rose-50/70 p-3 text-xs text-slate-700">{json(change.before)}</pre></div><div className="min-w-0"><p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">After</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-emerald-50/70 p-3 text-xs text-slate-700">{json(change.after)}</pre></div></div></div>)}</div><details className="border-t border-border p-4 text-xs"><summary className="cursor-pointer font-semibold text-primary">Full record snapshots</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted/30 p-3">{JSON.stringify({ before: doc.before, after: doc.after }, null, 2)}</pre></details></div>)}
      </div>}
    </Modal>
  </div>;
}
