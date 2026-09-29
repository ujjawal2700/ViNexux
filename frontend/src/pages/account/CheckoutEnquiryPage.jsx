import React, { useState, useEffect, useCallback } from 'react';
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
    phone: user?.phone || '',
  });
  const [deliveryAddress, setDeliveryAddress] = useState({ line1: '', line2: '', city: '', state: '', pincode: '' });

  // WhatsApp number to reach the submitter on - there's no WhatsApp
  // Business API integration, so admin follows up via a wa.me deep link
  // (see admin enquiry pages) instead of an automated send. Pre-filled
  // from the account phone when it looks like a valid mobile number, but
  // editable since a customer's WhatsApp number can differ.
  const [whatsappNumber, setWhatsappNumber] = useState(() =>
    user?.phone && /^[6-9]\d{9}$/.test(user.phone.trim()) ? user.phone.trim() : ''
  );
  const [whatsappError, setWhatsappError] = useState(null);

  // The authenticated profile can arrive after the first render on a reload.
  // Fill still-empty fields without replacing edits made in this form.
  useEffect(() => {
    if (!user) return;
    setContact((current) => ({
      fullName: current.fullName || user.fullName || user.name || '',
      email: current.email || user.email || '',
      phone: current.phone || user.phone || '',
    }));
    setWhatsappNumber((current) => current || (/^[6-9]\d{9}$/.test(user.phone || '') ? user.phone : ''));
  }, [user?.fullName, user?.name, user?.email, user?.phone]);

  const [message, setMessage] = useState('');

  const fetchCartAndVerify = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await cartService.getCart();
      const cartData = res.data?.cart || res.cart || res.data;
      const selectedIds = JSON.parse(sessionStorage.getItem('vinexus_enquiry_selected_products') || '[]');
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

    if (!selectedAddressId) {
      toast.error('Please select or add a delivery address before submitting your enquiry.');
      return;
    }

    if (contact.fullName.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()) || !/^[6-9]\d{9}$/.test(contact.phone)) {
      toast.error('Please enter a valid full name, email, and 10-digit mobile number.');
      return;
    }
    if (!deliveryAddress.line1.trim() || !deliveryAddress.city.trim() || !deliveryAddress.state.trim() || !/^\d{6}$/.test(deliveryAddress.pincode)) {
      toast.error('Please complete the editable delivery address and 6-digit pincode.');
      return;
    }

    const cleanedWhatsapp = whatsappNumber.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanedWhatsapp)) {
      setWhatsappError('Please enter a valid 10-digit WhatsApp number');
      toast.error('Please enter a valid WhatsApp number before submitting your enquiry.');
      return;
    }
    setWhatsappError(null);

    try {
      setIsSubmitting(true);
      const payload = {
        addressId: selectedAddressId,
        contactName: contact.fullName.trim(),
        contactEmail: contact.email.trim().toLowerCase(),
        contactPhone: contact.phone,
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
      const errMsg = err.response?.data?.message || 'Failed to submit enquiry. Please try again.';
      toast.error(errMsg);
    } finally {
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
          <Link to="/account/cart" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-2 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Cart
          </Link>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <FileCheck className="w-7 h-7 text-primary" />
            <span>Send Enquiry</span>
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmitEnquiry} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

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
              <Input label="Full Name" value={contact.fullName} onChange={(e) => setContact({ ...contact, fullName: e.target.value })} />
              <Input label="Email" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              <Input label="Phone" type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
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
              <AddressPicker selectedAddressId={selectedAddressId} onSelect={(id, address) => {
                setSelectedAddressId(id);
                if (address) setDeliveryAddress({ line1: address.line1 || '', line2: address.line2 || '', city: address.city || '', state: address.state || '', pincode: address.pincode || '' });
              }} />
              {selectedAddressId && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <Input label="Address Line 1" value={deliveryAddress.line1} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, line1: e.target.value })} />
                <Input label="Address Line 2" value={deliveryAddress.line2} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, line2: e.target.value })} />
                <Input label="City" value={deliveryAddress.city} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })} />
                <Input label="State" value={deliveryAddress.state} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, state: e.target.value })} />
                <Input label="Pincode" value={deliveryAddress.pincode} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
              </div>}
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
                placeholder="10-digit WhatsApp number"
                value={whatsappNumber}
                onChange={(e) => {
                  setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                  if (whatsappError) setWhatsappError(null);
                }}
                error={whatsappError}
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
                isDisabled={!selectedAddressId || whatsappNumber.replace(/\D/g, '').length !== 10}
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
