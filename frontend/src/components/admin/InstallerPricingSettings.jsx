import { useRef, useState } from 'react';
import apiClient from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import { isSuperAdmin } from '../../../../shared/adminAccess.js';
import { applyInstallerPriceIncrease } from '../../../../shared/installerPricing.js';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { SlidersHorizontal } from 'lucide-react';

export default function InstallerPricingSettings() {
  const { adminUser } = useAuth();
  const allowed = isSuperAdmin(adminUser);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const guard = useRef(false);
  const load = async () => {
    setLoading(true); setError('');
    try { const response = await apiClient.get('/admin/dealer-accounts/installer-pricing', { skipGlobalLoader: true }); setDraft(String(response.data.data.installerPriceIncreasePercent)); }
    catch (err) { setError(err.response?.data?.message || 'Could not load installer pricing.'); }
    finally { setLoading(false); }
  };
  const start = () => { setOpen(true); setDraft(''); setNotice(''); load(); };
  const save = async event => {
    event.preventDefault(); if (guard.current || draft.trim() === '') return;
    guard.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const response = await apiClient.put('/admin/dealer-accounts/installer-pricing', { installerPriceIncreasePercent: Number(draft) });
      setDraft(String(response.data.data.installerPriceIncreasePercent)); setNotice('Installer pricing saved for all approved Installer dealers.');
    } catch (err) { setError(err.response?.data?.message || 'Could not save installer pricing. Your change is still here; try again.'); }
    finally { guard.current = false; setBusy(false); }
  };
  if (!allowed) return null;
  const percent = Number(draft);
  const valid = draft.trim() !== '' && Number.isFinite(percent) && percent >= 0 && percent <= 10000;
  return <>
    <Button type="button" size="sm" variant="outline" onClick={start} leftIcon={<SlidersHorizontal className="h-4 w-4" />}>Installer Pricing</Button>
    <Modal isOpen={open} onClose={busy ? undefined : () => setOpen(false)} closeOnOutsideClick={!busy} size="md" title="Installer dealer pricing" description="Set one increase for every approved dealer whose organisation type is Installer. Other dealers keep their existing prices. Only super admins can change this setting.">
    <section aria-label="Installer pricing settings" className="space-y-4">
    {loading ? <p role="status" className="text-sm text-slate-600">Loading installer pricing…</p> : <form onSubmit={save} className="flex flex-wrap items-end gap-4">
      <label className="space-y-1 text-sm font-semibold">Installer price increase (%)<input className="block w-56 max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900" autoFocus type="number" min="0" max="10000" step="0.01" required disabled={busy} value={draft} onChange={event => { setDraft(event.target.value); setNotice(''); }} /></label>
      <Button type="submit" isLoading={busy} disabled={busy || !valid}>Save installer pricing</Button>
      {valid && <p className="pb-2 text-sm text-slate-600">Example: ₹100 dealer price → <strong className="text-slate-900">₹{applyInstallerPriceIncrease(100, percent).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong> for an Installer.</p>}
    </form>}
    {error && <div role="alert" className="text-sm text-rose-700">{error}{draft === '' && !loading && <button type="button" className="ml-3 font-bold underline" onClick={load}>Retry</button>}</div>}
    {notice && <p role="status" className="text-sm font-semibold text-emerald-700">{notice}</p>}
    <div className="flex justify-end"><Button type="button" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Close</Button></div>
    </section>
    </Modal>
  </>;
}
