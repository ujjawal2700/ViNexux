import { normalizeEnquiryPhone, validateEnquiryContact } from '../../utils/enquiryValidation';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import cartService from '../../services/cartService';
import enquiryService from '../../services/enquiryService';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { Image } from '../../components/ui/Image';
import { AddressPicker } from '../../components/address/AddressPicker';
import {
  FileCheck,
  User,
  MapPin,
  MessageSquare,
  MessageCircle,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

export const CheckoutEnquiryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const submitting = useRef(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const reportErrors = (errors) => {
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    const element = document.getElementById(`enquiry-${first?.startsWith('deliveryAddress') ? 'addressId' : first}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element?.focus();
    toast.error(errors[first]);
  };

  const [cart, setCart] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Delivery address is picked from the saved address book (see
  // AddressPicker) - no more ad hoc typing at checkout.
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [contact, setContact] = useState({
    fullName: user?.fullName || user?.name || '',
    email: user?.email || '',
    phone: normalizeEnquiryPhone(user?.phone),
  });
  const [deliveryAddress, setDeliveryAddress] = useState({ line1: '', line2: '', city: '', state: '', pincode: '' });

  // WhatsApp number to reach the submitter on - there's no WhatsApp
  // Business API integration, so admin follows up via a wa.me deep link
  // (see admin enquiry pages) instead of an automated send. Pre-filled
  // from the account phone when it looks like a valid mobile number, but
  // editable since a customer's WhatsApp number can differ.
  const [whatsappNumber, setWhatsappNumber] = useState(() =>
    normalizeEnquiryPhone(user?.phone)
  );
  const [whatsappError, setWhatsappError] = useState(null);

  // The authenticated profile can arrive after the first render on a reload.
  // Fill still-empty fields without replacing edits made in this form.
  useEffect(() => {
    if (!user) return;
    setContact((current) => ({
      fullName: current.fullName || user.fullName || user.name || '',
      email: current.email || user.email || '',
      phone: current.phone || normalizeEnquiryPhone(user.phone),
    }));
    setWhatsappNumber((current) => current || normalizeEnquiryPhone(user.phone));
  }, [user?.fullName, user?.name, user?.email, user?.phone]);

  const [message, setMessage] = useState('');

  const fetchCartAndVerify = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await cartService.getCart();
      const cartData = res.data?.cart || res.cart || res.data;
      let selectedIds = [];
      try {
        const stored = JSON.parse(sessionStorage.getItem('vinexus_enquiry_selected_products') || '[]');
        if (Array.isArray(stored)) selectedIds = stored;
      } catch { /* Ignore invalid stale selection state. */ }
      const allItems = cartData?.items || [];
      const items = selectedIds.length
        ? allItems.filter((item) => selectedIds.includes(String(item.productId?._id || item.productId)))
        : allItems;

      if (!items || items.length === 0) {
        toast.info('Your cart is empty. Please add products before checking out.');
        navigate('/cart');
        return;
      }

      setCart({ ...cartData, items });
    } catch (err) {
      console.error('Checkout cart verification error:', err);
      setError('Unable to load cart items for checkout.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    fetchCartAndVerify();
  }, [fetchCartAndVerify]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleSubmitEnquiry = async (e) => {
    e.preventDefault();

    if (submitting.current) return;
    const errors = validateEnquiryContact(contact);
    if (!selectedAddressId) errors.addressId = 'Please select or add a delivery address.';
    if (selectedAddressId && (!deliveryAddress.line1.trim() || !deliveryAddress.city.trim() || !deliveryAddress.state.trim() || !/^\d{6}$/.test(deliveryAddress.pincode))) errors.addressId = 'Please edit the saved delivery address and enter a valid address and 6-digit pincode.';
    const cleanedWhatsapp = normalizeEnquiryPhone(whatsappNumber);
    if (!/^[6-9]\d{9}$/.test(cleanedWhatsapp)) errors.whatsappNumber = 'Please enter a valid 10-digit WhatsApp number.';
    if (message.trim().length > 1000) errors.message = 'Message cannot exceed 1000 characters.';
    setWhatsappError(errors.whatsappNumber || null);
    if (Object.keys(errors).length) { reportErrors(errors); return; }
    setFieldErrors({});
    submitting.current = true;

    try {
      setIsSubmitting(true);
      const payload = {
        addressId: selectedAddressId,
        contactName: contact.fullName.trim(),
        contactEmail: contact.email.trim().toLowerCase(),
        contactPhone: normalizeEnquiryPhone(contact.phone),
        deliveryAddress,
        selectedProductIds: items.map((item) => String(item.productId?._id || item.productId)),
        whatsappNumber: cleanedWhatsapp,
        message: message.trim() || undefined,
      };

      const res = await enquiryService.createEnquiry(payload);
      const createdEnquiry = res.data?.enquiry || res.enquiry || res.data;

      toast.success(`Enquiry #${createdEnquiry.enquiryNumber || 'VNX'} submitted successfully!`);
      sessionStorage.removeItem('vinexus_enquiry_selected_products');

      const enquiryId = createdEnquiry._id || createdEnquiry.id;
      if (enquiryId) {
        navigate(`/account/enquiries/${enquiryId}`);
      } else {
        navigate('/account/enquiries');
      }
    } catch (err) {
      console.error('Enquiry submission error:', err);
      const data = err.response?.data;
      const details = data?.details || data?.error?.details || [];
      if (details.length) {
        reportErrors(Object.fromEntries(details.map(detail => [detail.path, detail.message])));
      } else {
        toast.error(data?.message || 'Failed to submit enquiry. Please try again.');
      }
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => {
    const price = item.priceSnapshot !== undefined ? item.priceSnapshot : 0;
    return sum + price * (item.quantity || 1);
  }, 0);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-6 bg-background">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-5">
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <ErrorState title="Checkout Error" description={error} onRetry={fetchCartAndVerify} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 bg-background text-foreground min-h-screen">

      {/* Header */}
      <div className="border-b border-border pb-6 flex items-center justify-between">
        <div>
          <Link to="/cart" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-2 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Cart
          </Link>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <FileCheck className="w-7 h-7 text-primary" />
            <span>Send Enquiry</span>
          </h1>
        </div>
      </div>

      <form noValidate onSubmit={handleSubmitEnquiry} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Column: Contact Preview & Delivery Address Picker */}
        <div className="lg:col-span-7 space-y-6">

          {/* SECTION 1: EDITABLE CONTACT INFO */}
          <Card className="bg-card p-6 rounded-2xl border border-border space-y-4 shadow-sm">
            <CardHeader className="p-0 pb-3 border-b border-border flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <User className="w-4 h-4 text-primary" />
                <span>Contact Information</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <Input id="enquiry-contactName" name="contactName" error={fieldErrors.contactName} aria-invalid={Boolean(fieldErrors.contactName)} label="Full Name" value={contact.fullName} onChange={(e) => setContact({ ...contact, fullName: e.target.value })} />
              <Input id="enquiry-contactEmail" name="contactEmail" error={fieldErrors.contactEmail} aria-invalid={Boolean(fieldErrors.contactEmail)} label="Email" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              <Input id="enquiry-contactPhone" name="contactPhone" error={fieldErrors.contactPhone} aria-invalid={Boolean(fieldErrors.contactPhone)} label="Phone" type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: normalizeEnquiryPhone(e.target.value).slice(0, 10) })} />
            </CardContent>
          </Card>

          {/* SECTION 2: DELIVERY ADDRESS - select saved or add new */}
          <Card className="bg-card p-6 rounded-2xl border border-border space-y-4 shadow-sm">
            <CardHeader className="p-0 pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Delivery Address *</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div id="enquiry-addressId" tabIndex={-1}>
                {Object.entries(fieldErrors).filter(([key]) => key === 'addressId' || key.startsWith('deliveryAddress')).map(([key, value]) => <p key={key} role="alert" className="text-sm text-rose-600 mb-2">{value}</p>)}
                <AddressPicker
                  selectedAddressId={selectedAddressId}
                  onSelect={(id, address) => {
                    setSelectedAddressId(id);
                    if (address) {
                      setDeliveryAddress({
                        line1: address.line1 || '',
                        line2: address.line2 || '',
                        city: address.city || '',
                        state: address.state || '',
                        pincode: address.pincode || '',
                      });
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2b: WHATSAPP CONTACT NUMBER */}
          <Card className="bg-card p-6 rounded-2xl border border-border space-y-4 shadow-sm">
            <CardHeader className="p-0 pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span>WhatsApp Contact Number *</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 space-y-2">
              <Input
                type="tel"
                id="enquiry-whatsappNumber"
                aria-label="WhatsApp contact number"
                placeholder="10-digit WhatsApp number"
                value={whatsappNumber}
                onChange={(e) => {
                  setWhatsappNumber(normalizeEnquiryPhone(e.target.value).slice(0, 10));
                  if (whatsappError) setWhatsappError(null);
                }}
                error={whatsappError || fieldErrors.whatsappNumber}
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Our team will reach out to this number directly on WhatsApp regarding your enquiry.
              </p>
            </CardContent>
          </Card>

          {/* SECTION 3: OPTIONAL CUSTOMER MESSAGE */}
          <Card className="bg-card p-6 rounded-2xl border border-border space-y-4 shadow-sm">
            <CardHeader className="p-0 pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>Project Notes / Additional Message</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <Textarea
                id="enquiry-message"
                error={fieldErrors.message}
                maxLength={1000}
                placeholder="Specify any custom cabling requirements, camera channel preferences, or commercial delivery instructions..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                helperText="Optional notes for Vinexus commercial sales engineers."
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Order Items Summary & Submit Button */}
        <div className="lg:col-span-5 space-y-6 sticky top-24">
          <Card className="bg-card p-6 rounded-2xl border border-border space-y-6 shadow-sm">
            <CardHeader className="p-0 pb-4 border-b border-border">
              <CardTitle className="text-sm font-bold text-foreground">Items Snapshot</CardTitle>
            </CardHeader>

            {/* Items List */}
            <CardContent className="p-0 space-y-3 max-h-64 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const product = item.productId || {};
                const price = item.priceSnapshot !== undefined ? item.priceSnapshot : 0;
                const imgUrl = product.images?.[0]?.url || product.image || '';

                return (
                  <div key={idx} className="flex items-center justify-between text-xs py-2 border-b border-border gap-3">
                    <div className="flex items-center gap-3 truncate">
                      <Image src={imgUrl} alt={product.name} aspectRatio="aspect-square" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-foreground block truncate">{product.name || 'Equipment'}</span>
                        <span className="text-[11px] text-muted-foreground">Qty: {item.quantity} × {formatCurrency(price)}</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-foreground shrink-0">
                      {formatCurrency(price * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </CardContent>

            {/* Totals */}
            <div className="pt-3 border-t border-border space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Items</span>
                <span className="font-bold text-foreground">{items.length}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="font-bold text-foreground">Estimated Subtotal</span>
                <span className="font-extrabold text-foreground text-base">{formatCurrency(subtotal)}</span>
              </div>
            </div>

            {/* Submit Action Button */}
            <CardFooter className="p-0 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
                isDisabled={isSubmitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Send Enquiry
              </Button>
            </CardFooter>
          </Card>

          <div className="p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground space-y-1 shadow-sm">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Database, Google Sheet & Email Confirmation</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Upon submission, your enquiry is saved to our database, appended to the connected Google Sheet, and emailed to the configured admin address. A confirmation email is also sent to you when email delivery is available.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutEnquiryPage;
