import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Receipt, Download, ExternalLink, Phone, ArrowRight } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useLogoutConfirmation from '../../hooks/useLogoutConfirmation';
import customerInvoiceService from '../../services/customerInvoiceService';
import { saveBlob } from '../../services/posService';

const currency = amount => Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
const date = value => new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50';

export default function InvoicesPage({ embedded = false }) {
  const { user, isAuthenticated, isLoading, sendOtp } = useAuth();
  const confirmLogout = useLogoutConfirmation();
  const navigate = useNavigate(), location = useLocation(), { token } = useParams();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [page, setPage] = useState(1), [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ invoices: [], pages: 0, total: 0 });
  const validReference = token && /^[a-f\d]{64}$/.test(token) ? token : undefined;
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let active = true;
    setLoading(true); setError('');
    customerInvoiceService.list({ page, ...(validReference ? { reference: validReference } : {}) })
      .then(result => { if (active) setData(result); })
      .catch(err => { if (active) setError(err.response?.data?.message || 'Could not load your invoices. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isAuthenticated, isLoading, user?._id, page, validReference, version]);

  const requestOtp = async event => {
    event.preventDefault(); setError('');
    const digits = phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!/^[6-9]\d{9}$/.test(digits)) { setError('Enter the 10-digit mobile number used for your purchase.'); return; }
    setBusy(true);
    try {
      const result = await sendOtp(digits, 'customer', 'login');
      if (!result.success) throw new Error(result.message || 'Could not send verification code.');
      navigate('/verify-otp', { state: { identifier: digits, portal: 'customer', from: location.pathname,
        mockOtpEnabled: result.data?.mockOtpEnabled, mockOtp: result.data?.mockOtp,
        resendAvailableInSeconds: result.data?.resendAvailableInSeconds } });
    } catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setBusy(false); }
  };
  const openPdf = async (invoice, download) => {
    // Open synchronously so browser popup blockers do not block the PDF viewer.
    const viewer = download ? null : window.open('about:blank', '_blank');
    if (viewer) viewer.opener = null;
    setBusy(true); setError('');
    try {
      const { data: pdf } = await customerInvoiceService.pdf(invoice._id);
      if (download) saveBlob(pdf, `${invoice.invoiceNumber.replaceAll('/', '-')}.pdf`);
      else {
        const url = URL.createObjectURL(pdf);
        if (viewer) viewer.location.href = url;
        else saveBlob(pdf, `${invoice.invoiceNumber.replaceAll('/', '-')}.pdf`);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch { viewer?.close(); setError('Could not open this invoice. Please retry or contact the store.'); }
    finally { setBusy(false); }
  };
  const cards = data.selected && !data.invoices.some(invoice => invoice._id === data.selected._id)
    ? [data.selected, ...data.invoices] : data.invoices;

  return <section className={embedded ? 'space-y-6' : 'mx-auto max-w-5xl space-y-6 px-4 py-10 sm:py-14'}>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">VI NEXUS · Customer records</p>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{isAuthenticated ? 'My invoices' : 'Find your invoices'}</h1>
        <p className="mt-2 text-sm text-gray-500">{isAuthenticated ? `Purchase history for ${user?.name || 'your account'}. View or download your original invoices.` : 'Enter the mobile number used at the store. Verify the SMS code to access your invoices.'}</p></div>
      {isAuthenticated && !embedded && <div className="flex flex-wrap gap-2"><Link className={button} to="/account/profile">My account <ArrowRight size={16} /></Link>
        <button className={button} disabled={busy} onClick={async () => { if (!await confirmLogout()) return; setPage(1); setData({ invoices: [], pages: 0, total: 0 }); setError(''); }}>Use another number</button></div>}
    </header>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}
      {isAuthenticated && <button onClick={() => setVersion(v => v + 1)} className="ml-3 font-semibold underline">Retry</button>}</div>}
    {isLoading ? <p role="status">Loading your account…</p> : !isAuthenticated ? <form onSubmit={requestOtp} className="max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <Phone className="mb-4 text-primary" size={24} /><label htmlFor="invoice-phone" className="text-sm font-semibold text-gray-800">Mobile number</label>
      <div className="mt-2 flex items-center rounded-lg border border-gray-300"><span className="border-r px-4 text-sm text-gray-500">+91</span>
        <input id="invoice-phone" type="tel" inputMode="tel" autoComplete="tel-national" required maxLength={16} value={phone} disabled={busy}
          onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" className="min-w-0 flex-1 rounded-r-lg px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary" /></div>
      <button disabled={busy} className={`${button} mt-5 w-full border-primary bg-primary text-white`}>{busy ? 'Sending code…' : 'Send verification code'}</button>
      <p className="mt-4 text-xs leading-5 text-gray-500">Your invoices are private. We verify your number before showing purchase details.</p>
      <Link to="/login" state={{ from: { pathname: location.pathname } }} className="mt-4 inline-block text-sm font-semibold text-primary">Sign in to your account</Link>
    </form> : loading ? <p role="status" className="py-10 text-gray-500">Loading invoices…</p> : <>
      {validReference && !data.selected && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">The shared invoice is not associated with this account. Sign in with the mobile number used for that purchase.</p>}
      {!cards.length ? <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center"><Receipt className="mx-auto mb-3 text-gray-400" size={32} />
        <h2 className="font-semibold">No invoices yet</h2><p className="mt-2 text-sm text-gray-500">Invoices from your store purchases will appear here.</p></div>
        : <div className="space-y-4">{cards.map(invoice => <article key={invoice._id} className={`rounded-xl border bg-white p-5 sm:p-6 ${invoice._id === data.selected?._id ? 'border-primary ring-1 ring-primary' : 'border-gray-200'}`}>
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-bold text-gray-900">{invoice.invoiceNumber}</h2>
            <p className="mt-1 text-xs text-gray-500">{date(invoice.createdAt)} · In-store purchase</p></div>
            <div className="text-right"><p className="text-lg font-bold">{currency(invoice.total)}</p><p className={`mt-1 text-xs font-semibold ${invoice.status === 'voided' ? 'text-rose-600' : 'text-emerald-700'}`}>{invoice.status === 'voided' ? 'Voided' : invoice.returnedAmount > 0 ? 'Return recorded' : 'Completed'}</p></div></div>
          <p className="mt-4 text-sm leading-6 text-gray-600">{invoice.items.map(item => `${item.productName} × ${item.quantity}`).join(' · ')}</p>
          {invoice.returnedAmount > 0 && <p className="mt-2 text-xs text-gray-500">Returns: {currency(invoice.returnedAmount)}. The original invoice is retained.</p>}
          <div className="mt-5 flex flex-wrap gap-3"><button disabled={busy} className={button} onClick={() => openPdf(invoice, false)}><ExternalLink size={16} />View invoice</button>
            <button disabled={busy} className={`${button} border-primary bg-primary text-white`} onClick={() => openPdf(invoice, true)}><Download size={16} />Download PDF</button></div>
        </article>)}</div>}
      {data.pages > 1 && <nav aria-label="Invoice pages" className="flex items-center justify-between gap-4"><button className={button} disabled={page === 1 || busy} onClick={() => setPage(p => p - 1)}>Previous</button>
        <span className="text-sm text-gray-500">Page {page} of {data.pages}</span><button className={button} disabled={page >= data.pages || busy} onClick={() => setPage(p => p + 1)}>Next</button></nav>}
    </>}
  </section>;
}
