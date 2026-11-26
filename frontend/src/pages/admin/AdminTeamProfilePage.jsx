import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios';
export default function AdminTeamProfilePage({ employee = false }) {
  const { id } = useParams();
  const [user, setUser] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    let active = true; setUser(null); setError('');
    api.get(employee ? `/admin/access/employees/${id}` : `/admin/super-admins/${id}`).then(response => { if (active) setUser(response.data.data.user); }).catch(err => { if (active) setError(err.response?.data?.message || 'Unable to load this profile.'); });
    return () => { active = false; };
  }, [id, employee]);
  return <section className="mx-auto max-w-3xl space-y-5"><Link className="text-sm font-semibold text-primary underline" to={employee ? '/admin/access' : '/admin/super-admins'}>Back to {employee ? 'Team & Access' : 'Super Admins'}</Link><div className="rounded-2xl border border-border bg-card p-6"><h1 className="text-2xl font-bold">{employee ? 'Employee' : 'Super admin'} profile</h1>{error ? <p role="alert" className="mt-5 text-rose-700">{error}</p> : !user ? <p role="status" className="mt-5">Loading profile…</p> : <dl className="mt-6 grid gap-5 sm:grid-cols-2">{[['Name', user.fullName || user.name], ['Email', user.email], ['Phone', user.phone], ['Role', employee ? user.accessRoleId?.name || 'Employee' : 'Super admin'], ['Account status', user.accountStatus], ['Created', new Date(user.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })]].map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase text-muted-foreground">{label}</dt><dd className="mt-2 break-words text-sm font-semibold">{value || '—'}</dd></div>)}</dl>}</div></section>;
}
