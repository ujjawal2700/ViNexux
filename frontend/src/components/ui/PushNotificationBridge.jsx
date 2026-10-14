import React, { useEffect, useState } from 'react';
import usePushNotifications from '../../hooks/usePushNotifications';
const safe = value => { if (typeof value !== 'string' || !value.trim()) return null; try { const url = new URL(value, window.location.origin); return /^https?:$/.test(url.protocol) ? url.href : null; } catch { return null; } };
export default function PushNotificationBridge() {
  usePushNotifications();
  const [message, setMessage] = useState(null);
  useEffect(() => { const receive = event => setMessage(event.detail); window.addEventListener('vinexus-push', receive); return () => window.removeEventListener('vinexus-push', receive); }, []);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(null), 12000); return () => clearTimeout(timer); }, [message]);
  if (!message) return null;
  let actions = []; try { actions = JSON.parse(message.data?.actions || '[]').slice(0, 2); } catch { /* optional */ }
  return <aside role="status" aria-label="Push notification" className="fixed bottom-5 right-5 z-[100] w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
    {safe(message.data?.imageUrl) && <img src={safe(message.data.imageUrl)} alt="" className="h-36 w-full object-cover" />}
    <div className="p-4"><button aria-label="Dismiss notification" className="float-right p-1" onClick={() => setMessage(null)}>×</button><p className="text-xs font-bold uppercase tracking-widest text-[#800020]">ViNexus</p><h3 className="mt-2 font-bold">{message.title}</h3><p className="mt-1 text-sm text-gray-600">{message.body}</p>
      <div className="mt-3 flex gap-3 text-sm font-semibold text-[#800020]">{safe(message.data?.link) && <a href={safe(message.data.link)}>View details</a>}{actions.map((action, index) => safe(action.url) && <a key={index} href={safe(action.url)}>{action.label}</a>)}</div>
    </div>
  </aside>;
}
