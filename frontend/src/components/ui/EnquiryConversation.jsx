import { useRef, useState } from 'react';
import Button from './Button';

export default function EnquiryConversation({ enquiry, onSend, admin = false }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const guard = useRef(false);
  const messages = [...(enquiry.customerReplies || []).map(reply => ({ ...reply, sender: 'ViNexus Support' })), ...(enquiry.customerMessages || []).map(reply => ({ ...reply, sender: admin ? 'Customer' : 'You' }))]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const send = async event => {
    event.preventDefault(); if (guard.current || !message.trim()) return;
    guard.current = true; setBusy(true); setError('');
    try { await onSend(message.trim()); setMessage(''); }
    catch (err) { setError(err.response?.data?.message || 'Message could not be sent. Please try again.'); }
    finally { guard.current = false; setBusy(false); }
  };
  return <section aria-label="Enquiry conversation" className="space-y-4 rounded-xl border border-slate-300 bg-white p-5">
    <h2 className="font-bold text-slate-900">Messages & responses</h2>
    {messages.length ? <div className="space-y-3">{messages.map((reply, index) => <article key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-600"><strong>{reply.sender}</strong><time>{new Date(reply.createdAt).toLocaleString('en-IN')}</time></div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-900">{reply.message}</p>
    </article>)}</div> : <p className="text-sm text-slate-600">Waiting for a response from our team.</p>}
    {onSend && <form onSubmit={send} className="space-y-3"><label className="block text-sm font-semibold">{admin ? 'Response to customer' : 'Send message'}<textarea required maxLength={1000} rows={3} value={message} onChange={event => setMessage(event.target.value)} disabled={busy} className="mt-2 block w-full rounded-lg border border-slate-300 p-3 font-normal" placeholder={admin ? 'Write your response…' : 'Add a description or follow-up question…'} /></label>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <Button type="submit" disabled={busy || !message.trim()}>{busy ? 'Sending…' : admin ? 'Send response' : 'Send message'}</Button>
    </form>}
  </section>;
}
