import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Plus, Search } from 'lucide-react';
import apiClient from '../../api/axios';
import Modal from '../../components/ui/Modal';

const input = 'mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-normal';
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50';
const primary = `${button} bg-primary text-primary-foreground`;
const blank = () => ({ fullName: '', email: '', phone: '', password: '' });
const message = error => error.response?.data?.message || 'Unable to complete this request. Please try again.';

export default function AdminSuperAdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const load = useCallback(async signal => {
    setLoading(true); setError('');
    try {
      const response = await apiClient.get('/admin/super-admins', { params: { page, search }, signal });
      if (signal?.aborted) return;
      const data = response.data.data;
      setAdmins(data.admins); setTotal(data.total); setPages(data.pages);
    } catch (error) { if (!signal?.aborted) setError(message(error)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [page, search]);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const create = async event => {
    event.preventDefault(); setSaving(true); setFormError(''); setNotice('');
    try {
      await apiClient.post('/admin/super-admins', draft);
      setOpen(false); setDraft(blank()); setNotice('Super admin created. They can sign in through the admin portal with their password and OTP.');
      if (page !== 1 || search) { setPage(1); setSearch(''); } else await load();
    } catch (error) { setFormError(message(error)); }
    finally { setSaving(false); }
  };
  return <div className="space-y-6">
    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-6 sm:p-8">
      <ShieldCheck className="h-8 w-8 text-primary" />
      <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Super Admins</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Manage the administrators who have full access to every section, including team permissions, maintenance settings and the logbook. Employee accounts and their roles stay in Team &amp; Access.</p>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-semibold">{total} super admin{total === 1 ? '' : 's'}</p>
      <button className={primary} onClick={() => { setDraft(blank()); setFormError(''); setOpen(true); }}><Plus size={16} />Create super admin</button>
    </div>
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <label className="relative block max-w-sm"><Search size={16} className="absolute left-3 top-5 text-muted-foreground" />
      <input aria-label="Search super admins" className={`${input} pl-9`} placeholder="Search name, email or phone" value={search}
        onChange={event => { setPage(1); setSearch(event.target.value); }} />
    </label>
    {error ? <div role="alert" className="rounded-lg border border-rose-200 p-4 text-sm text-rose-700">{error}<button className={`${button} ml-3`} onClick={() => load()}>Retry</button></div>
      : loading ? <p role="status" className="p-6 text-sm text-muted-foreground">Loading super admins…</p>
      : <div className="grid gap-4 lg:grid-cols-2">{admins.map(admin => <article key={admin._id} className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-primary" /><div className="min-w-0">
          <h2 className="font-bold">{admin.fullName}</h2><p className="mt-1 break-all text-sm text-muted-foreground">{admin.email}</p>
          <p className="mt-1 text-sm text-muted-foreground">{admin.phone || 'No phone number'}</p>
        </div></div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
          <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">Full access</span>
          <span className={`rounded-full px-3 py-1 ${admin.accountStatus === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{admin.accountStatus === 'active' ? 'Active' : admin.accountStatus === 'blocked' ? 'Blocked' : 'Pending'}</span>
        </div>
      </article>)}{!admins.length && <p className="p-6 text-sm text-muted-foreground">No super admins match your search.</p>}</div>}
    {pages > 1 && <div className="flex items-center justify-between gap-3"><button className={button} disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</button><span className="text-sm">Page {page} of {pages}</span><button className={button} disabled={page >= pages || loading} onClick={() => setPage(value => value + 1)}>Next</button></div>}
    <Modal isOpen={open} onClose={() => { if (!saving) { setOpen(false); setDraft(blank()); } }} title="Create super admin" size="lg"
      description="This account will have full access to every admin section. Sign-in requires a password and OTP.">
      <form onSubmit={create} className="space-y-5">
        {formError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{formError}</p>}
        <fieldset disabled={saving} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">{[
            ['fullName', 'Full name', 'text'], ['email', 'Email address', 'email'], ['phone', 'Phone number', 'tel'], ['password', 'Password', 'password'],
          ].map(([key, label, type]) => <label key={key} className="text-xs font-semibold">{label}<input required type={type} value={draft[key]} className={input}
            minLength={key === 'password' ? 8 : key === 'fullName' ? 2 : undefined} maxLength={{ fullName: 100, email: 254, phone: 10, password: 72 }[key]}
            pattern={key === 'phone' ? '[6-9][0-9]{9}' : undefined} autoComplete={key === 'password' ? 'new-password' : 'off'}
            onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
          <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" className={button} onClick={() => { setOpen(false); setDraft(blank()); }}>Cancel</button><button className={primary} type="submit">{saving ? 'Creating…' : 'Create account'}</button></div>
        </fieldset>
      </form>
    </Modal>
  </div>;
}
