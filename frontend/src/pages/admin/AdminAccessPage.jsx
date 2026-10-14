import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ShieldCheck, Plus, Pencil, Search, KeyRound, ArrowUpRight, Layers, Trash2 } from 'lucide-react';
import apiClient from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { ADMIN_SECTIONS } from '../../../../shared/adminAccess.js';

const emptyPermissions = () => Object.fromEntries(ADMIN_SECTIONS.map(s => [s.key, { read: false, write: false }]));
const blankRole = () => ({ name: '', description: '', isActive: true, permissions: emptyPermissions() });
const blankEmployee = () => ({ fullName: '', email: '', phone: '', password: '', accessRoleId: '', accountStatus: 'active' });
const input = 'mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10';
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50';
const primary = `${button} !border-primary !bg-primary !text-white hover:!opacity-90`;
const modes = { none: { read: false, write: false }, read: { read: true, write: false }, write: { read: false, write: true }, both: { read: true, write: true } };
const modeOf = p => p?.read ? p.write ? 'both' : 'read' : p?.write ? 'write' : 'none';
const presets = [
  { name: 'Catalog editor', description: 'Maintain products, stock, brands and categories.', both: ['products', 'categories', 'brands'], read: [] },
  { name: 'POS operator', description: 'Create bills, manage returns and serve walk-in customers.', both: ['pos'], read: ['products', 'customers'] },
  { name: 'Support desk', description: 'Handle enquiries with access to customer and product details.', both: ['enquiries-customers', 'enquiries-dealers'], read: ['customers', 'products', 'dealers'] },
];
const errorMessage = error => error.response?.data?.message || error.message || 'Unable to save changes.';

