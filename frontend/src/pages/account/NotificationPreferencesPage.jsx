import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../../api/axios';
import { getPushToken, isFirebaseConfigured } from '../../lib/firebase';
import pushService from '../../services/pushService';
export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { apiClient.get('/communications/preferences').then(res => setPreferences(res.data.data.preferences)).catch(() => setMessage('Could not load preferences. Please refresh to try again.')); }, []);
  const save = async () => {
    setBusy(true); setMessage('');
    try { await apiClient.put('/communications/preferences', preferences); setMessage('Your preferences have been saved.'); }
    catch (error) { setMessage(error.response?.data?.message || 'Unable to save preferences.'); } finally { setBusy(false); }
  };
  const enable = async () => {
    setBusy(true); setMessage('');
    try { const token = await getPushToken(true); if (!token) throw new Error(isFirebaseConfigured ? 'Allow notifications in your browser settings, then try again.' : 'Push notifications have not been configured yet.'); await pushService.registerToken(token); setPreferences(old => ({ ...old, push: true })); setMessage('Browser connected. Save your preferences to subscribe to promotions.'); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  return <main className="mx-auto max-w-2xl px-5 py-14"><Link to="/account/profile" className="text-sm text-[#800020]">← My account</Link><h1 className="mt-5 text-3xl font-bold">Your notifications, your choice.</h1><p className="mt-3 text-gray-500">Choose how you hear about new products and special offers. You can change these preferences anytime.</p>
    {preferences && <div className="my-8 space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
      <label className="flex items-start gap-4"><input type="checkbox" className="mt-1" checked={preferences.email} onChange={e => setPreferences({ ...preferences, email: e.target.checked })} /><span><strong>Promotional emails</strong><span className="mt-1 block text-sm text-gray-500">Product launches, offers and news, delivered to your inbox.</span></span></label>
      <label className="flex items-start gap-4"><input type="checkbox" className="mt-1" checked={preferences.push} onChange={e => setPreferences({ ...preferences, push: e.target.checked })} /><span><strong>Promotional push notifications</strong><span className="mt-1 block text-sm text-gray-500">Short updates on browsers where you have enabled notifications.</span></span></label>
      <button disabled={busy} onClick={enable} className="rounded-lg border px-4 py-2 text-sm font-semibold">Enable notifications on this browser</button><p className="text-xs text-gray-500">Browser permission: {typeof Notification === 'undefined' ? 'unsupported' : Notification.permission}. Turning off promotions keeps account and order messages available.</p>
      <button disabled={busy} onClick={save} className="rounded-lg bg-[#800020] px-5 py-3 font-semibold text-white">{busy ? 'Please wait…' : 'Save preferences'}</button>
    </div>}{message && <p role="status" className="mt-5 rounded-lg bg-gray-50 p-4 text-sm">{message}</p>}
  </main>;
}
export function EmailUnsubscribePage() {
  const [params] = useSearchParams(), token = params.get('token');
  const [subscribed, setSubscribed] = useState(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { if (!token) return; apiClient.get('/communications/unsubscribe', { params: { token } }).then(res => setSubscribed(res.data.data.subscribed)).catch(error => setMessage(error.response?.data?.message || 'Unable to check your preferences.')); }, [token]);
  const unsubscribe = async () => { setBusy(true); try { await apiClient.post('/communications/unsubscribe', { token }); setSubscribed(false); setMessage('You have been unsubscribed from promotional emails.'); } catch (error) { setMessage(error.response?.data?.message || 'Please try again.'); } finally { setBusy(false); } };
  return <main className="mx-auto max-w-xl px-5 py-20"><h1 className="text-3xl font-bold">Email preferences</h1><p className="my-5 text-gray-600">{subscribed === false ? 'You are not subscribed to promotional emails.' : 'Choose whether you receive ViNexus promotional emails.'}</p>{subscribed && <button disabled={busy} onClick={unsubscribe} className="rounded-lg bg-[#800020] px-5 py-3 text-white">Unsubscribe</button>}{(message || !token) && <p role="status" className="my-5">{message || 'This unsubscribe link is invalid.'}</p>}<Link className="mt-5 block text-[#800020]" to="/account/notifications">Manage all notification preferences</Link></main>;
}
