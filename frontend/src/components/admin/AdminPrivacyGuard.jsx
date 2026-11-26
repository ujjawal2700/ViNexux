import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LockKeyhole } from 'lucide-react';
import { isSuperAdmin } from '../../../../shared/adminAccess.js';
import { adminPrivacyService as api } from '../../services/adminPrivacyService';
import { PinInput, PrivacyPinEditor, PrivacyPinRecovery } from './AdminPrivacyPinForms';
import useAuth from '../../hooks/useAuth';
const Context = createContext(null);
export const useAdminPrivacy = () => useContext(Context);

export default function AdminPrivacyGuard({ admin, children }) {
  const enabled = isSuperAdmin(admin), id = admin?._id || admin?.id || admin?.email;
  const { logout } = useAuth();
  const [status, setStatus] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [pin, setPin] = useState(''), [recover, setRecover] = useState(false);
  const dialog = useRef(null), pendingLock = useRef(false), mounted = useRef(false), requestVersion = useRef(0);
  const key = `vinexus_admin_privacy_locked:${id}`;
  const cached = useCallback(() => { try { return localStorage.getItem(key) === 'true'; } catch { return false; } }, [key]);
  const persist = useCallback(locked => { try { if (locked) localStorage.setItem(key, 'true'); else localStorage.removeItem(key); } catch { /* Server lock is authoritative. */ } }, [key]);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    const version = ++requestVersion.current;
    try {
      if (pendingLock.current) { await api.lock(); pendingLock.current = false; }
      const next = await api.status();
      if (typeof next?.locked !== 'boolean' || typeof next?.configured !== 'boolean') throw new Error('Invalid privacy status');
      if (!mounted.current || version !== requestVersion.current) return;
      if (next.locked) persist(true);
      setStatus({ ...next, locked: next.locked || cached() || pendingLock.current });
      setError('');
    } catch { if (mounted.current && version === requestVersion.current) setError('Unable to verify the privacy lock. Check your connection and retry.'); }
  }, [enabled, cached, persist]);
  const unlocked = useCallback(() => {
    requestVersion.current++; pendingLock.current = false; persist(false); setPin(''); setError(''); setRecover(false);
    setStatus({ configured: true, locked: false });
    window.dispatchEvent(new Event('admin-privacy-updated'));
  }, [persist]);
  const lock = useCallback(async () => {
    if (!enabled) return;
    requestVersion.current++; pendingLock.current = true; persist(true); setPin(''); setError(''); setRecover(false);
    setStatus(previous => ({ ...previous, locked: true }));
    try { await api.lock(); pendingLock.current = false; await refresh(); }
    catch { setError('The screen is hidden. The server lock could not be confirmed; reconnect and retry locking.'); }
  }, [enabled, persist, refresh]);
  useEffect(() => {
    mounted.current = true;
    if (!enabled) return () => { mounted.current = false; };
    refresh();
    const synchronize = event => { if (event.type !== 'storage' || event.key === key) {
      if (cached()) setStatus(previous => ({ ...previous, locked: true }));
      refresh();
    } };
    const onServerLocked = () => { persist(true); setStatus(previous => ({ ...previous, locked: true })); refresh(); };
    const onKey = event => { if (event.key === 'F8') { event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) lock(); } };
    const timer = setInterval(() => { if (!document.hidden) refresh(); }, 10000);
    window.addEventListener('keydown', onKey, true); window.addEventListener('focus', synchronize); window.addEventListener('storage', synchronize); window.addEventListener('admin-privacy-locked', onServerLocked);
    return () => { mounted.current = false; clearInterval(timer); window.removeEventListener('keydown', onKey, true); window.removeEventListener('focus', synchronize); window.removeEventListener('storage', synchronize); window.removeEventListener('admin-privacy-locked', onServerLocked); };
  }, [enabled, refresh, key, cached, persist, lock]);
  const locked = enabled && (status === null || status.locked);
  useLayoutEffect(() => {
    if (locked && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!locked && dialog.current?.open) dialog.current.close();
  }, [locked]);
  const unlock = async event => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { await api.unlock(pin); unlocked(); } catch (err) { setPin(''); setError(err.response?.data?.message || 'Unable to unlock. Please try again.'); } finally { setBusy(false); }
  };
  if (!enabled) return children;
  return <Context.Provider value={{ ...status, lock, unlocked }}>
    <div data-admin-privacy-workspace aria-hidden={locked || undefined} inert={locked ? true : undefined} style={locked ? { filter: 'blur(24px)', pointerEvents: 'none', userSelect: 'none' } : undefined}>{status !== null && children}</div>
    {locked && createPortal(<dialog ref={dialog} aria-labelledby="admin-privacy-title" onCancel={event => event.preventDefault()} onKeyDown={event => event.stopPropagation()} className="pointer-events-auto fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto border-0 bg-background/20 p-5 text-slate-950 backdrop:bg-background/40 backdrop:backdrop-blur-2xl"><div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center py-8"><section className="space-y-5 rounded-3xl bg-white p-6 shadow-2xl sm:p-8"><LockKeyhole className="h-8 w-8 text-primary" /><h1 id="admin-privacy-title" className="text-2xl font-bold">Admin panel locked</h1><p className="text-sm text-slate-600">Your admin details are hidden. F8 locks the panel; only verification can unlock it.</p>{status === null ? <><p role="status">Checking privacy lock…</p><button className="text-sm underline" onClick={refresh}>Retry connection</button></> : recover ? <><PrivacyPinRecovery onSaved={unlocked} /><button className="text-sm underline" onClick={() => { setRecover(false); setError(''); }}>Back to PIN unlock</button></> : status.configured === false ? <><p className="text-sm text-slate-600">Set your separate six-digit privacy PIN to continue.</p><PrivacyPinEditor configured={false} onSaved={unlocked} /></> : <form className="space-y-4" onSubmit={unlock}><PinInput label="Privacy PIN" value={pin} onChange={setPin} autoFocus /><button disabled={busy} className="w-full rounded-xl bg-primary p-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Unlocking…' : 'Unlock admin panel'}</button><button type="button" className="text-sm underline" onClick={() => { setRecover(true); setError(''); setPin(''); }}>Forgot privacy PIN?</button></form>}{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}<div className="flex gap-4 border-t pt-4 text-sm"><button onClick={lock} className="underline">Retry server lock</button><button onClick={() => logout('admin')} className="underline">Sign out</button></div></section></div></dialog>, document.body)}
  </Context.Provider>;
}
