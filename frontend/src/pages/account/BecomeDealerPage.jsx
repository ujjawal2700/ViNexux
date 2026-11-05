import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUp, CheckCircle2 } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import dealerService from '../../services/dealerService';
const OfficeLocationPicker = lazy(() => import('../../components/auth/OfficeLocationPicker'));
const organisations = ['Proprietorship', 'Partnership', 'Limited Liability Partnership (LLP)', 'Private Limited Company', 'Limited Company', 'Others'];
const fields = [
  ['companyName', 'Company / firm name', '.{2,150}', 150], ['gstin', 'GSTIN', '[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]', 15],
  ['pan', 'PAN number', '[A-Z]{5}[0-9]{4}[A-Z]', 10], ['msmeNumber', 'Udyam number (optional)', 'UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}', 23],
  ['whatsappNumber', 'WhatsApp number', '[6-9][0-9]{9}', 10], ['aadhaarNumber', 'Aadhaar number', '[0-9]{12}', 12],
  ['address', 'Business address', '.+', 255], ['city', 'City', '.+', 100], ['state', 'State', '.+', 100], ['pincode', 'Pincode', '[0-9]{6}', 6],
];
const initial = () => ({ ...Object.fromEntries(fields.map(([key]) => [key, ''])), organisationType: '', officeLocation: { latitude: '', longitude: '', formattedAddress: '' } });
const input = 'mt-2 block w-full rounded-lg border border-[var(--store-border)] bg-[var(--store-surface)] p-3 text-sm font-normal';
const button = 'rounded-lg bg-[var(--store-primary)] px-5 py-3 text-sm font-bold text-white disabled:opacity-50';
export default function BecomeDealerPage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const formRef = useRef(null);
  const load = useCallback(async (prefill = false) => {
    try {
      const response = await dealerService.getApplication();
      const saved = response.data?.profile || null;
      setProfile(saved);
      if (prefill && saved) setForm(current => ({ ...current, ...Object.fromEntries(Object.keys(current).filter(key => key !== 'aadhaarNumber').map(key => [key, saved[key] ?? current[key]])) }));
      if (saved?.status === 'approved' && user?.role === 'customer') await refreshUser();
    } catch (error) { setError(error.response?.data?.message || 'Unable to load your application.'); }
    finally { setLoading(false); }
  }, [refreshUser, user?.role]);
  useEffect(() => { load(true); }, [load]);
  useEffect(() => {
    if (profile?.applicationState !== 'submitted' || profile.status !== 'pending') return undefined;
    const timer = window.setInterval(() => load(), 15000);
    return () => window.clearInterval(timer);
  }, [load, profile?.applicationState, profile?.status]);
  const approved = profile?.status === 'approved' || user?.role === 'dealer';
  const pending = profile?.applicationState === 'submitted' && profile?.status === 'pending';
  const validate = () => {
    if (!formRef.current?.reportValidity()) return false;
    if (form.officeLocation.latitude === '' || form.officeLocation.longitude === '') { setError('Select your office location on the map.'); return false; }
    return true;
  };
  const save = async event => {
    event.preventDefault(); if (!validate()) return;
    setBusy(true); setError(''); setNotice('');
    try { const response = await dealerService.saveApplication(form); setProfile(response.data.profile); setNotice('Business details saved. Upload your documents, then submit for verification.'); }
    catch (error) { setError(error.response?.data?.message || 'Unable to save your business details.'); }
    finally { setBusy(false); }
  };
  const upload = async (type, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Each document must be 5 MB or smaller.'); return; }
    setUploading(type); setError(''); setNotice('');
    try { const response = await dealerService.uploadApplicationDocument(type, file); setProfile(response.data.profile); setNotice('Document uploaded.'); }
    catch (error) { setError(error.response?.data?.message || 'Unable to upload this document.'); }
    finally { setUploading(null); }
  };
  const submit = async () => {
    if (!validate()) return;
    setBusy(true); setError(''); setNotice('');
    try { await dealerService.saveApplication(form); const response = await dealerService.submitApplication(); setProfile(response.data.profile); setNotice('Your application has been submitted for verification.'); }
    catch (error) { setError(error.response?.data?.message || 'Unable to submit your application.'); }
    finally { setBusy(false); }
  };
  const hasRequiredDocs = ['gst', 'aadhaar'].every(type => profile?.kycDocuments?.some(doc => doc.type === type && doc.url));
  if (loading) return <main className="mx-auto max-w-3xl p-6" role="status">Loading your dealer application…</main>;
  return <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
    <Link to="/account/profile" className="text-sm font-semibold text-[var(--store-primary)]">Back to my account</Link>
    <h1 className="text-2xl font-bold sm:text-3xl">Become a Dealer</h1>
    <p className="text-sm leading-6 text-[var(--store-muted)]">Add your business details and KYC documents to your existing account. You keep your customer access and order history while we review your application. Dealer access begins after approval.</p>
    <div className="rounded-xl border border-[var(--store-border)] p-4 text-sm"><strong>{user?.fullName || user?.name}</strong><p className="mt-1">{user?.email} {user?.phone && `· ${user.phone}`}</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    {approved ? <section className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"><h2 className="text-xl font-bold">You're now a dealer</h2><p>Your application is approved. Your existing account now has dealer access.</p><Link to="/account/profile" className="inline-block font-bold underline">View dealer account</Link></section>
    : pending ? <section className="space-y-3 rounded-xl border border-[var(--store-border)] p-5"><h2 className="text-xl font-bold">Application under review</h2><p className="text-sm leading-6">You can continue using your customer account. Your role will change to dealer once your application is approved.</p><button className={button} onClick={() => load()}>Check application status</button></section>
    : <>
      {profile?.status === 'rejected' && <p role="status" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Application rejected: {profile.rejectionReason || 'Please review and resubmit your details.'}</p>}
      <form ref={formRef} onSubmit={save} className="space-y-5 rounded-xl border border-[var(--store-border)] p-5">
        <h2 className="text-lg font-bold">1. Business details</h2>
        <fieldset disabled={busy || !!uploading} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">Organisation type *<select required className={input} value={form.organisationType} onChange={event => setForm({ ...form, organisationType: event.target.value })}><option value="">Select organisation type</option>{organisations.map(type => <option key={type}>{type}</option>)}</select></label>
            {fields.map(([key, label, pattern, maxLength]) => <label key={key} className="text-xs font-semibold">{label}{key !== 'msmeNumber' && ' *'}<input required={key !== 'msmeNumber'} pattern={pattern} maxLength={maxLength} type={key === 'aadhaarNumber' ? 'password' : 'text'} autoComplete="off" className={input} value={form[key]}
              onChange={event => setForm({ ...form, [key]: ['gstin', 'pan', 'msmeNumber'].includes(key) ? event.target.value.toUpperCase() : event.target.value })} /></label>)}
          </div>
          <p className="text-xs text-[var(--store-muted)]">Re-enter your Aadhaar number when returning to edit an application. Saved Aadhaar numbers are kept private.</p>
          <Suspense fallback={<p>Loading office map…</p>}><OfficeLocationPicker value={form.officeLocation} onChange={location => setForm(current => ({ ...current, officeLocation: location }))} disabled={busy || !!uploading} /></Suspense>
          <button className={button} type="submit">{busy ? 'Saving…' : 'Save business details'}</button>
        </fieldset>
      </form>
      <section aria-label="Dealer document uploads" className="space-y-4 rounded-xl border border-[var(--store-border)] bg-[var(--store-surface)] p-5 shadow-sm">
        <h2 className="text-lg font-bold">2. Upload documents</h2>
        <p className="text-sm leading-6 text-[var(--store-muted)]">Upload a clear photo or PDF. JPG, PNG, WebP, SVG and PDF files are accepted, up to 5 MB each.</p>
        {!profile || profile.applicationState !== 'draft' ? <p className="rounded-lg border border-[var(--store-border)] bg-[var(--store-background)] p-3 text-sm font-medium">Save your business details above to enable the Choose file buttons.</p> : null}
        {['gst', 'aadhaar', 'msme'].map(type => {
          const doc = profile?.kycDocuments?.find(doc => doc.type === type);
          return <label key={type} className="block rounded-xl border-2 border-[var(--store-border)] bg-[var(--store-surface)] p-4 text-sm font-semibold sm:p-5">
            <span className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2"><FileUp aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--store-primary)]" />{{ gst: 'GST certificate (required)', aadhaar: 'Aadhaar card (required)', msme: 'Udyam certificate (optional)' }[type]}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${doc ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                {doc && <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />}{uploading === type ? 'Uploading…' : doc ? 'Uploaded' : 'Not uploaded'}
              </span>
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml,application/pdf" disabled={!profile || profile.applicationState !== 'draft' || busy || !!uploading}
              className="mt-4 block w-full min-w-0 rounded-lg border border-[var(--store-border)] bg-[var(--store-surface)] p-2 text-xs font-normal text-[var(--store-text)] file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[var(--store-primary)] file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-primary)] disabled:opacity-100 disabled:file:cursor-not-allowed disabled:file:bg-slate-200 disabled:file:text-slate-600"
              onChange={event => { upload(type, event.target.files[0]); event.target.value = ''; }} />
          </label>;
        })}
      </section>
      <button className={`${button} w-full`} disabled={!hasRequiredDocs || busy || !!uploading || profile?.applicationState !== 'draft'} onClick={submit}>{busy ? 'Submitting…' : 'Submit for dealer verification'}</button>
    </>}
  </main>;
}
