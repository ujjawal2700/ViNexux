import { ORGANISATION_TYPES } from '../../../../shared/dealerOrganisation.js';
import DealerEnrollmentAction from './DealerEnrollmentAction';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProductImageMimeType } from '../../../../shared/productImageTypes.js';
import apiClient from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { isSuperAdmin } from '../../../../shared/adminAccess';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import Button from '../ui/Button';

const documentFields = [['gst', 'GST certificate'], ['aadhaar', 'Aadhaar card'], ['msme', 'Udyam certificate'], ['pan', 'PAN card']];
const commonFields = [['fullName', 'Full name', true], ['email', 'Email address', true], ['phone', 'Mobile number', true], ['address', 'Address']];
const dealerFields = [['companyName', 'Company name', true], ['gstin', 'GSTIN'], ['pan', 'PAN'], ['whatsappNumber', 'WhatsApp number'], ['city', 'City'], ['state', 'State'], ['pincode', 'Pincode']];
const limits = { fullName: 100, email: 254, phone: 10, address: 255, companyName: 150, gstin: 15, pan: 10, whatsappNumber: 10, city: 100, state: 100, pincode: 6 };

export default function AccountManagementActions({ role, record, onSaved, layout = 'inline', showDelete = true }) {
  const { adminUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});
  const [files, setFiles] = useState({});
  const saving = useRef(false);
  const fileInputs = useRef({});
  if (!isSuperAdmin(adminUser)) return null;
  const dealer = role === 'dealer';
  if (dealer && !record) return <DealerEnrollmentAction onSaved={onSaved} />;
  const label = dealer ? 'Dealer' : 'Customer';
  const base = dealer ? '/admin/dealer-accounts' : '/admin/customers';
  const user = dealer ? record?.userId : record;
  const fields = [...commonFields, ...(dealer ? dealerFields : [])];
  const start = () => {
    const values = Object.fromEntries(fields.map(([key]) => [key, (commonFields.some(([name]) => name === key) ? user?.[key] : record?.[key]) || '']));
    if (dealer) values.address = record?.address || user?.address || '';
    setForm({ ...values, accountStatus: user?.accountStatus || 'active', ...(dealer ? { organisationType: record?.organisationType || 'Proprietorship' } : {}) });
    setFiles({}); setError(''); setOpen(true);
  };
  const save = async event => {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true; setBusy(true); setError('');
    try {
      if (record && dealer && Object.values(files).some(Boolean)) {
        const payload = new FormData(); payload.append('details', JSON.stringify(form));
        for (const [type, file] of Object.entries(files)) if (file) payload.append(type, file);
        await apiClient.put(`${base}/${record._id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else if (record) await apiClient.put(`${base}/${record._id}`, form);
      else await apiClient.post(base, form);
      setOpen(false); setFiles({}); onSaved?.();
    } catch (err) { setError(err.response?.data?.message || 'Could not save the account. Check the details and try again.'); }
    finally { saving.current = false; setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setError('');
    try { await apiClient.delete(`${base}/${record._id}`); setRemoving(false); onSaved?.(); }
    catch (err) { setRemoving(false); setError(err.response?.data?.message || 'Could not delete the account.'); }
    finally { setBusy(false); }
  };
  return <>
    <span className={layout === 'grid' ? 'contents' : 'inline-flex flex-wrap items-center gap-2'}>
      <Button size="sm" variant={record ? 'outline' : 'primary'} className="min-h-9 text-sm" onClick={start}>{record ? 'Edit' : `Create ${label}`}</Button>
      {record && showDelete && <Button size="sm" variant="outline" className="min-h-9 border-rose-200 text-sm text-rose-700 hover:bg-rose-50" onClick={() => { setError(''); setRemoving(true); }}>Delete</Button>}
    </span>
    {error && !open && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    <Modal isOpen={open} onClose={busy ? undefined : () => setOpen(false)} closeOnOutsideClick={!busy} size="lg" title={`${record ? 'Edit' : 'Create'} ${label} Account`} description="Contact changes reset verification and sign out existing sessions.">
      <form onSubmit={save} className="space-y-4">
        {dealer && record && <Link to={`/admin/dealer-accounts/${record._id}`} className="inline-flex text-sm font-semibold text-primary underline" onClick={event => { if (busy) event.preventDefault(); else setOpen(false); }}>Open Dealer Profile</Link>}
        <fieldset disabled={busy} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([key, title, required]) => <label key={key} className="space-y-1 text-sm font-medium">{title}{required ? ' *' : ' (optional)'}
            <input className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900" type={key === 'email' ? 'email' : ['phone', 'whatsappNumber'].includes(key) ? 'tel' : 'text'} value={form[key] || ''} required={required} maxLength={limits[key]} minLength={['fullName', 'companyName'].includes(key) ? 2 : undefined} pattern={['phone', 'whatsappNumber'].includes(key) ? '[6-9][0-9]{9}' : key === 'pincode' ? '[0-9]{6}' : undefined} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} />
          </label>)}
          {dealer && <label className="space-y-1 text-sm font-medium">Organisation type<select aria-label="Organisation type" className="block w-full rounded-lg border p-2" value={form.organisationType} onChange={e => setForm(prev => ({ ...prev, organisationType: e.target.value }))}>{ORGANISATION_TYPES.map(value => <option key={value}>{value}</option>)}</select></label>}
          <label className="space-y-1 text-sm font-medium">Account status<select className="block w-full rounded-lg border p-2" value={form.accountStatus} onChange={e => setForm(prev => ({ ...prev, accountStatus: e.target.value }))}>{['active', 'pending', 'blocked'].map(value => <option key={value}>{value}</option>)}</select></label>
        </div>
        {dealer && <section aria-label="Dealer document uploads" className="space-y-3 border-t pt-4">
          <h3 className="text-base font-semibold">Dealer documents</h3>
          <p className="text-sm text-gray-600">All documents are optional. Add missing documents or replace an existing file. Replacements take effect when you save the account.</p>
          <p className="text-xs text-gray-500">PDF, JPG, PNG, WebP or SVG; up to 5 MB per document.</p>
          <div className="grid gap-3 sm:grid-cols-2">{documentFields.map(([type, title]) => {
            const current = record?.kycDocuments?.find(document => document.type === type);
            return <div key={type} className="min-w-0 space-y-2 rounded-lg border p-3">
              <p className="text-sm font-semibold">{title}</p>
              {current?.url ? <a href={current.url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-primary underline">View current {title}</a> : <p className="text-xs text-gray-500">No document uploaded</p>}
              <label className="block text-sm font-medium">{current?.url ? 'Replace' : 'Upload'} {title} (optional)
                <input ref={input => { fileInputs.current[type] = input; }} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/svg+xml" className="mt-2 block w-full min-w-0 text-xs file:mr-2 file:rounded file:border file:bg-white file:px-2 file:py-2" onChange={event => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024 || !(getProductImageMimeType(file.name, file.type) || (/\.pdf$/i.test(file.name) && file.type === 'application/pdf'))) {
                    event.target.value = ''; setError('Choose a PDF, JPG, PNG, WebP or SVG document up to 5 MB.'); return;
                  }
                  setError(''); setFiles(previous => ({ ...previous, [type]: file }));
                }} />
              </label>
              {files[type] && <div className="flex flex-wrap items-center gap-2 text-xs"><span className="break-all">Selected: {files[type].name}</span><button type="button" className="text-primary underline" onClick={() => { setFiles(previous => ({ ...previous, [type]: undefined })); if (fileInputs.current[type]) fileInputs.current[type].value = ''; }}>Clear {title} selection</button></div>}
            </div>;
          })}</div>
        </section>}
        </fieldset>
        {!record && <p className="text-xs text-gray-500">The account holder signs in using the existing OTP login with their email or mobile number.</p>}
        {error && <p role="alert" className="text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : record ? 'Save Account' : dealer ? 'Create & Approve Dealer' : 'Create Customer'}</Button></div>
      </form>
    </Modal>
    <ConfirmDialog isOpen={removing} onClose={busy ? undefined : () => setRemoving(false)} onConfirm={remove} isLoading={busy} variant="danger" title={`Delete ${label} Account`} confirmText="Delete Account" message={`Permanently delete ${user?.fullName || record?.companyName || 'this account'}? Their sign-in, saved cart and dealer access will be removed. Historical enquiries and invoices will remain. This cannot be undone.`} />
  </>;
}
