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
import { FormField } from '../../components/ui/FormField';
import { FormLabel } from '../../components/ui/FormLabel';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { Image } from '../../components/ui/Image';
import {
  FileCheck,
  User,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Lock,
} from 'lucide-react';

export const CheckoutEnquiryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [cart, setCart] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Delivery Address Form State
  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Optional Customer Message
  const [message, setMessage] = useState('');

  // Form Validation Errors
  const [formErrors, setFormErrors] = useState({});

  // Verify Cart on Load
  const fetchCartAndVerify = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await cartService.getCart();
      const cartData = res.data?.cart || res.cart || res.data;
      const items = cartData?.items || [];

      if (!items || items.length === 0) {
        toast.info('Your cart is empty. Please add products before checking out.');
        navigate('/customer/cart');
        return;
      }

      setCart(cartData);

      // Pre-fill user address if stored in user profile
      if (user?.address) {
        setAddress((prev) => ({
          ...prev,
          line1: typeof user.address === 'string' ? user.address : user.address.line1 || '',
          city: typeof user.address === 'object' ? user.address.city || '' : '',
          state: typeof user.address === 'object' ? user.address.state || '' : '',
          pincode: typeof user.address === 'object' ? user.address.pincode || '' : '',
        }));
      }
    } catch (err) {
      console.error('Checkout cart verification error:', err);
      setError('Unable to load cart items for checkout.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, toast, user]);

  useEffect(() => {
    fetchCartAndVerify();
  }, [fetchCartAndVerify]);

  // Handle Input Changes
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddress((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Form Client-side Validation
  const validateForm = () => {
    const errors = {};
    if (!address.line1.trim()) {
      errors.line1 = 'Street address (Line 1) is required';
    }
    if (!address.city.trim()) {
      errors.city = 'City is required';
    }
    if (!address.state.trim()) {
      errors.state = 'State is required';
    }
    if (!address.pincode.trim()) {
      errors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(address.pincode.trim())) {
      errors.pincode = 'Enter a valid 6-digit Indian pincode';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Format Currency (INR ₹)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Handle Submit Enquiry
  const handleSubmitEnquiry = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the delivery address validation errors.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        deliveryAddress: address,
        message: message.trim() || undefined,
      };

      const res = await enquiryService.createEnquiry(payload);
      const createdEnquiry = res.data?.enquiry || res.enquiry || res.data;

      toast.success(`Enquiry #${createdEnquiry.enquiryNumber || 'VNX'} submitted successfully!`);

      // Navigate to Enquiry Detail View
      const enquiryId = createdEnquiry._id || createdEnquiry.id;
      if (enquiryId) {
        navigate(`/customer/enquiries/${enquiryId}`);
      } else {
        navigate('/customer/enquiries');
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
          <Link to="/customer/cart" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-2 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Cart
          </Link>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <FileCheck className="w-7 h-7 text-primary" />
            <span>Submit Quotation Enquiry</span>
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmitEnquiry} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Contact Preview & Delivery Address Form */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SECTION 1: VERIFIED CONTACT INFO (READ-ONLY) */}
          <Card className="bg-card p-6 rounded-2xl border border-border space-y-4 shadow-sm">
            <CardHeader className="p-0 pb-3 border-b border-border flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <User className="w-4 h-4 text-primary" />
                <span>Verified Contact Information (Read-Only)</span>
              </CardTitle>
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            </CardHeader>

            <CardContent className="p-0 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1 bg-background p-3 rounded-xl border border-border">
                <span className="text-[#9a6870] block text-[10px]">Contact Person</span>
                <span className="font-bold text-foreground truncate block">
                  {user?.fullName || user?.name || 'Vinexus Account'}
                </span>
              </div>
              <div className="space-y-1 bg-background p-3 rounded-xl border border-border">
                <span className="text-[#9a6870] block text-[10px]">Email Address</span>
                <span className="font-mono font-medium text-foreground truncate block">
                  {user?.email || 'N/A'}
                </span>
              </div>
              <div className="space-y-1 bg-background p-3 rounded-xl border border-border">
                <span className="text-[#9a6870] block text-[10px]">Phone Number</span>
                <span className="font-mono font-medium text-foreground truncate block">
                  {user?.phone || 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2: DELIVERY ADDRESS FORM */}
          <Card className="bg-card p-6 rounded-2xl border border-border space-y-4 shadow-sm">
            <CardHeader className="p-0 pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Delivery Address & Location Details</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 space-y-4">
              <Input
                label="Street Address / Line 1 *"
                name="line1"
                placeholder="Building No, Street Name, Area..."
                value={address.line1}
                onChange={handleAddressChange}
                error={formErrors.line1}
              />

              <Input
                label="Address Line 2 (Optional)"
                name="line2"
                placeholder="Landmark, Suite, Unit..."
                value={address.line2}
                onChange={handleAddressChange}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="City *"
                  name="city"
                  placeholder="e.g. Mumbai"
                  value={address.city}
                  onChange={handleAddressChange}
                  error={formErrors.city}
                />
                <Input
                  label="State *"
                  name="state"
                  placeholder="e.g. Maharashtra"
                  value={address.state}
                  onChange={handleAddressChange}
                  error={formErrors.state}
                />
                <Input
                  label="Pincode *"
                  name="pincode"
                  placeholder="6-digit code"
                  value={address.pincode}
                  onChange={handleAddressChange}
                  error={formErrors.pincode}
                />
              </div>
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
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Submit Commercial Enquiry
              </Button>
            </CardFooter>
          </Card>

          <div className="p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground space-y-1 shadow-sm">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Automated Google Sheet & Admin Alert</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Upon submission, your lead is saved to our central database, appended to commercial Google Sheets, and dispatched via WhatsApp alert to Vinexus engineers.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutEnquiryPage;
