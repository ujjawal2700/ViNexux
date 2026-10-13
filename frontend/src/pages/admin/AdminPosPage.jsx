import { useLocation } from 'react-router-dom';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Minus, Trash2, Receipt, Pause, Printer, Download, MessageCircle, Package, X, ArrowRight, RotateCcw, Settings2, History, ShoppingCart, UserRound, ChevronLeft, ChevronRight, ScanLine, CheckCircle2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import NumberInput from '../../components/ui/NumberInput';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { validatePosDraft, validatePosCustomer, validatePosItems, posFieldLabel } from '../../../../shared/posValidation.js';
import posService, { saveBlob } from '../../services/posService';
import { calculatePosBill, buildPosWhatsAppLink, POS_SELLER_DEFAULTS } from '../../../../shared/posBilling.js';

const rupees = value => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
const displayDate = value => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
const normalizedPhone = value => { const digits = String(value || '').replace(/\D/g, ''); return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits; };
const blankCustomer = () => ({ name: '', phone: '', whatsappNumber: '', email: '', address: '', city: '', state: 'Rajasthan', stateCode: '08', pincode: '', gstin: '' });
const blankDraft = () => ({ customer: blankCustomer(), delivery: {}, items: [], taxMode: 'inclusive', roundOff: true, notes: '' });
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
const primaryClass = `${buttonClass} !bg-primary !border-primary !text-white hover:!bg-primary/90`;
const fieldClass = 'w-full min-w-0 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50';
const Field = ({ label, value, onChange, type = 'text', required = false, className = '', error = '', ...props }) => {
  const Control = type === 'number' ? NumberInput : 'input';
  const generatedId = React.useId();
  const inputId = props.id || generatedId;
  return <label htmlFor={inputId} className={`block min-w-0 space-y-1.5 ${className}`}><span className="block text-xs font-medium text-slate-600">{label}{required && ' *'}</span><Control id={inputId} aria-label={`${label}${required ? ' *' : ''}`} aria-describedby={error ? `${inputId}-error` : undefined} aria-invalid={!!error} className={`${fieldClass} ${error ? '!border-rose-500' : ''}`} value={value ?? ''} onChange={e => onChange(e.target.value)} type={type} required={required} {...props} />{error && <span id={`${inputId}-error`} role="alert" className="block text-xs text-rose-700">{error}</span>}</label>;
};
const ErrorNotice = ({ notice }) => notice?.type === 'error' ? <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{notice.message}</p> : null;
const CustomerFields = ({ value, onChange, shipping = false, verification = null, disabled = false, errors = {} }) => {
  const change = (key, next) => onChange({ ...value, [key]: next });
  return <div className="grid grid-cols-2 gap-3">
    <Field disabled={disabled} label={shipping ? 'Consignee name' : 'Customer name'} data-pos-field={`${shipping ? 'shipping' : 'customer'}.name`} error={errors.name} value={value.name} onChange={v => change('name', v)} required maxLength={100} className="col-span-2" />
    <Field disabled={disabled} label="Phone" data-pos-field={`${shipping ? 'shipping' : 'customer'}.phone`} error={errors.phone} value={value.phone} onChange={v => change('phone', v)} required type="tel" maxLength={20} />
    <Field disabled={disabled} label="WhatsApp number" data-pos-field={`${shipping ? 'shipping' : 'customer'}.whatsappNumber`} error={errors.whatsappNumber} value={value.whatsappNumber} onChange={v => change('whatsappNumber', v)} required type="tel" maxLength={20} />
    {verification && <div className="col-span-2">{verification}</div>}
    <button disabled={disabled} className="col-span-2 w-fit text-xs font-medium text-primary" type="button" onClick={() => change('whatsappNumber', value.phone)}>Use phone number for WhatsApp</button>
    <Field disabled={disabled} label="Full street address" data-pos-field={`${shipping ? 'shipping' : 'customer'}.address`} error={errors.address} value={value.address} onChange={v => change('address', v)} required maxLength={500} className="col-span-2" />
    <Field disabled={disabled} label="City" data-pos-field={`${shipping ? 'shipping' : 'customer'}.city`} error={errors.city} value={value.city} onChange={v => change('city', v)} required maxLength={100} />
    <Field disabled={disabled} label="PIN code" data-pos-field={`${shipping ? 'shipping' : 'customer'}.pincode`} error={errors.pincode} value={value.pincode} onChange={v => change('pincode', v)} required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} />
    <Field disabled={disabled} label="State / place of supply" data-pos-field={`${shipping ? 'shipping' : 'customer'}.state`} error={errors.state} value={value.state} onChange={v => change('state', v)} required maxLength={100} />
    <Field disabled={disabled} label="GST state code" data-pos-field={`${shipping ? 'shipping' : 'customer'}.stateCode`} error={errors.stateCode} value={value.stateCode} onChange={v => change('stateCode', v)} required inputMode="numeric" pattern="[0-9]{2}" maxLength={2} />
    <Field disabled={disabled} label="Email (optional)" data-pos-field={`${shipping ? 'shipping' : 'customer'}.email`} error={errors.email} value={value.email} onChange={v => change('email', v)} type="email" maxLength={150} />
    <Field disabled={disabled} label="GSTIN (optional for B2C)" data-pos-field={`${shipping ? 'shipping' : 'customer'}.gstin`} error={errors.gstin} value={value.gstin} onChange={v => change('gstin', v.toUpperCase())} maxLength={15} />
  </div>;
};
const paymentMethods = ['cash', 'upi', 'bank'];
const Status = ({ sale }) => <span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${sale.status === 'voided' ? 'bg-rose-50 text-rose-700' : sale.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{sale.status === 'voided' ? 'Voided' : sale.paymentStatus === 'paid' ? 'Paid' : sale.paymentStatus === 'partial' ? 'Part paid' : 'Unpaid'}</span>;

export default function AdminPosPage() {
  const location = useLocation();
  const customerSearch = new URLSearchParams(location.search).get('customer') || '';
  const [tab, setTab] = useState(customerSearch ? 'sales' : 'checkout');
  const [seller, setSeller] = useState(POS_SELLER_DEFAULTS);
  const [draft, setDraft] = useState(blankDraft);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState('');
  const [catalogueVersion, setCatalogueVersion] = useState(0);
  const [held, setHeld] = useState([]);
  const [heldId, setHeldId] = useState(null);
  const [heldOpen, setHeldOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerTab, setCustomerTab] = useState('billing');
  const [customerCheck, setCustomerCheck] = useState({ status: 'idle', phone: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [mockOtp, setMockOtp] = useState('');
  const resolvedCustomerPhone = useRef('');
  const [tenderOpen, setTenderOpen] = useState(false);
  const [payments, setPayments] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [paymentCorrection, setPaymentCorrection] = useState(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [notice, setNotice] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [sale, setSale] = useState(null);
  const [saleAction, setSaleAction] = useState(null);
  const [filters, setFilters] = useState({ search: customerSearch, from: '', to: '', status: 'all', paymentStatus: 'all', page: 1 });
  const [register, setRegister] = useState({ sales: [], total: 0, pages: 0, summary: {} });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerVersion, setRegisterVersion] = useState(0);
  const searchRef = useRef(null);
  const bill = useMemo(() => calculatePosBill(draft.items, { ...draft, interstate: draft.customer.stateCode !== seller.stateCode }), [draft, seller.stateCode]);
  const customerPhone = normalizedPhone(draft.customer.phone);
  const errorsFor = prefix => Object.fromEntries(Object.entries(fieldErrors).filter(([path]) => path.startsWith(`${prefix}.`)).map(([path, message]) => [path.slice(prefix.length + 1), message]));
  const showIssues = (issues, message = 'Correct the highlighted fields before continuing.') => {
    setFieldErrors(Object.fromEntries(issues.map(issue => [issue.path, issue.message])));
    setNotice({ type: 'error', message: issues.length ? issues.map(issue => `${posFieldLabel(issue.path, draft.items)}: ${issue.message}`).join(' · ') : message });
    const scope = issues[0]?.path?.split('.')[0];
    if (tenderOpen) setPaymentCorrection(['customer', 'shipping', 'items'].includes(scope) ? scope : null);
    else if (scope === 'customer' || scope === 'shipping') { setCustomerTab(scope === 'shipping' ? 'shipping' : 'billing'); setCustomerOpen(true); }
    else if (scope === 'seller') setTab('settings');
    if (issues[0]?.path) setTimeout(() => document.querySelector(`[data-pos-field="${issues[0].path}"]`)?.focus(), 200);
  };
  const notifyError = error => {
    const body = error.response?.data;
    const details = body?.details || body?.error?.details || [];
    if (details.length) showIssues(details);
    else setNotice({ type: 'error', message: body?.message || error.message || 'Could not complete this action.' });
  };
  const run = async task => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await task(); } catch (error) { notifyError(error); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const refreshHeld = useCallback(async () => { setHeld(await posService.held()); }, []);
  useEffect(() => {
    let active = true;
    Promise.all([posService.settings(), posService.held()]).then(([settings, bills]) => { if (active) { setSeller(settings); setHeld(bills); } }).catch(error => { if (active) notifyError(error); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setProductLoading(true); setProductError('');
      try { const result = await posService.products(search); if (active) setProducts(result); }
      catch (error) { if (active) setProductError(error.response?.data?.message || 'Could not load products.'); }
      finally { if (active) setProductLoading(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search, catalogueVersion]);
  useEffect(() => {
    if (tab !== 'sales') return;
    let active = true;
    const timer = setTimeout(async () => {
      setRegisterLoading(true); setRegisterError('');
      try { const data = await posService.sales(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))); if (active) setRegister(data); }
      catch (error) { if (active) setRegisterError(error.response?.data?.message || 'Could not load the sales register.'); }
      finally { if (active) setRegisterLoading(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [tab, filters, registerVersion]);
  useEffect(() => {
    if (!customerOpen && !(tenderOpen && paymentCorrection === 'customer')) return;
    const phone = customerPhone;
    let active = true;
    const timer = setTimeout(async () => {
      setOtpSent(false); setOtpCode(''); setMockOtp('');
      if (!/^[6-9]\d{9}$/.test(phone)) { setCustomerCheck({ status: 'idle', phone }); return; }
      setCustomerCheck({ status: 'checking', phone });
      try {
        const result = await posService.lookupCustomer(phone);
        if (!active) return;
        if (result.found) setDraft(prev => ({ ...prev, customer: result.customer }));
        setOtpSent(!!result.otpPending); setOtpCooldown(result.resendAvailableInSeconds || 0);
        resolvedCustomerPhone.current = phone;
        setCustomerCheck({ status: result.found ? 'existing' : result.verified ? 'verified' : 'new', phone });
      } catch (error) { if (active) { setCustomerCheck({ status: 'error', phone }); notifyError(error); } }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [customerPhone, customerOpen, tenderOpen, paymentCorrection]);
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => setOtpCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);
  useEffect(() => {
    const protect = event => { if (draft.items.length) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [draft.items.length]);
  const patch = values => setDraft(prev => ({ ...prev, ...values }));
  const changeCustomer = customer => {
    if (busy) return;
    if (normalizedPhone(customer.phone) !== customerPhone) {
      setCustomerCheck({ status: 'idle', phone: '' }); setOtpSent(false); setOtpCode(''); setMockOtp(''); setOtpCooldown(0);
      if (resolvedCustomerPhone.current && resolvedCustomerPhone.current !== normalizedPhone(customer.phone)) {
        customer = { ...blankCustomer(), phone: customer.phone };
      }
    }
    setFieldErrors(prev => Object.fromEntries(Object.entries(prev).filter(([path]) => !path.startsWith('customer.'))));
    patch({ customer });
  };
  const saveCustomerDetails = async () => {
    const issues = [...validatePosCustomer(draft.customer), ...(draft.shipping ? validatePosCustomer(draft.shipping, 'shipping') : [])];
    if (issues.length) { showIssues(issues); return; }
    if (customerCheck.phone !== customerPhone || !['existing', 'verified'].includes(customerCheck.status)) {
      throw new Error('Verify the new customer phone number before saving.');
    }
    let result;
    try { result = await posService.saveCustomer({ ...draft.customer, phone: customerPhone }); }
    catch (error) {
      if (error.response?.status === 403 && error.response?.data?.message?.startsWith('Verify the new customer')) {
        setCustomerCheck({ status: 'new', phone: customerPhone }); setOtpSent(false);
      }
      throw error;
    }
    patch({ customer: result.customer });
    resolvedCustomerPhone.current = customerPhone;
    setCustomerCheck({ status: 'existing', phone: customerPhone });
    setCustomerOpen(false); setPaymentCorrection(null); setFieldErrors({}); setNotice({ type: 'success', message: 'Customer details saved to the customer list.' });
  };
  const sendCustomerOtp = () => run(async () => {
    setNotice(null);
    const result = await posService.sendCustomerOtp(customerPhone);
    if (result.existing) {
      patch({ customer: result.customer }); setCustomerCheck({ status: 'existing', phone: customerPhone }); return;
    }
    setOtpSent(true); setOtpCooldown(result.resendAvailableInSeconds || 0); setMockOtp(result.mockOtp || '');
  });
  const verifyCustomerOtp = () => run(async () => {
    setNotice(null); await posService.verifyCustomerOtp(customerPhone, otpCode);
    setCustomerCheck({ status: 'verified', phone: customerPhone });
    setOtpCode('');
  });
  const customerVerification = <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
    {customerCheck.status === 'checking' && <p role="status" className="text-slate-500">Checking the customer list…</p>}
    {customerCheck.status === 'idle' && <p className="text-slate-500">Enter a mobile number to load saved customer details automatically.</p>}
    {customerCheck.status === 'existing' && <p role="status" className="text-emerald-700">Existing customer. Saved details loaded; no OTP required. Complete any missing fields.</p>}
    {customerCheck.status === 'verified' && <p role="status" className="text-emerald-700">Phone verified. Save details to add this customer to the customer list.</p>}
    {customerCheck.status === 'new' && <><p className="text-slate-600">New customer. Verify this phone number before saving.</p>
      {otpSent && <div className="flex items-end gap-2"><Field label="Verification code" value={otpCode} onChange={value => setOtpCode(value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} disabled={busy} /><button type="button" className={primaryClass} disabled={busy || otpCode.length !== 6} onClick={verifyCustomerOtp}>Verify OTP</button></div>}
      <button type="button" className={buttonClass} disabled={busy || otpCooldown > 0} onClick={sendCustomerOtp}>{otpSent ? otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend OTP' : 'Send OTP'}</button>
      {mockOtp && <p className="text-amber-700">Test OTP: {mockOtp} (mock SMS delivery is enabled).</p>}
    </>}
    {customerCheck.status === 'error' && <p className="text-rose-700">Could not check this customer. Correct the number or reopen the form to retry.</p>}
  </div>;
  const updateItem = (id, values) => setDraft(prev => ({ ...prev, items: prev.items.map(item => item.productId === id ? { ...item, ...values } : item) }));
  const addProduct = product => {
    if (busy) return;
    const existing = draft.items.find(i => i.productId === product._id);
    const quantity = (existing?.quantity || 0) + 1;
    if (quantity > product.stockQuantity) { setNotice({ type: 'error', message: `${product.name}: only ${product.stockQuantity} in stock.` }); return; }
    if (existing) updateItem(product._id, { quantity });
    else {
      const spec = key => product.specifications?.find(s => key.test(s.key))?.value || '';
      patch({ items: [...draft.items, { productId: product._id, productName: product.name, sku: product.sku, modelNumber: product.modelNumber,
        quantity: 1, unitPrice: product.standardPrice, stockQuantity: product.stockQuantity, discountPercent: 0,
        gstRate: Number.isFinite(Number.parseFloat(spec(/^gst(?:\s*rate)?$/i))) ? Number.parseFloat(spec(/^gst(?:\s*rate)?$/i)) : 18, hsn: spec(/^hsn(?:\/sac|\s*code)?$/i).replace(/\D/g, ''), unit: 'NOS', serialNumbers: [] }] });
    }
  };
  const salePayload = (payment = payments[0]) => ({ ...draft, requestId,
    items: draft.items.map(({ stockQuantity: _stock, productName: _name, sku: _sku, modelNumber: _model, serialInput: _serial, ...item }) => item),
    payments: [{ ...payment, amount: bill.total }],
  });
  const startTender = () => run(async () => {
    const issues = validatePosDraft(draft);
    if (issues.length) { showIssues(issues); return; }
    if (customerCheck.phone !== normalizedPhone(draft.customer.phone) || !['existing', 'verified'].includes(customerCheck.status)) {
      showIssues([{ path: 'customer.phone', message: 'Verify the new customer phone number and save customer details before checkout.' }]); return;
    }
    const payment = { method: 'cash', reference: '', requestId: crypto.randomUUID() };
    const ready = await posService.validateSale(salePayload(payment));
    if (ready.seller) setSeller(ready.seller);
    setFieldErrors({}); setNotice(null); setPaymentCorrection(null);
    setPayments([payment]); setTenderOpen(true);
  });
  useEffect(() => {
    const handler = event => {
      if (busy || customerOpen || tenderOpen || heldOpen || sale || confirm || saleAction) return;
      if (event.key === 'F2') { event.preventDefault(); setTab('checkout'); searchRef.current?.focus(); }
      if (event.key === 'F4') { event.preventDefault(); setCustomerOpen(true); }
      if (event.key === 'F8' && tab === 'checkout') { event.preventDefault(); startTender(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
  const resetDraft = () => { setDraft(blankDraft()); setRequestId(crypto.randomUUID()); setHeldId(null); setCustomerCheck({ status: 'idle', phone: '' }); setFieldErrors({}); setPaymentCorrection(null); resolvedCustomerPhone.current = ''; };
  const completeSale = async () => {
    const issues = validatePosDraft(draft);
    if (issues.length) { showIssues(issues); return; }
    const payload = salePayload();
    const completed = await posService.createSale(payload);
    setSale(completed); setTenderOpen(false); resetDraft(); setCatalogueVersion(v => v + 1); setRegisterVersion(v => v + 1);
    setNotice({ type: 'success', message: `Invoice ${completed.invoiceNumber} saved. Stock updated.` });
    if (heldId) { await posService.removeHeld(heldId); await refreshHeld(); }
  };
  const holdBill = () => run(async () => {
    if (!draft.items.length) throw new Error('Add at least one product before holding a bill.');
    await posService.hold({ ...draft, requestId }, draft.customer.name || `${draft.items.length} product bill`);
    if (heldId) await posService.removeHeld(heldId);
    resetDraft(); await refreshHeld(); setNotice({ type: 'success', message: 'Bill held. Stock is checked when the sale is completed.' });
  });
  const openInvoice = (record, print = false) => {
    const popup = window.open('', '_blank');
    if (!popup) { setNotice({ type: 'error', message: 'Allow pop-ups to open and print the invoice.' }); return; }
    popup.document.title = 'Loading invoice'; popup.document.body.textContent = 'Preparing invoice…';
    run(async () => {
      try {
        const response = await posService.invoice(record._id);
        const url = URL.createObjectURL(response.data);
        popup.location.href = url;
        if (print) { popup.onload = () => { try { popup.focus(); popup.print(); } catch { /* PDF viewer also exposes its own Print control. */ } }; }
        setTimeout(() => URL.revokeObjectURL(url), 300000);
      } catch (error) { popup.close(); throw error; }
    });
  };
  const changeFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  const saleUpdated = record => { setSale(record); setSaleAction(null); setCatalogueVersion(v => v + 1); setRegisterVersion(v => v + 1); setNotice({ type: 'success', message: 'Sales register updated.' }); };
  const actionSubmit = async () => {
    const action = saleAction;
    if (action.type === 'void') saleUpdated(await posService.voidSale(sale._id, action.reason));
    else if (action.type === 'return') {
      const items = Object.entries(action.quantities || {}).filter(([, qty]) => Number(qty) > 0).map(([productId, qty]) => ({ productId, quantity: Number(qty) }));
      if (!items.length) throw new Error('Select at least one item to return.');
      saleUpdated(await posService.returnItems(sale._id, { requestId: action.requestId, reason: action.reason, items }));
    } else {
      const data = { method: action.method, amount: Number(action.amount), reference: action.reference, requestId: action.requestId };
      saleUpdated(await (action.type === 'refund' ? posService.refund(sale._id, data) : posService.payment(sale._id, data)));
    }
  };
  const beginAction = type => { setNotice(null); setSaleAction({ type, requestId: crypto.randomUUID(), reason: '', reference: '', method: 'cash', amount: type === 'refund' ? sale.refundDue : sale.balanceDue, quantities: {} }); };
  return <div className="mx-auto max-w-[1600px] space-y-5 text-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500"><Receipt size={14} /> Retail operations / Offline sales</div><h1 className="text-2xl font-semibold tracking-tight">Offline POS Billing</h1><p className="mt-1 text-sm text-slate-500">Counter sales, customer invoices and stock in one workspace.</p></div>
      <div className="flex rounded-lg border border-slate-200 bg-white p-1">{[['checkout', ShoppingCart, 'New sale'], ['sales', History, 'Sales register'], ['settings', Settings2, 'Invoice setup']].map(([key, Icon, label]) => <button type="button" key={key} disabled={busy} onClick={() => setTab(key)} className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${tab === key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><Icon size={15} />{label}</button>)}</div>
    </div>
    {notice && <div role={notice.type === 'error' ? 'alert' : 'status'} className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}><span>{notice.message}</span><button aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={16} /></button></div>}

    {tab === 'checkout' && <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Product catalogue</h2><button title="Refresh stock" aria-label="Refresh stock" disabled={busy} onClick={() => setCatalogueVersion(v => v + 1)} className="text-slate-500"><RotateCcw size={14} /></button></div><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={16} /><input ref={searchRef} aria-label="Search products or scan SKU" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { const exact = products.find(p => [p.sku, p.modelNumber].some(v => v?.toLowerCase() === search.trim().toLowerCase())); if (exact) { addProduct(exact); setSearch(''); } } }} placeholder="Search name, SKU or model…" className={`${fieldClass} !pl-9`} /></div><p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400"><ScanLine size={12} /> Scan a SKU, then press Enter <span className="ml-auto">F2</span></p></div>
        <div className="max-h-[650px] divide-y divide-slate-100 overflow-y-auto">
          {productLoading && <p className="p-5 text-sm text-slate-500">Loading catalogue…</p>}
          {!productLoading && productError && <div role="alert" className="p-4 text-sm text-rose-700">{productError}<button className="mt-2 block underline" onClick={() => setCatalogueVersion(v => v + 1)}>Retry</button></div>}
          {!productLoading && !productError && !products.length && <p className="p-5 text-sm text-slate-500">No matching products.</p>}
          {!productError && products.map(product => <button type="button" key={product._id} disabled={busy || product.stockQuantity < 1} onClick={() => addProduct(product)} className="group flex w-full items-center gap-3 p-3.5 text-left hover:bg-slate-50 disabled:opacity-50"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-slate-100 bg-slate-50">{product.images?.[0]?.url ? <img src={product.images[0].url} alt="" className="h-10 w-10 object-contain" /> : <Package size={22} className="text-slate-300" />}</div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-semibold leading-5">{product.name}</p><p className="truncate text-[10px] text-slate-400">{product.sku}</p><div className="mt-1 flex justify-between gap-2"><span className="text-xs font-semibold">{rupees(product.standardPrice)}</span><span className={`text-[10px] ${product.stockQuantity ? 'text-slate-500' : 'text-rose-600'}`}>{product.stockQuantity ? `${product.stockQuantity} in stock` : 'Out of stock'}</span></div></div><Plus size={15} className="text-primary" /></button>)}
        </div>
      </section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className="text-sm font-semibold">Current bill <span className="ml-2 font-normal text-slate-400">{draft.items.length} items</span></h2><p className="mt-1 text-[11px] text-slate-400">{heldId ? 'Resumed held bill' : 'B2C counter sale'} · Invoice number assigned on completion</p></div><div className="flex gap-2"><button className={buttonClass} disabled={busy} onClick={() => setHeldOpen(true)}><Pause size={14} />Held ({held.length})</button><button className={buttonClass} disabled={busy || !draft.items.length} onClick={holdBill}>Hold bill</button><button aria-label="Clear bill" title="Clear bill" className={buttonClass} disabled={busy || !draft.items.length} onClick={() => setConfirm({ type: 'clear' })}><Trash2 size={14} /></button></div></div>
        <button type="button" disabled={busy} onClick={() => { setCustomerTab('billing'); setCustomerOpen(true); }} className="flex w-full items-center gap-3 border-b border-slate-200 bg-slate-50/60 px-5 py-4 text-left hover:bg-slate-50"><div className="rounded-lg border border-slate-200 bg-white p-2"><UserRound size={18} className="text-slate-500" /></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{draft.customer.name || 'Add customer details'}</p><p className="mt-1 truncate text-xs text-slate-500">{draft.customer.phone ? `${draft.customer.phone} · ${draft.customer.city || 'Address required'}` : 'Name, phone, WhatsApp and billing address'}</p></div><span className="text-[11px] text-slate-400">F4</span><ChevronRight size={16} className="text-slate-400" /></button>
        {!draft.items.length ? <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center"><ShoppingCart size={36} strokeWidth={1.3} className="mb-4 text-slate-300" /><h3 className="text-sm font-semibold">Ready for the next customer</h3><p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">Search the catalogue or scan a product SKU to start a bill.</p><button className={`${buttonClass} mt-4`} onClick={() => searchRef.current?.focus()}>Find a product <ArrowRight size={14} /></button></div> : <div className="divide-y divide-slate-100">{draft.items.map((item, index) => <div key={item.productId} className="space-y-3 px-5 py-4">
          <div className="flex items-start gap-3"><span className="mt-0.5 text-xs text-slate-400">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0 flex-1"><p className="text-xs font-semibold leading-5">{item.productName}</p><p className="text-[10px] text-slate-400">{item.sku}</p></div><div className="shrink-0 text-right"><p className="text-sm font-semibold">{rupees(bill.items[index].lineTotal)}</p>{bill.items[index].discountAmount > 0 && <p className="mt-1 text-[10px] text-emerald-700">Discount {rupees(bill.items[index].discountAmount)} ({item.discountPercent}%)</p>}</div><button disabled={busy} aria-label={`Remove ${item.productName}`} onClick={() => patch({ items: draft.items.filter(i => i.productId !== item.productId) })} className="text-slate-400 hover:text-rose-600"><X size={15} /></button></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div><span className="mb-1.5 block text-xs font-medium text-slate-600">Quantity</span><div className="flex rounded-md border border-slate-200"><button className="px-2" aria-label={`Decrease ${item.productName} quantity`} disabled={busy || item.quantity <= 1} onClick={() => updateItem(item.productId, { quantity: item.quantity - 1 })}><Minus size={12} /></button><NumberInput data-pos-field={`items.${index}.quantity`} aria-invalid={!!fieldErrors[`items.${index}.quantity`]} aria-label={`${item.productName} quantity`} className="w-full min-w-0 border-x border-slate-200 py-2 text-center text-sm outline-none" type="number" min="1" max={item.stockQuantity} value={item.quantity} disabled={busy} onChange={e => updateItem(item.productId, { quantity: Math.max(1, Math.min(item.stockQuantity, Number(e.target.value) || 1)) })} /><button className="px-2" aria-label={`Increase ${item.productName} quantity`} disabled={busy || item.quantity >= item.stockQuantity} onClick={() => updateItem(item.productId, { quantity: item.quantity + 1 })}><Plus size={12} /></button></div>{fieldErrors[`items.${index}.quantity`] && <p role="alert" className="mt-1 text-xs text-rose-700">{fieldErrors[`items.${index}.quantity`]}</p>}</div><Field data-pos-field={`items.${index}.unitPrice`} error={fieldErrors[`items.${index}.unitPrice`]} label="Unit price (₹)" type="number" min="0" step="0.01" value={item.unitPrice} disabled={busy} onChange={v => updateItem(item.productId, { unitPrice: Math.max(0, Number(v)) })} /><Field data-pos-field={`items.${index}.discountPercent`} error={fieldErrors[`items.${index}.discountPercent`]} label="Discount (%)" type="number" min="0" max="100" step="0.01" value={item.discountPercent} disabled={busy} onChange={v => updateItem(item.productId, { discountPercent: Math.min(100, Math.max(0, Number(v))) })} /><Field data-pos-field={`items.${index}.gstRate`} error={fieldErrors[`items.${index}.gstRate`]} label="GST (%)" type="number" min="0" max="100" step="0.01" value={item.gstRate} disabled={busy} onChange={v => updateItem(item.productId, { gstRate: Math.min(100, Math.max(0, Number(v))) })} /></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[120px_70px_minmax(0,1fr)]"><Field data-pos-field={`items.${index}.hsn`} error={fieldErrors[`items.${index}.hsn`]} label="HSN / SAC (GST classification) *" title="HSN classifies goods; SAC classifies services for GST. Use the code from the product or supplier invoice." value={item.hsn} inputMode="numeric" maxLength={8} disabled={busy} onChange={v => updateItem(item.productId, { hsn: v.replace(/\D/g, '') })} /><Field data-pos-field={`items.${index}.unit`} error={fieldErrors[`items.${index}.unit`]} label="Unit" value={item.unit} maxLength={10} disabled={busy} onChange={v => updateItem(item.productId, { unit: v.toUpperCase() })} /><Field data-pos-field={`items.${index}.serialNumbers`} error={fieldErrors[`items.${index}.serialNumbers`]} label="Serial numbers (comma separated)" className="col-span-2 sm:col-span-1" value={item.serialInput ?? item.serialNumbers.join(', ')} disabled={busy} onChange={v => updateItem(item.productId, { serialInput: v, serialNumbers: v.split(',').map(s => s.trim()).filter(Boolean) })} /></div>
        </div>)}</div>}
        <div className="space-y-4 border-t border-slate-200 bg-slate-50/60 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs text-slate-500">Prices<select aria-label="Tax pricing mode" value={draft.taxMode} onChange={e => patch({ taxMode: e.target.value })} disabled={busy} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"><option value="inclusive">Include GST</option><option value="exclusive">Exclude GST</option></select></label><label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={draft.roundOff} disabled={busy} onChange={e => patch({ roundOff: e.target.checked })} />Round to nearest rupee</label></div><div className="grid gap-5 sm:grid-cols-2"><div><label className="block text-xs font-medium text-slate-500">Bill notes<textarea aria-label="Bill notes" className={`${fieldClass} mt-2 resize-none`} rows={3} maxLength={1000} value={draft.notes} onChange={e => patch({ notes: e.target.value })} disabled={busy} placeholder="Internal note, delivery or warranty details…" /></label><button onClick={() => { setCustomerTab('shipping'); setCustomerOpen(true); }} className="mt-2 text-xs font-medium text-primary">Shipping address</button></div><dl className="space-y-2 text-xs"><div className="flex justify-between"><dt className="text-slate-500">Item subtotal ({draft.taxMode === 'inclusive' ? 'incl. GST' : 'excl. GST'})</dt><dd>{rupees(bill.itemsTotal)}</dd></div><div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd>−{rupees(bill.discountTotal)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Taxable amount after discount</dt><dd>{rupees(bill.subtotal)}</dd></div>{draft.customer.stateCode !== seller.stateCode ? <div className="flex justify-between"><dt className="text-slate-500">IGST</dt><dd>{rupees(bill.igst)}</dd></div> : <><div className="flex justify-between"><dt className="text-slate-500">CGST</dt><dd>{rupees(bill.cgst)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">SGST</dt><dd>{rupees(bill.sgst)}</dd></div></>}<div className="flex justify-between"><dt className="text-slate-500">Round off</dt><dd>{rupees(bill.roundOffAmount)}</dd></div><div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-semibold"><dt>Total</dt><dd>{rupees(bill.total)}</dd></div></dl></div><button className={`${primaryClass} w-full !py-3 !text-sm`} disabled={busy || !draft.items.length} onClick={startTender}><Receipt size={17} />Proceed to payment <span className="ml-auto text-xs font-normal opacity-70">F8</span></button></div>
      </section>
    </div>}

    {tab === 'sales' && <div className="space-y-5"><div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{[['Net sales', register.summary.netSales], ['Net received', register.summary.collected], ['Refunds due', register.summary.refundsDue]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold tracking-tight">{rupees(value)}</p><p className="mt-1 text-[10px] text-slate-400">For the selected filters</p></div>)}</div><section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-4"><Field label="Search invoices / customer / phone" className="min-w-48 flex-1" value={filters.search} onChange={v => changeFilter('search', v)} /><Field label="From (IST)" type="date" value={filters.from} onChange={v => changeFilter('from', v)} /><Field label="To (IST)" type="date" value={filters.to} onChange={v => changeFilter('to', v)} /><label className="space-y-1.5 text-xs text-slate-600">Status<select className={`${fieldClass} block`} value={filters.status} onChange={e => changeFilter('status', e.target.value)}><option value="all">All sales</option><option value="completed">Completed</option><option value="voided">Voided</option></select></label><button className={buttonClass} disabled={busy} onClick={() => run(async () => { const result = await posService.export(Object.fromEntries(Object.entries(filters).filter(([key, v]) => key !== 'page' && v !== ''))); saveBlob(result.data, 'vinexus-offline-sales.xlsx'); })}><Download size={14} />Export Excel</button></div>{registerError && <div role="alert" className="p-4 text-sm text-rose-700">{registerError}<button className="ml-3 underline" onClick={() => setRegisterVersion(v => v + 1)}>Retry</button></div>}<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr>{['Invoice / date', 'Customer', 'Items', 'Total', 'Status', ''].map((label, i) => <th key={i} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{registerLoading ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading sales…</td></tr> : register.sales.map(record => <tr key={record._id} className="hover:bg-slate-50/50"><td className="px-4 py-4"><p className="font-semibold">{record.invoiceNumber}</p><p className="mt-1 text-[10px] text-slate-400">{displayDate(record.createdAt)}</p></td><td className="px-4 py-4"><p className="font-medium">{record.customer.name}</p><p className="mt-1 text-slate-400">{record.customer.phone}</p></td><td className="px-4 py-4">{record.totalQuantity}</td><td className="px-4 py-4 font-semibold">{rupees(record.total)}</td><td className="px-4 py-4"><Status sale={record} />{record.returnedAmount > 0 && <p className="mt-1 text-[10px] text-slate-400">Returned {rupees(record.returnedAmount)}</p>}</td><td className="px-4 py-4"><button className="font-semibold text-primary" disabled={busy} onClick={() => run(async () => setSale(await posService.sale(record._id)))}>View invoice</button></td></tr>)}{!registerLoading && !register.sales.length && <tr><td colSpan={6} className="p-12 text-center text-slate-400">No offline sales match these filters.</td></tr>}</tbody></table></div><div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500"><span>{register.total} invoices · Page {filters.page} of {Math.max(1, register.pages)}</span><div className="flex gap-2"><button aria-label="Previous page" className={buttonClass} disabled={filters.page <= 1 || registerLoading} onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}><ChevronLeft size={14} /></button><button aria-label="Next page" className={buttonClass} disabled={filters.page >= register.pages || registerLoading} onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}><ChevronRight size={14} /></button></div></div></section></div>}

    {tab === 'settings' && <form onSubmit={e => { e.preventDefault(); run(async () => { setSeller(await posService.saveSettings(seller)); setNotice({ type: 'success', message: 'Invoice setup saved. Existing invoices retain their original seller details.' }); }); }} className="max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-200 px-6 py-5"><h2 className="text-sm font-semibold">Invoice identity & bank details</h2><p className="mt-1 text-xs text-slate-500">Pre-filled from the supplied invoice. Review before your first sale.</p></div><div className="grid gap-4 p-6 sm:grid-cols-2">{[['name', 'Business name'], ['invoicePrefix', 'Invoice prefix'], ['address', 'Business address'], ['gstin', 'GSTIN'], ['state', 'State'], ['stateCode', 'GST state code'], ['email', 'Email'], ['phone', 'Phone'], ['accountHolder', 'Bank account holder'], ['bankName', 'Bank name'], ['accountNumber', 'Account number'], ['branch', 'Branch'], ['ifsc', 'IFSC'], ['jurisdiction', 'Jurisdiction']].map(([key, label]) => <Field key={key} label={label} value={seller[key]} error={fieldErrors[`seller.${key}`]} disabled={busy} onChange={v => setSeller(p => ({ ...p, [key]: v }))} required={['name', 'invoicePrefix', 'address', 'gstin', 'state', 'stateCode', 'email'].includes(key)} type={key === 'email' ? 'email' : 'text'} />)}<label className="col-span-full text-xs font-medium text-slate-600">Declaration (one condition per line)<textarea className={`${fieldClass} mt-2`} rows={5} disabled={busy} value={seller.declarations.join('\n')} onChange={e => setSeller(p => ({ ...p, declarations: e.target.value.split('\n') }))} /></label></div><div className="flex justify-end border-t border-slate-200 px-6 py-4"><button type="submit" className={primaryClass} disabled={busy}>{busy ? 'Saving…' : 'Save invoice setup'}</button></div></form>}

    <Modal isOpen={customerOpen} onClose={() => !busy && setCustomerOpen(false)} title="Customer & delivery details" description="Billing details are captured on the invoice. GSTIN is optional for B2C customers." size="lg" footer={<button className={primaryClass} form="pos-customer-form" type="submit" disabled={busy || customerCheck.phone !== customerPhone || !['existing', 'verified'].includes(customerCheck.status)}>{busy ? 'Saving…' : 'Save details'}</button>}><ErrorNotice notice={notice} /><form noValidate id="pos-customer-form" onSubmit={e => { e.preventDefault(); run(saveCustomerDetails); }}><div className="mb-5 flex gap-4 border-b border-slate-200">{[['billing', 'Bill to'], ['shipping', 'Ship to']].map(([key, label]) => <button type="button" key={key} onClick={() => setCustomerTab(key)} className={`pb-3 text-xs font-semibold ${customerTab === key ? 'border-b-2 border-primary text-primary' : 'text-slate-400'}`}>{label}</button>)}</div>{customerTab === 'billing' && <div className="space-y-5"><CustomerFields value={draft.customer} onChange={changeCustomer} verification={customerVerification} disabled={busy} errors={errorsFor('customer')} /></div>}{customerTab === 'shipping' && <div className="space-y-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!draft.shipping} onChange={e => { if (e.target.checked) { const next = { ...draft }; delete next.shipping; setDraft(next); } else patch({ shipping: { ...draft.customer } }); }} />Same as billing address</label>{draft.shipping && <CustomerFields shipping errors={errorsFor('shipping')} value={draft.shipping} onChange={shipping => patch({ shipping })} />}</div>}</form></Modal>

    <Modal isOpen={heldOpen} onClose={() => !busy && setHeldOpen(false)} title="Held bills" description="Held bills do not reserve stock. Availability is checked again at checkout." size="lg"><div className="divide-y divide-slate-100">{!held.length && <p className="py-8 text-center text-sm text-slate-400">No held bills.</p>}{held.map(record => <div key={record._id} className="flex items-center gap-3 py-4"><Pause size={17} className="text-slate-400" /><div className="flex-1"><p className="text-sm font-semibold">{record.label}</p><p className="mt-1 text-xs text-slate-400">{record.draft.items.length} products · {displayDate(record.updatedAt)}</p></div><button className={buttonClass} disabled={busy} onClick={() => { const resume = () => { setDraft(record.draft); setHeldId(record._id); setRequestId(record.draft.requestId || crypto.randomUUID()); setHeldOpen(false); }; if (draft.items.length) setConfirm({ type: 'resume', resume }); else resume(); }}>Resume</button><button aria-label={`Delete held bill ${record.label}`} className="text-slate-400 hover:text-rose-600" disabled={busy} onClick={() => setConfirm({ type: 'deleteHeld', id: record._id })}><Trash2 size={16} /></button></div>)}</div></Modal>

    <Modal isOpen={tenderOpen} onClose={() => !busy && setTenderOpen(false)} title="Complete sale"
      description={`${draft.customer.name} · ${draft.items.length} products · ${draft.taxMode === 'inclusive' ? 'Prices include GST' : 'Prices exclude GST'}`}
      size="lg" closeOnOutsideClick={false} footer={<>
        <button className={buttonClass} disabled={busy} onClick={() => setTenderOpen(false)}>Back to bill</button>
        <button className={primaryClass} disabled={busy || !!paymentCorrection} onClick={() => run(completeSale)}>{busy ? 'Saving sale…' : 'Complete sale & generate invoice'}</button>
      </>}>
      <div className="space-y-5">
        <ErrorNotice notice={notice} />
        {(paymentCorrection === 'customer' || paymentCorrection === 'shipping') && <section className="space-y-4 rounded-lg border border-rose-200 p-4">
          <h3 className="text-sm font-semibold">Correct {paymentCorrection === 'shipping' ? 'shipping' : 'customer'} details here</h3>
          <CustomerFields value={paymentCorrection === 'shipping' ? draft.shipping : draft.customer}
            shipping={paymentCorrection === 'shipping'} errors={errorsFor(paymentCorrection)} disabled={busy}
            verification={paymentCorrection === 'customer' ? customerVerification : null}
            onChange={value => paymentCorrection === 'customer' ? changeCustomer(value) : patch({ shipping: value })} />
          <button type="button" className={primaryClass} disabled={busy} onClick={() => run(async () => {
            if (paymentCorrection === 'customer') await saveCustomerDetails();
            else {
              const issues = validatePosCustomer(draft.shipping, 'shipping');
              if (issues.length) { showIssues(issues); return; }
              await posService.validateSale(salePayload()); setFieldErrors({}); setNotice(null); setPaymentCorrection(null);
            }
          })}>Save corrections</button>
        </section>}
        {paymentCorrection === 'items' && <section className="space-y-4 rounded-lg border border-rose-200 p-4">
          <h3 className="text-sm font-semibold">Correct the highlighted product here</h3>
          {draft.items.map((item, index) => Object.keys(fieldErrors).some(path => path.startsWith(`items.${index}.`)) && <div key={item.productId} className="space-y-3 border-b border-slate-100 pb-4">
            <p className="text-xs font-semibold">{item.productName} · {item.sku}</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity" type="number" min="1" step="1" value={item.quantity} error={fieldErrors[`items.${index}.quantity`]} onChange={value => updateItem(item.productId, { quantity: Number(value) })} />
              <Field label="HSN / SAC" value={item.hsn} error={fieldErrors[`items.${index}.hsn`]} onChange={value => updateItem(item.productId, { hsn: value })} />
              <Field label="Unit" value={item.unit} error={fieldErrors[`items.${index}.unit`]} onChange={value => updateItem(item.productId, { unit: value })} />
              <Field label="Serial numbers" value={item.serialInput ?? item.serialNumbers.join(', ')} error={fieldErrors[`items.${index}.serialNumbers`]} onChange={value => updateItem(item.productId, { serialInput: value, serialNumbers: value.split(',').map(s => s.trim()).filter(Boolean) })} />
            </div>
          </div>)}
          <button type="button" className={primaryClass} disabled={busy} onClick={() => run(async () => {
            const issues = validatePosItems(draft.items);
            if (issues.length) { showIssues(issues); return; }
            const result = await posService.validateSale(salePayload()); if (result.seller) setSeller(result.seller);
            setFieldErrors({}); setNotice(null); setPaymentCorrection(null);
          })}>Recheck products</button>
        </section>}
        <div className="flex items-end justify-between rounded-lg bg-slate-900 p-5 text-white">
          <div><p className="text-xs text-slate-300">Amount payable</p><p className="mt-2 text-3xl font-semibold tracking-tight">{rupees(bill.total)}</p></div>
          <span className="text-xs text-slate-300">{bill.totalQuantity} units</span>
        </div>
        <h3 className="text-sm font-semibold">Payment</h3>
        <div className="grid gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs text-slate-600">Method
            <select aria-label="Payment method" className={`${fieldClass} block`} value={payments[0]?.method || 'cash'} disabled={busy}
              onChange={event => setPayments(previous => [{ ...previous[0], method: event.target.value }])}>
              {paymentMethods.map(method => <option key={method} value={method}>{method === 'upi' ? 'UPI' : method === 'cash' ? 'Cash' : 'Bank'}</option>)}
            </select>
          </label>
          <Field label="Payment amount (fixed)" value={rupees(bill.total)} onChange={() => {}} readOnly />
          <Field label="Payment reference (optional)" value={payments[0]?.reference || ''} maxLength={200} disabled={busy}
            onChange={value => setPayments(previous => [{ ...previous[0], reference: value }])} className="sm:col-span-2" />
        </div>
        <p className="text-xs text-slate-500">The full invoice amount is recorded as paid. The amount comes from the bill and cannot be edited here.</p>
        <button type="button" className="text-xs font-medium text-primary" disabled={busy} onClick={() => run(async () => {
          const issues = validatePosDraft(draft); if (issues.length) { showIssues(issues); return; }
          const result = await posService.validateSale(salePayload()); if (result.seller) setSeller(result.seller);
          setFieldErrors({}); setPaymentCorrection(null); setNotice(null);
        })}>Recheck bill</button>
        <p className="text-xs text-slate-400">Completing the sale issues an invoice and deducts stock. Use returns or voids for corrections after saving.</p>
      </div>
    </Modal>

    <Modal isOpen={!!sale && !saleAction} onClose={() => !busy && setSale(null)} title={sale?.invoiceNumber || 'Invoice'} description={sale ? displayDate(sale.createdAt) : ''} size="xl" footer={<button className={buttonClass} onClick={() => setSale(null)}>Close</button>}>{sale && <div className="space-y-5"><ErrorNotice notice={notice} /><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-600" /><Status sale={sale} /><span className="text-xs text-slate-500">{sale.customer.name}</span></div><div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={busy} onClick={() => openInvoice(sale, true)}><Printer size={14} />Print invoice</button><button className={buttonClass} disabled={busy} onClick={() => run(async () => { const result = await posService.invoice(sale._id); saveBlob(result.data, `${sale.invoiceNumber.replaceAll('/', '-')}.pdf`); })}><Download size={14} />Download PDF</button><a className={`${buttonClass} !text-emerald-700`} href={posService.shareUrl(sale) ? buildPosWhatsAppLink(sale, posService.shareUrl(sale)) : undefined} onClick={event => { if (!posService.shareUrl(sale)) { event.preventDefault(); setNotice({ type: 'error', message: 'Invoice sharing needs a valid website address. Set VITE_PUBLIC_SITE_URL to your website address, then rebuild the frontend.' }); } }} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} />Send to WhatsApp</a></div></div><div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"><div><h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Bill to</h3><p className="text-sm font-semibold">{sale.customer.name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{sale.customer.address}, {sale.customer.city}, {sale.customer.state} - {sale.customer.pincode}<br />Phone: {sale.customer.phone}<br />WhatsApp: {sale.customer.whatsappNumber}</p></div><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-500">Invoice total</span><strong>{rupees(sale.total)}</strong></div><div className="flex justify-between"><span className="text-slate-500">Returns</span><span>{rupees(sale.returnedAmount)}</span></div><div className="flex justify-between"><span className="text-slate-500">Net received</span><span>{rupees(sale.paidAmount)}</span></div>{sale.refundDue > 0 && <div className="flex justify-between text-rose-700"><span>Refund due</span><strong>{rupees(sale.refundDue)}</strong></div>}</div></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-400"><tr>{['Product / serial numbers', 'HSN', 'Qty', 'Returned', 'GST', 'Amount'].map(label => <th className="px-3 py-2 font-medium" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{sale.items.map(item => <tr key={item.productId}><td className="px-3 py-3"><p className="font-semibold">{item.productName}</p><p className="mt-1 text-[10px] text-slate-400">{item.sku}{item.serialNumbers.length ? ` · ${item.serialNumbers.join(', ')}` : ''}</p></td><td className="px-3">{item.hsn}</td><td className="px-3">{item.quantity}</td><td className="px-3">{item.returnedQuantity}</td><td className="px-3">{item.gstRate}%</td><td className="px-3 font-semibold">{rupees(item.lineTotal)}</td></tr>)}</tbody></table></div><div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">{sale.refundDue > 0 && <button className={primaryClass} disabled={busy} onClick={() => beginAction('refund')}>Record refund</button>}{sale.status === 'completed' && sale.items.some(i => i.returnedQuantity < i.quantity) && <button className={buttonClass} disabled={busy} onClick={() => beginAction('return')}><RotateCcw size={14} />Return items</button>}{sale.status === 'completed' && <button className={`${buttonClass} !text-rose-600`} disabled={busy} onClick={() => beginAction('void')}>Void sale</button>}</div>{sale.status === 'voided' && <p className="rounded-md bg-rose-50 p-3 text-xs text-rose-700">Voided: {sale.voidReason}. Stock restored. {sale.refundDue > 0 ? 'Record the customer refund when paid.' : ''}</p>}<div className="space-y-2"><h3 className="text-xs font-semibold">Payment & return history</h3>{[...sale.payments.map(p => ({ ...p, label: `Payment · ${p.method.toUpperCase()}` })), ...(sale.refunds || []).map(p => ({ ...p, label: `Refund · ${p.method.toUpperCase()}` })), ...sale.returns.map(r => ({ ...r, label: `Return · ${r.creditNoteNumber}`, reference: r.reason }))].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map((entry, i) => <div key={i} className="flex justify-between gap-3 rounded-md border border-slate-100 p-3 text-xs"><div><p className="font-medium">{entry.label}</p><p className="mt-1 text-slate-400">{displayDate(entry.createdAt)} {entry.reference && `· ${entry.reference}`}</p></div><span className="shrink-0 font-semibold">{rupees(entry.amount)}</span></div>)}{!sale.payments.length && !sale.returns.length && <p className="text-xs text-slate-400">No payments recorded yet.</p>}</div><p className="text-[11px] text-slate-400">WhatsApp opens a message with the customer invoice page. Customers verify their mobile number to view and download invoices. Review the message and press Send in WhatsApp.</p></div>}</Modal>

    <Modal isOpen={!!saleAction} onClose={() => !busy && setSaleAction(null)} title={saleAction?.type === 'void' ? 'Void sale' : saleAction?.type === 'return' ? 'Return items' : saleAction?.type === 'refund' ? 'Record refund' : 'Record payment'} description={sale?.invoiceNumber} closeOnOutsideClick={false} footer={<><button className={buttonClass} disabled={busy} onClick={() => setSaleAction(null)}>Cancel</button><button className={saleAction?.type === 'void' ? `${primaryClass} !bg-rose-600 !border-rose-600` : primaryClass} form="pos-sale-action" type="submit" disabled={busy}>{busy ? 'Saving…' : saleAction?.type === 'void' ? 'Void sale & restore stock' : 'Save'}</button></>}><ErrorNotice notice={notice} />{saleAction && <form id="pos-sale-action" className="space-y-4" onSubmit={e => { e.preventDefault(); run(actionSubmit); }}>{['void', 'return'].includes(saleAction.type) ? <><p className="text-xs leading-5 text-slate-500">{saleAction.type === 'void' ? 'The invoice will be marked void and remaining sold stock restored. Collected payments remain in the audit history; record any refund separately.' : 'Returned units are added back to stock. The sale keeps its original invoice, and the return is recorded with a credit note number.'}</p><Field label="Reason" required minLength={3} maxLength={500} value={saleAction.reason} onChange={v => setSaleAction(p => ({ ...p, reason: v }))} />{saleAction.type === 'return' && sale.items.filter(i => i.quantity > i.returnedQuantity).map(item => <Field key={item.productId} label={`${item.productName} (${item.quantity - item.returnedQuantity} returnable)`} type="number" min="0" max={item.quantity - item.returnedQuantity} step="1" value={saleAction.quantities[item.productId] || 0} onChange={v => setSaleAction(p => ({ ...p, quantities: { ...p.quantities, [item.productId]: v } }))} />)}</> : <><Field label="Amount (₹)" type="number" min="0.01" max={saleAction.type === 'refund' ? sale.refundDue : sale.balanceDue} step="0.01" required value={saleAction.amount} onChange={v => setSaleAction(p => ({ ...p, amount: v }))} /><label className="block space-y-1.5 text-xs text-slate-600">Method<select className={fieldClass} value={saleAction.method} onChange={e => setSaleAction(p => ({ ...p, method: e.target.value }))}>{paymentMethods.map(method => <option key={method} value={method}>{method.toUpperCase()}</option>)}</select></label><Field label="Payment / refund reference" value={saleAction.reference} onChange={v => setSaleAction(p => ({ ...p, reference: v }))} /></>}</form>}</Modal>
    <ConfirmDialog isOpen={!!confirm} onClose={() => !busy && setConfirm(null)} title={confirm?.type === 'resume' ? 'Replace the current bill?' : confirm?.type === 'deleteHeld' ? 'Delete held bill?' : 'Clear current bill?'} message={confirm?.type === 'resume' ? 'The current unsaved bill will be discarded. Hold it first if you need it later.' : 'This removes the unsaved bill. No stock or invoices will be changed.'} variant="danger" isLoading={busy} confirmText={confirm?.type === 'resume' ? 'Replace bill' : 'Clear bill'} onConfirm={() => run(async () => { if (confirm.type === 'resume') confirm.resume(); else if (confirm.type === 'deleteHeld') { await posService.removeHeld(confirm.id); await refreshHeld(); } else resetDraft(); setConfirm(null); })} />
  </div>;
}
