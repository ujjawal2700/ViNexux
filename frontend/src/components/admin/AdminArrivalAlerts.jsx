import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, X } from 'lucide-react';
import apiClient from '../../api/axios';
import { isSuperAdmin } from '../../../../shared/adminAccess.js';
import { playAdminArrivalSound, unlockNotificationSound, isNotificationSoundReady } from '../../utils/enquiryNotificationSound';

export default function AdminArrivalAlerts({ account }) {
  const accountId = account?._id || account?.id;
  const allowed = isSuperAdmin(account);
  const [queue, setQueue] = useState([]);
  const [soundReady, setSoundReady] = useState(isNotificationSoundReady);
  const seen = useRef(new Set());
  useEffect(() => {
    if (!allowed || !accountId) return;
    let cancelled = false, busy = false, cursor;
    seen.current.clear(); setQueue([]);
    const receive = arrival => {
      const key = String(arrival._id || arrival.data?.arrivalId || '');
      const link = arrival.link || arrival.data?.link;
      if (!key || !/^\/admin\/(?:enquiries|whatsapp-orders|pos)(?:[/?]|$)/.test(link || '') || seen.current.has(key) || cancelled) return;
      seen.current.add(key);
      if (seen.current.size > 2000) seen.current.delete(seen.current.values().next().value);
      setQueue(current => [...current, { ...arrival, _id: key, link }]);
      window.dispatchEvent(new Event('admin-work-queue-updated'));
      window.dispatchEvent(new Event('admin-arrival-received'));
    };
    const push = event => { if (event.detail?.data?.type === 'admin-arrival') receive(event.detail); };
    const poll = async () => {
      if (busy || cancelled) return;
      busy = true;
      try {
        let more;
        do {
          const response = await apiClient.get('/admin/arrivals', { params: cursor ? { after: cursor } : {}, skipGlobalLoader: true });
          if (cancelled) return;
          const result = response.data?.data || {};
          (result.arrivals || []).forEach(receive);
          more = result.hasMore && result.cursor !== cursor;
          cursor = result.cursor || cursor;
        } while (more && !cancelled);
      } catch { /* Keep the cursor and retry without replaying delivered arrivals. */ }
      finally { busy = false; }
    };
    poll();
    const timer = setInterval(poll, 5000);
    window.addEventListener('focus', poll);
    window.addEventListener('vinexus-push', push);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('focus', poll); window.removeEventListener('vinexus-push', push); };
  }, [allowed, accountId]);
  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    playAdminArrivalSound(current._id);
    const timer = setTimeout(() => setQueue(items => items.slice(1)), 6000);
    return () => clearTimeout(timer);
  }, [current]);
  useEffect(() => {
    const update = () => { Promise.resolve().then(() => setSoundReady(isNotificationSoundReady())); };
    window.addEventListener('notification-sound-ready', update);
    window.addEventListener('pointerdown', update); window.addEventListener('keydown', update);
    return () => { window.removeEventListener('notification-sound-ready', update); window.removeEventListener('pointerdown', update); window.removeEventListener('keydown', update); };
  }, []);
  if (!allowed) return null;
  return <>
    {!soundReady && <button type="button" className="rounded-lg border border-border px-2 py-1.5 text-xs font-semibold text-primary" onClick={async () => { await unlockNotificationSound(); setSoundReady(isNotificationSoundReady()); }}>Enable alert sound</button>}
    {current && <aside key={current._id} role="status" aria-label="New order or enquiry" className="fixed right-4 top-20 z-[150] w-[460px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-emerald-200 border-l-[6px] border-l-emerald-500 bg-white text-slate-900 shadow-2xl">
      <div className="flex items-start gap-3 p-5"><BellRing className="mt-1 h-7 w-7 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1"><h3 className="text-lg font-bold">{current.title}</h3><p className="mt-2 break-words text-sm text-slate-600">{current.body}</p><Link to={current.link} onClick={() => setQueue(items => items.slice(1))} className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">View details{queue.length > 1 ? ` · ${queue.length - 1} more` : ''}</Link></div>
        <button type="button" aria-label="Dismiss order notification" onClick={() => setQueue(items => items.slice(1))}><X className="h-5 w-5 text-slate-500" /></button>
      </div><div className="h-1 bg-emerald-100"><div className="h-full origin-left bg-emerald-500" style={{ animation: 'admin-arrival-countdown 6s linear forwards' }} /></div>
      <style>{'@keyframes admin-arrival-countdown { from { transform: scaleX(1); } to { transform: scaleX(0); } }'}</style>
    </aside>}
  </>;
}
