import StateCityFields from '../address/StateCityFields';
import { ORGANISATION_TYPES } from '../../../../shared/dealerOrganisation.js';
import { lazy, Suspense, useRef, useState } from 'react';
import apiClient from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { isSuperAdmin } from '../../../../shared/adminAccess';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const OfficeLocationPicker = lazy(() => import('../auth/OfficeLocationPicker'));
const organisations = ORGANISATION_TYPES;
const fields = [
  ['companyName', 'Company name', 150, '.{2,150}'], ['gstin', 'GSTIN', 15, '[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]'],
  ['pan', 'PAN number', 10, '[A-Z]{5}[0-9]{4}[A-Z]'], ['aadhaarNumber', 'Aadhaar number', 12, '[0-9]{12}'],
  ['whatsappNumber', 'WhatsApp number', 10, '[6-9][0-9]{9}'], ['address', 'Business address', 255],
  ['city', 'City', 100], ['state', 'State', 100], ['pincode', 'Pincode', 6, '[0-9]{6}'],
  ['msmeNumber', 'Udyam number', 23, 'UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}'],
];
const contactFields = [['fullName', 'Full name', 100], ['email', 'Email address', 254], ['phone', 'Mobile number', 10, '[6-9][0-9]{9}']];
const documents = [['gst', 'GST certificate', false], ['aadhaar', 'Aadhaar card', false], ['msme', 'Udyam certificate', false], ['pan', 'PAN card', false]];
const fieldClass = 'mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900';

export default function DealerEnrollmentAction({ customer, onSaved }) {
  const { adminUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const busyRef = useRef(false);
  if (!isSuperAdmin(adminUser)) return null;
  const converting = !!customer;
  const start = () => {
    const billing = customer?.posBillingProfile || {};
    setForm({ ...Object.fromEntries([...contactFields, ...fields].map(([key]) => [key, billing[key] || ''])),
      organisationType: '', accountStatus: 'active', officeLocation: { latitude: '', longitude: '', formattedAddress: '' } });
    setFiles({}); setError(''); setOpen(true);
  };
  const save = async event => {
    event.preventDefault();
    if (busyRef.current) return;
    const hasLatitude = form.officeLocation.latitude !== '';
    const hasLongitude = form.officeLocation.longitude !== '';
    if (hasLatitude !== hasLongitude) { setError('Provide both latitude and longitude, or leave the office location blank.'); return; }
    busyRef.current = true; setBusy(true); setError('');
    try {
      const details = converting ? Object.fromEntries([...fields.map(([key]) => key), 'organisationType', 'officeLocation'].map(key => [key, form[key]])) : { ...form };
      if (!hasLatitude && !hasLongitude) delete details.officeLocation;
      if (!details.organisationType) delete details.organisationType;
      const payload = new FormData(); payload.append('details', JSON.stringify(details));
      for (const [type, file] of Object.entries(files)) if (file) payload.append(type, file);
      const response = await apiClient.post(converting ? `/admin/customers/${customer._id}/convert-to-dealer` : '/admin/dealer-accounts', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      setOpen(false); setFiles({}); setForm({}); onSaved?.(response.data?.data?.user);
    } catch (err) { setError(err.response?.data?.message || 'Could not approve this dealer. Your details are still here; please try again.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const chooseFile = (type, event) => {
    const file = event.target.files?.[0];
    setFiles(current => ({ ...current, [type]: undefined }));
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { event.target.value = ''; setError('Each document must be 5 MB or smaller.'); return; }
    setError(''); setFiles(current => ({ ...current, [type]: file }));
  };
  return <>
    <Button size="sm" onClick={start}>{converting ? 'Convert to Dealer' : 'Create Dealer'}</Button>
    <Modal isOpen={open} onClose={busy ? undefined : () => setOpen(false)} closeOnOutsideClick={!busy} size="xl" title={converting ? 'Convert Customer to Dealer' : 'Create Dealer Account'} description="Add the business details and any available documents. GSTIN is required. Other additional details and document uploads are optional. The dealer will be approved immediately, with you recorded as the verifying super admin.">
      <form onSubmit={save} className="space-y-5">
        {converting && <p className="rounded-lg bg-gray-50 p-3 text-sm">Converting <strong>{customer.fullName || customer.name}</strong> ({customer.email || customer.phone}). The existing account, sign-in details and history are retained. Existing sessions will be signed out.</p>}
        <fieldset disabled={busy} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {[...(converting ? [] : contactFields), ...fields].filter(([key]) => !['city', 'state'].includes(key)).map(([key, label, maxLength, pattern]) => <label key={key} className="text-sm font-medium">{label}{['fullName', 'email', 'phone', 'companyName', 'gstin'].includes(key) ? ' *' : ' (optional)'}
              <input className={fieldClass} type={key === 'email' ? 'email' : ['phone', 'whatsappNumber'].includes(key) ? 'tel' : 'text'} required={['fullName', 'email', 'phone', 'companyName', 'gstin'].includes(key)} value={form[key] || ''} maxLength={maxLength} minLength={['fullName', 'companyName'].includes(key) ? 2 : undefined} pattern={pattern} autoComplete={key === 'aadhaarNumber' ? 'off' : undefined} onChange={e => setForm(current => ({ ...current, [key]: ['gstin', 'pan', 'msmeNumber'].includes(key) ? e.target.value.toUpperCase() : e.target.value }))} />
            </label>)}
            <StateCityFields value={form} onChange={setForm} disabled={busy} />
            <label className="text-sm font-medium">Organisation type (optional)<select className={fieldClass} value={form.organisationType || ''} onChange={e => setForm(current => ({ ...current, organisationType: e.target.value }))}><option value="">Select organisation type</option>{organisations.map(value => <option key={value}>{value}</option>)}</select></label>
            {!converting && <label className="text-sm font-medium">Account status<select className={fieldClass} value={form.accountStatus || 'active'} onChange={e => setForm(current => ({ ...current, accountStatus: e.target.value }))}>{['active', 'pending', 'blocked'].map(value => <option key={value}>{value}</option>)}</select></label>}
          </div>
          <Suspense fallback={<p role="status">Loading office map…</p>}><OfficeLocationPicker required={false} value={form.officeLocation || { latitude: '', longitude: '' }} onChange={officeLocation => setForm(current => ({ ...current, officeLocation }))} disabled={busy} /></Suspense>
          <section aria-label="Dealer document uploads" className="space-y-3">
            <h3 className="font-semibold">Verification documents</h3>
            <p className="text-xs text-gray-500">Upload clear PDF, JPG, PNG, WebP or SVG documents, up to 5 MB each.</p>
            {documents.map(([type, label, required]) => <label key={type} className="block rounded-lg border p-3 text-sm font-medium">{label} ({required ? 'required' : 'optional'})<input type="file" required={required} accept="application/pdf,image/jpeg,image/png,image/webp,image/svg+xml" className="mt-2 block w-full min-w-0 text-xs file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-2 file:text-white" onChange={e => chooseFile(type, e)} /></label>)}
          </section>
        </fieldset>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : converting ? 'Convert & Approve Dealer' : 'Create & Approve Dealer'}</Button></div>
      </form>
    </Modal>
  </>;
}