export default function AdminAccessPage() {
  const latestLoad = useRef(0);
  const [tab, setTab] = useState('employees');
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null);
  const [draft, setDraft] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [checkingRole, setCheckingRole] = useState(false);
  const load = useCallback(async () => {
    const sequence = ++latestLoad.current;
    setLoading(sequence === 1); setError('');
    try {
      const [roleResponse, teamResponse] = await Promise.all([apiClient.get('/admin/access/roles'), apiClient.get('/admin/access/employees', { params: { page, search } })]);
      if (sequence !== latestLoad.current) return;
      setRoles(roleResponse.data.data.roles); setEmployees(teamResponse.data.data.employees);
      setPages(teamResponse.data.data.pages); setTotal(teamResponse.data.data.total);
    } catch (err) { if (sequence === latestLoad.current) setError(errorMessage(err)); }
    finally { if (sequence === latestLoad.current) setLoading(false); }
  }, [page, search]);
  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);
  const openRole = role => { setError(''); setEditor({ type: 'role', id: role?._id }); setDraft(role ? { name: role.name, description: role.description, isActive: role.isActive, permissions: { ...emptyPermissions(), ...role.permissions } } : blankRole()); };
  const openEmployee = employee => { setError(''); setEditor({ type: 'employee', id: employee?._id }); setDraft(employee ? { fullName: employee.fullName, email: employee.email, phone: employee.phone || '', password: '', accessRoleId: employee.accessRoleId?._id || employee.accessRoleId || '', accountStatus: employee.accountStatus } : blankEmployee()); };
  const change = patch => setDraft(value => ({ ...value, ...patch }));
  const requestDeleteRole = async role => {
    setDeletingRole(role); setAssignments([]); setCheckingRole(true); setError('');
    try { const response = await apiClient.get(`/admin/access/roles/${role._id}/assignments`); setAssignments(response.data.data.employees); }
    catch (err) { setError(errorMessage(err)); }
    finally { setCheckingRole(false); }
  };
  const deleteRole = async () => {
    setBusy(true); setError('');
    try {
      await apiClient.delete(`/admin/access/roles/${deletingRole._id}`);
      setDeletingRole(null); setNotice('Role deleted.'); await load();
    } catch (err) {
      if (err.response?.data?.error?.code === 'ROLE_IN_USE') setAssignments(err.response.data.details || []);
      setError(errorMessage(err));
    } finally { setBusy(false); }
  };
  const setGroup = (group, mode) => change({ permissions: { ...draft.permissions, ...Object.fromEntries(ADMIN_SECTIONS.filter(s => s.group === group).map(s => [s.key, modes[mode]])) } });
  const save = async event => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const payload = { ...draft };
      if (editor.type === 'employee' && editor.id && !payload.password) delete payload.password;
      const path = `/admin/access/${editor.type === 'role' ? 'roles' : 'employees'}${editor.id ? `/${editor.id}` : ''}`;
      await apiClient[editor.id ? 'put' : 'post'](path, payload);
      setEditor(null); setNotice(editor.type === 'role' ? 'Role saved. Updated permissions apply to employees on their next request.' : 'Employee saved. Password resets and blocked accounts revoke existing sessions.'); await load();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };
  return <div className="space-y-6">
    <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
      <ShieldCheck className="absolute -right-5 -top-4 h-44 w-44 rotate-12 text-primary/[.06]" aria-hidden="true" />
      <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Super admin workspace</p>
      <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">The right access. For every teammate.</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Build roles around the way your team works. Choose exactly what each employee can see and change, and follow every saved database change in your logbook.</p>
      <Link to="/admin/logbook" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">Open super admin logbook <ArrowUpRight size={16} /></Link>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">{[
      [Users, total, 'Employee accounts'], [Layers, roles.length, 'Custom roles'], [ShieldCheck, roles.filter(r => r.isActive).length, 'Active roles'],
    ].map(([Icon, value, label]) => <div key={label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"><span className="rounded-lg bg-primary/5 p-3 text-primary"><Icon size={21} /></span><div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div>)}</div>
    {error && !editor && !deletingRole && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
      <div className="flex gap-2" role="tablist" aria-label="Team and roles"><button role="tab" aria-selected={tab === 'employees'} className={`${button} ${tab === 'employees' ? 'text-primary border-primary/30 bg-primary/5' : ''}`} onClick={() => setTab('employees')}>Employees</button><button role="tab" aria-selected={tab === 'roles'} className={`${button} ${tab === 'roles' ? 'text-primary border-primary/30 bg-primary/5' : ''}`} onClick={() => setTab('roles')}>Role studio</button></div>
      <button className={primary} onClick={() => tab === 'roles' ? openRole() : openEmployee()}><Plus size={16} />{tab === 'roles' ? 'Create role' : 'Add employee'}</button>
    </div>
    {loading ? <p role="status" className="p-6 text-sm text-muted-foreground">Loading team access…</p> : tab === 'employees' ? <div className="space-y-4">
      <label className="relative block max-w-sm"><Search size={16} className="absolute left-3 top-4 text-muted-foreground" /><input aria-label="Search employees" className={`${input} pl-9`} placeholder="Search name, email or phone" value={search} onChange={e => { setPage(1); setSearch(e.target.value); }} /></label>
      {!employees.length && <div className="rounded-xl border border-dashed bg-card p-10 text-center"><Users size={32} className="mx-auto text-primary/60" /><h2 className="mt-3 font-bold">Make room for your team</h2><p className="mt-2 text-sm text-muted-foreground">Create a role, then add an employee with their name, email, phone and password.</p><button className={`${button} mt-4`} onClick={() => openRole()}>Create a role</button></div>}
      <div className="grid gap-4 lg:grid-cols-2">{employees.map(employee => <article key={employee._id} className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">{employee.fullName.slice(0, 1).toUpperCase()}</span><div><h2 className="font-bold">{employee.fullName}</h2><p className="mt-1 break-all text-xs text-muted-foreground">{employee.email}</p><p className="mt-1 text-xs text-muted-foreground">{employee.phone}</p></div></div><button className={button} aria-label={`Edit ${employee.fullName}`} onClick={() => openEmployee(employee)}><Pencil size={14} /><span className="hidden sm:inline">Edit</span></button></div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs"><span className="rounded-full bg-primary/5 px-3 py-1 font-semibold text-primary">{employee.accessRoleId?.name || 'Unassigned role'}</span><span className={`rounded-full px-3 py-1 ${employee.accountStatus === 'active' && employee.accessRoleId?.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{employee.accountStatus === 'blocked' ? 'Blocked' : employee.accessRoleId?.isActive ? 'Active' : 'Role disabled'}</span></div>
      </article>)}</div>
      {pages > 1 && <div className="flex items-center justify-between"><button className={button} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><span className="text-sm">Page {page} of {pages}</span><button className={button} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button></div>}
    </div> : <div className="space-y-5">
      <div className="rounded-xl border border-dashed p-4"><h2 className="text-sm font-bold">Start with a working pattern</h2><p className="mt-1 text-xs text-muted-foreground">Use a starting point, then adjust every section before saving.</p><div className="mt-3 flex flex-wrap gap-2">{presets.map(preset => <button key={preset.name} className={button} onClick={() => { openRole(); setDraft({ ...blankRole(), name: preset.name, description: preset.description, permissions: { ...emptyPermissions(), ...Object.fromEntries(preset.both.map(key => [key, modes.both])), ...Object.fromEntries(preset.read.map(key => [key, modes.read])) } }); }}>{preset.name} <ArrowUpRight size={14} /></button>)}</div></div>
      {!roles.length && <p className="p-4 text-sm text-muted-foreground">No roles yet. Create one from a starting point or build your own.</p>}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{roles.map(role => <article key={role._id} className="rounded-xl border border-border bg-card p-5"><div className="flex justify-between gap-3"><span className="rounded-lg bg-primary/5 p-2 text-primary"><ShieldCheck size={20} /></span><span className={`text-xs font-semibold ${role.isActive ? 'text-emerald-700' : 'text-rose-700'}`}>{role.isActive ? 'Active' : 'Disabled'}</span></div><h2 className="mt-3 font-bold">{role.name}</h2><p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">{role.description || 'Custom section-level access.'}</p><div className="my-4 flex gap-4 border-y border-border py-3 text-xs"><span><strong>{Object.values(role.permissions || {}).filter(p => p.read).length}</strong> readable sections</span><span><strong>{Object.values(role.permissions || {}).filter(p => p.write).length}</strong> writable sections</span></div><div className="flex flex-wrap gap-2"><button className={`${button} flex-1`} onClick={() => openRole(role)}><Pencil size={14} />Edit permissions</button><button type="button" className={`${button} text-rose-700 hover:!bg-rose-50`} aria-label={`Delete role ${role.name}`} onClick={() => requestDeleteRole(role)}><Trash2 size={14} />Delete</button></div></article>)}</div>
    </div>}
    <Modal isOpen={!!deletingRole} onClose={() => !busy && !checkingRole && setDeletingRole(null)} size="lg"
      title={assignments.length ? 'This role is assigned to employees' : 'Delete role'}
      description={deletingRole ? `Role: ${deletingRole.name}` : ''}
      footer={<><button type="button" className={button} disabled={busy || checkingRole} onClick={() => setDeletingRole(null)}>{assignments.length ? 'Close' : 'Cancel'}</button>
        {!assignments.length && <button type="button" className={`${button} !bg-rose-600 !text-white !border-rose-600`} disabled={busy || checkingRole || !!error} onClick={deleteRole}>{busy ? 'Deleting…' : 'Delete role'}</button>}</>}>
      {checkingRole ? <p role="status">Checking employees assigned to this role…</p> : assignments.length ? <>
        <p className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">These employees are associated with this role. First change their role to delete this role. Blocked employees must also be reassigned.</p>
        <ul className="max-h-72 space-y-2 overflow-y-auto">{assignments.map(employee => <li key={employee._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div className="min-w-0"><p className="text-sm font-semibold">{employee.fullName}</p><p className="break-all text-xs text-muted-foreground">{employee.email}</p></div>
          <button type="button" className={button} onClick={() => { setDeletingRole(null); openEmployee(employee); }}>Change role</button>
        </li>)}</ul>
      </> : error ? <p className="text-sm text-muted-foreground">Unable to confirm this role can be deleted. Close and try again.</p> : <p className="text-sm leading-6 text-muted-foreground">No employees are assigned to this role. Delete it permanently? Assigned employees are checked again before deletion.</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    </Modal>
    <Modal isOpen={!!editor} onClose={() => !busy && setEditor(null)} size={editor?.type === 'role' ? 'xl' : 'lg'} title={editor?.type === 'role' ? `${editor.id ? 'Edit' : 'Create'} custom role` : `${editor?.id ? 'Edit' : 'Add'} employee`} description={editor?.type === 'role' ? 'Permissions apply immediately to every employee assigned to this role.' : 'Employees sign in through the admin login with their password and the existing OTP verification.'}>
      {editor && draft && <form onSubmit={save} className="space-y-5">
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <fieldset disabled={busy} className="space-y-5">
          {editor.type === 'role' ? <>
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Role name<input required minLength={2} maxLength={80} className={input} value={draft.name} onChange={e => change({ name: e.target.value })} placeholder="e.g. Warehouse manager" /></label><label className="text-xs font-semibold">Description<input maxLength={300} className={input} value={draft.description} onChange={e => change({ description: e.target.value })} placeholder="What this team does" /></label></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.isActive} onChange={e => change({ isActive: e.target.checked })} className="accent-primary" />Role active <span className="text-xs text-muted-foreground">Disable to remove assigned employees’ section access.</span></label>
            <p className="rounded-lg bg-primary/5 p-3 text-xs leading-5 text-primary">Read lets employees view data. Write lets them create, update and delete. Both enables the full management screen. Write-only access does not reveal existing records. Team management and the logbook always remain super-admin only.</p>
            {[...new Set(ADMIN_SECTIONS.map(s => s.group))].map(group => <div key={group} className="overflow-hidden rounded-xl border border-border"><div className="flex flex-wrap justify-between gap-2 bg-muted/50 px-4 py-3"><h3 className="text-sm font-bold">{group}</h3><div className="flex gap-3 text-xs text-primary"><button type="button" onClick={() => setGroup(group, 'none')}>Clear</button><button type="button" onClick={() => setGroup(group, 'read')}>Read all</button><button type="button" onClick={() => setGroup(group, 'both')}>Both for all</button></div></div><div className="divide-y divide-border">{ADMIN_SECTIONS.filter(s => s.group === group).map(section => <div key={section.key} className="flex items-center justify-between gap-3 px-4 py-3"><label className="text-sm" htmlFor={`permission-${section.key}`}>{section.label}</label><select id={`permission-${section.key}`} className="w-36 shrink-0 rounded-lg border border-border bg-card px-2 py-2 text-xs font-semibold" value={modeOf(draft.permissions[section.key])} onChange={e => change({ permissions: { ...draft.permissions, [section.key]: modes[e.target.value] } })}><option value="none">No access</option><option value="read">Read only</option><option value="write">Write only</option><option value="both">Read & write</option></select></div>)}</div></div>)}
          </> : <>
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Employee name<input required minLength={2} maxLength={100} className={input} value={draft.fullName} onChange={e => change({ fullName: e.target.value })} autoComplete="off" /></label><label className="text-xs font-semibold">Email address<input required type="email" maxLength={254} className={input} value={draft.email} onChange={e => change({ email: e.target.value })} autoComplete="off" /></label><label className="text-xs font-semibold">Phone number<input required type="tel" pattern="[6-9][0-9]{9}" maxLength={10} className={input} value={draft.phone} onChange={e => change({ phone: e.target.value })} placeholder="10-digit Indian mobile" /></label><label className="text-xs font-semibold">{editor.id ? 'New password (leave blank to keep)' : 'Password'}<input required={!editor.id} type="password" minLength={8} maxLength={72} autoComplete="new-password" className={input} value={draft.password} onChange={e => change({ password: e.target.value })} /></label></div>
            <label className="block text-xs font-semibold">Assigned role<select aria-label="Assigned role" required className={input} value={draft.accessRoleId} onChange={e => change({ accessRoleId: e.target.value })}><option value="">Choose an active role</option>{roles.filter(r => r.isActive).map(role => <option key={role._id} value={role._id}>{role.name}</option>)}</select></label>
            {!roles.some(r => r.isActive) && <p className="text-sm text-primary">Create an active role in Role studio before adding an employee.</p>}
            <label className="block text-xs font-semibold">Account status<select className={input} value={draft.accountStatus} onChange={e => change({ accountStatus: e.target.value })}><option value="active">Active</option><option value="blocked">Blocked</option></select></label>
            {editor.id && <p className="flex items-center gap-2 text-xs text-muted-foreground"><KeyRound size={15} />Setting a new password signs this employee out of existing sessions.</p>}
          </>}
          <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" className={button} onClick={() => setEditor(null)}>Cancel</button><button type="submit" className={primary}>{busy ? 'Saving…' : editor.type === 'role' ? 'Save role' : 'Save employee'}</button></div>
        </fieldset>
      </form>}
    </Modal>
  </div>;
}
