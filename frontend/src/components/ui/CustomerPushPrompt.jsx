import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import apiClient from '../../api/axios';
import { getPushToken, isFirebaseConfigured } from '../../lib/firebase';
import pushService from '../../services/pushService';

function Prompt({ accountId }) {
  const dismissKey = `vinexus_push_prompt:${accountId}`;
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    try { if (sessionStorage.getItem(dismissKey)) return undefined; } catch { /* storage optional */ }
    apiClient.get('/communications/preferences', { portal: 'customer' }).then(response => {
      const subscribed = response.data.data.preferences.push;
      if (!cancelled) setVisible(Notification.permission !== 'denied' && (!subscribed || Notification.permission === 'default'));
    }).catch(() => { /* Preferences remain available from the account page. */ });
    return () => { cancelled = true; };
  }, [dismissKey]);

  const dismiss = () => {
    try { sessionStorage.setItem(dismissKey, 'dismissed'); } catch { /* storage optional */ }
    setVisible(false);
  };
  const enable = async () => {
    setBusy(true); setError('');
    try {
      const token = await getPushToken(true);
      if (!token) throw new Error(Notification.permission === 'denied'
        ? 'Notifications are blocked. Allow them in your browser settings, then try again.'
        : 'Notifications were not enabled. Please allow notifications and try again.');
      await pushService.subscribe(token);
      dismiss();
    } catch (failure) {
      setError(failure.response?.data?.message || failure.message || 'Could not enable notifications. Please try again.');
    } finally { setBusy(false); }
  };
  if (!visible) return null;
  return <aside aria-label="Enable customer notifications" className="fixed bottom-5 left-5 z-[90] w-80 max-w-[90vw] rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
    <h2 className="font-bold text-gray-900">Stay updated with ViNexus</h2>
    <p className="mt-2 text-sm text-gray-600">Enable notifications for order updates, new products and special offers. No location access is needed.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <div className="mt-4 flex flex-wrap gap-3">
      <button disabled={busy} onClick={enable} className="rounded-lg bg-[#800020] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Enabling…' : 'Enable notifications'}</button>
      <button disabled={busy} onClick={dismiss} className="px-2 py-2 text-sm text-gray-600">Not now</button>
    </div>
    <Link to="/account/notifications" className="mt-3 block text-xs text-[#800020]">Manage notification preferences</Link>
  </aside>;
}

export default function CustomerPushPrompt() {
  const { user, isLoading } = useAuth();
  const { pathname } = useLocation();
  const accountId = user?._id || user?.id;
  if (isLoading || !accountId || pathname.startsWith('/admin') || pathname === '/account/notifications'
    || !isFirebaseConfigured || typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return null;
  return <Prompt key={accountId} accountId={accountId} />;
}
