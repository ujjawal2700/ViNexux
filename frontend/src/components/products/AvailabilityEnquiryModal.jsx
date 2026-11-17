import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import enquiryService from '../../services/enquiryService';

export default function AvailabilityEnquiryModal({ product, variantId, isOpen, onClose }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(null);
  const guard = useRef(false);
  const close = () => { if (guard.current) return; setMessage(''); setError(''); setSaved(null); onClose(); };
  const submit = async event => {
    event.preventDefault();
    if (guard.current) return;
    if (!message.trim()) { setError('Please enter a description.'); return; }
    guard.current = true; setBusy(true); setError('');
    try {
      const response = await enquiryService.createAvailabilityEnquiry({ productId: product._id, ...(variantId ? { variantId } : {}), message: message.trim() });
      setSaved(response.data.enquiry);
    } catch (err) { setError(err.response?.data?.message || 'Could not send your enquiry. Please try again.'); }
    finally { guard.current = false; setBusy(false); }
  };
  return <Modal isOpen={isOpen} onClose={busy ? undefined : close} closeOnOutsideClick={!busy} title="Out-of-stock enquiry" description={product?.name}>
    {saved ? <div role="status" className="space-y-3"><p>Your enquiry has been sent.</p><Link className="font-semibold text-primary underline" to={`/account/enquiries/${saved._id}`}>View enquiry and responses</Link></div> : <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-semibold">Description *<textarea required maxLength={1000} rows={5} value={message} onChange={event => setMessage(event.target.value)} disabled={busy} className="mt-2 block w-full rounded-lg border border-gray-300 p-3 font-normal" placeholder="Describe what you would like to know about this product…" /></label>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send enquiry'}</Button>
    </form>}
  </Modal>;
}
