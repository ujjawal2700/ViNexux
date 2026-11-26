import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { adminLocation } from '../../utils/adminLocation';
import useAuth from '../../hooks/useAuth';
export default function AdminLocationGate({ children, onGranted }) {
  const { logout } = useAuth();
  const [location, setLocation] = useState(adminLocation.get), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const dialog = useRef(null), seen = useRef(location.status === 'available');
  const enable = async () => { setBusy(true); try { await adminLocation.requireValid(); } catch { /* The gate explains permission recovery. */ } finally { setBusy(false); } };
  useEffect(() => {
    const remove = adminLocation.subscribe(setLocation);
    adminLocation.start(); adminLocation.requireValid().catch(() => {});
    const required = () => { adminLocation.invalidate(); adminLocation.requireValid().catch(() => {}); };
    window.addEventListener('admin-location-required', required);
    const interval = setInterval(() => { adminLocation.requireValid().catch(() => {}); }, 45000);
    return () => { remove(); clearInterval(interval); window.removeEventListener('admin-location-required', required); };
  }, []);
  const allowed = location.status === 'available';
  useEffect(() => {
    if (allowed) seen.current = true;
    if (allowed && onGranted) { setBusy(true); Promise.resolve(onGranted()).catch(error => setError(error.response?.data?.message || error.message)).finally(() => setBusy(false)); }
  }, [allowed, onGranted]);
  const blocked = !allowed || Boolean(onGranted);
  const checking = location.status === 'checking' || allowed && Boolean(onGranted);
  useLayoutEffect(() => { if (blocked && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [blocked]);
  return <><div aria-hidden={blocked || undefined} inert={blocked || undefined} style={blocked ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}>{(seen.current || allowed) && children}</div>{blocked && createPortal(<dialog ref={dialog} aria-label="Mandatory admin location" onCancel={event => event.preventDefault()} className="pointer-events-auto fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-background p-0 text-foreground"><main className="grid min-h-screen place-items-center bg-background p-6 text-foreground"><section className="w-full max-w-lg space-y-5 rounded-2xl border border-border bg-card p-7 shadow-sm"><MapPin className="h-9 w-9 text-primary" /><h1 className="text-2xl font-bold">{checking ? 'Checking location…' : 'Location access required'}</h1><p className="text-sm leading-6 text-muted-foreground">Employees and super admins must allow location access to use the admin portal. Your location is recorded with your login and administrative actions.</p><p role="status" className="text-sm">{checking ? 'Getting your current location and restoring your admin session…' : location.status === 'denied' ? 'Location is blocked. Allow it in your browser’s site permissions, then retry.' : 'Waiting for a current location. Keep device location services enabled.'}</p>{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}<div className="flex flex-wrap gap-3"><button disabled={busy || checking} onClick={enable} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy || checking ? 'Checking…' : 'Enable location'}</button><button onClick={() => logout('admin')} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">Sign out</button></div></section></main></dialog>, document.body)}</>;
}
