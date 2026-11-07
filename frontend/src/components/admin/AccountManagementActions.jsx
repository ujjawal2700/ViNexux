import { useState } from 'react';
import apiClient from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { isSuperAdmin } from '../../../../shared/adminAccess';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import Button from '../ui/Button';

const commonFields = [['fullName', 'Full name', true], ['email', 'Email address', true], ['phone', 'Mobile number', true], ['address', 'Address']];
const dealerFields = [['companyName', 'Company name', true], ['gstin', 'GSTIN'], ['pan', 'PAN'], ['whatsappNumber', 'WhatsApp number'], ['city', 'City'], ['state', 'State'], ['pincode', 'Pincode']];
const limits = { fullName: 100, email: 254, phone: 10, address: 255, companyName: 150, gstin: 15, pan: 10, whatsappNumber: 10, city: 100, state: 100, pincode: 6 };

export default function AccountManagementActions({ role, record, onSaved }) {
  const { adminUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});
  if (!isSuperAdmin(adminUser)) return null;
  const dealer = role === 'dealer';
  const label = dealer ? 'Dealer' : 'Customer';
  const base = dealer ? '/admin/dealer-accounts' : '/admin/customers';
  const user = dealer ? record?.userId : record;
  const fields = [...commonFields, ...(dealer ? dealerFields : [])];
  const start = () => {
    const values = Object.fromEntries(fields.map(([key]) => [key, (commonFields.some(([name]) => name === key) ? user?.[key] : record?.[key]) || '']));
    if (dealer) values.address = record?.address || user?.address || '';
    setForm({ ...values, accountStatus: user?.accountStatus || 'active', ...(dealer ? { organisationType: record?.organisationType || 'Proprietorship' } : {}) });
    setError(''); setOpen(true);
  };
  const save = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (record) await apiClient.put(`${base}/${record._id}`, form);
      else await apiClient.post(base, form);
      setOpen(false); onSaved?.();
    } catch (err) { setError(err.response?.data?.message || 'Could not save the account. Check the details and try again.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setError('');
    try { await apiClient.delete(`${base}/${record._id}`); setRemoving(false); onSaved?.(); }
    catch (err) { setRemoving(false); setError(err.response?.data?.message || 'Could not delete the account.'); }
    finally { setBusy(false); }
  };
  return <>
    <span className="inline-flex flex-wrap items-center gap-1">
      <Button size="sm" variant={record ? 'ghost' : 'primary'} onClick={start}>{record ? 'Edit' : `Create ${label}`}</Button>
      {record && <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => { setError(''); setRemoving(true); }}>Delete</Button>}
    </span>
    {error && !open && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    <Modal isOpen={open} onClose={busy ? undefined : () => setOpen(false)} closeOnOutsideClick={!busy} size="lg" title={`${record ? 'Edit' : 'Create'} ${label} Account`} description={dealer && !record ? 'This dealer will be approved immediately, with you recorded as the verifying super admin. No document upload is required.' : 'Contact changes reset verification and sign out existing sessions.'}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([key, title, required]) => <label key={key} className="space-y-1 text-sm font-medium">{title}{required ? ' *' : ' (optional)'}
            <input className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900" type={key === 'email' ? 'email' : ['phone', 'whatsappNumber'].includes(key) ? 'tel' : 'text'} value={form[key] || ''} required={required} maxLength={limits[key]} minLength={['fullName', 'companyName'].includes(key) ? 2 : undefined} pattern={['phone', 'whatsappNumber'].includes(key) ? '[6-9][0-9]{9}' : key === 'pincode' ? '[0-9]{6}' : undefined} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} />
          </label>)}
          {dealer && <label className="space-y-1 text-sm font-medium">Organisation type<select className="block w-full rounded-lg border p-2" value={form.organisationType} onChange={e => setForm(prev => ({ ...prev, organisationType: e.target.value }))}>{['Proprietorship', 'Partnership', 'Limited Liability Partnership (LLP)', 'Private Limited Company', 'Limited Company', 'Others'].map(value => <option key={value}>{value}</option>)}</select></label>}
          <label className="space-y-1 text-sm font-medium">Account status<select className="block w-full rounded-lg border p-2" value={form.accountStatus} onChange={e => setForm(prev => ({ ...prev, accountStatus: e.target.value }))}>{['active', 'pending', 'blocked'].map(value => <option key={value}>{value}</option>)}</select></label>
        </div>
        {!record && <p className="text-xs text-gray-500">The account holder signs in using the existing OTP login with their email or mobile number.</p>}
        {error && <p role="alert" className="text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : record ? 'Save Account' : dealer ? 'Create & Approve Dealer' : 'Create Customer'}</Button></div>
      </form>
    </Modal>
    <ConfirmDialog isOpen={removing} onClose={busy ? undefined : () => setRemoving(false)} onConfirm={remove} isLoading={busy} variant="danger" title={`Delete ${label} Account`} confirmText="Delete Account" message={`Permanently delete ${user?.fullName || record?.companyName || 'this account'}? Their sign-in, saved cart and dealer access will be removed. Historical enquiries and invoices will remain. This cannot be undone.`} />
  </>;
}
