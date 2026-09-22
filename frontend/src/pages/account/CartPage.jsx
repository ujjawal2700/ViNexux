import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import cartService from '../../services/cartService';
import contentService from '../../services/contentService';
import useToast from '../../hooks/useToast';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Image } from '../../components/ui/Image';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  MessageCircle,
  FileCheck,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Store,
  Heart,
} from 'lucide-react';

export const CartPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [cart, setCart] = useState(null);
  const [supportPhone, setSupportPhone] = useState('919876543210');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [error, setError] = useState(null);

  // Fetch Cart Data & Footer Support Phone
  const fetchCartData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // If user is guest / not authenticated, show empty cart directly
    if (!isAuthenticated) {
      setCart({ items: [] });
      setIsLoading(false);
      return;
    }

    // Fetch footer content for WhatsApp phone
    try {
      const footerRes = await contentService.getFooterContent();
      const phoneRaw = footerRes.data?.footer?.contactDetails?.phone || footerRes.footer?.contactDetails?.phone;
      if (phoneRaw) {
        const cleanedPhone = phoneRaw.replace(/\D/g, '');
        if (cleanedPhone.length >= 10) {
          setSupportPhone(cleanedPhone.startsWith('91') ? cleanedPhone : `91${cleanedPhone}`);
        }
      }
    } catch (err) {
      console.warn('Could not fetch support phone from CMS footer:', err);
    }

    // Fetch Cart
    try {
      const cartRes = await cartService.getCart();
      const cartData = cartRes.data?.cart || cartRes.cart || cartRes.data;
      setCart(cartData);
    } catch (err) {
      console.error('Cart fetch error:', err);
      if (err.response?.status === 401) {
        setCart({ items: [] });
      } else {
        setError('Unable to load your shopping cart.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCartData();
  }, [fetchCartData]);

  // Format Currency (INR ₹)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Update Item Quantity
  const handleUpdateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      setUpdatingItemId(productId);
      const res = await cartService.updateItemQuantity(productId, newQuantity);
      const updatedCart = res.data?.cart || res.cart || res.data;
      setCart(updatedCart);
      toast.success('Cart updated');
    } catch (err) {
      console.error('Update item quantity error:', err);
      toast.error('Failed to update item quantity.');
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Remove Item from Cart
  const handleRemoveItem = async (productId, productName) => {
    try {
      setUpdatingItemId(productId);
      const res = await cartService.removeItem(productId);
      const updatedCart = res.data?.cart || res.cart || res.data;
      setCart(updatedCart);
      toast.success(`Removed "${productName}" from cart`);
    } catch (err) {
      console.error('Remove item error:', err);
      toast.error('Failed to remove item from cart.');
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Clear Entire Cart
  const handleClearCart = async () => {
    try {
      const res = await cartService.clearCart();
      const updatedCart = res.data?.cart || res.cart || res.data;
      setCart(updatedCart);
      setIsClearConfirmOpen(false);
      toast.success('Cart cleared successfully');
    } catch (err) {
      console.error('Clear cart error:', err);
      toast.error('Failed to clear cart.');
    }
  };

  // Calculate Subtotal
  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => {
    const price = item.priceSnapshot !== undefined ? item.priceSnapshot : 0;
    return sum + price * (item.quantity || 1);
  }, 0);

  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Build Encoded WhatsApp Deep Link String
  const generateWhatsAppLink = () => {
    let text = `*Vinexus Commercial Quotation Request*\n\n`;
    text += `Hello, I would like to enquire about the following cart items:\n\n`;

    items.forEach((item, idx) => {
      const name = item.productId?.name || 'Product';
      const sku = item.productId?.sku ? `(SKU: ${item.productId.sku})` : '';
      const qty = item.quantity || 1;
      const price = item.priceSnapshot !== undefined ? item.priceSnapshot : 0;
      text += `${idx + 1}. *${name}* ${sku}\n   Qty: ${qty} | Unit Price: ₹${price} | Line Total: ₹${price * qty}\n\n`;
    });

    text += `*Estimated Cart Subtotal:* ₹${subtotal}\n`;
    text += `Please send me an official quotation and availability status. Thank you!`;

    const encodedText = encodeURIComponent(text);
    return `https://wa.me/${supportPhone}?text=${encodedText}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-6 bg-background">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <ErrorState title="Cart Error" description={error} onRetry={fetchCartData} />
      </div>
    );
  }

  // Empty Cart State - matches Mega Jaipur UI
  if (items.length === 0) {
    return (
      <div className="w-full min-h-[calc(100vh-220px)] bg-white flex items-center justify-center pt-10 sm:pt-14 pb-20 px-4">
        <div className="text-center max-w-lg mx-auto">
          {/* Circular Shopping Cart Avatar */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-5 shadow-xs">
            <ShoppingCart className="w-9 h-9 sm:w-11 sm:h-11 text-primary/70 stroke-[1.5]" />
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
            Your cart is empty
          </h2>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed mb-6">
            Browse our catalog of CCTV cameras, NVRs, networking gear and accessories.<br className="hidden sm:inline" />
            Add items to start building your order.
          </p>

          {/* Action Buttons to move between wishlist or home */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-98"
            >
              <Store className="w-4 h-4" />
              <span>Continue Shopping</span>
            </Link>

            <Link
              to="/wishlist"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-primary/20 bg-primary/10 hover:bg-primary/15 text-primary font-bold text-xs sm:text-sm transition-all active:scale-98"
            >
              <Heart className="w-4 h-4 text-primary fill-primary/20" />
              <span>View Wishlist</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 bg-background text-foreground min-h-screen">
      
      {/* Header */}
      <div className="border-b border-border pb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Cart & Quotation Builder</span>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <ShoppingCart className="w-7 h-7 text-primary" />
            <span>Shopping Cart</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-all shadow-xs"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </Link>
          <Link
            to="/wishlist"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold transition-all shadow-xs"
          >
            <Heart className="w-3.5 h-3.5" />
            <span>View Wishlist</span>
          </Link>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => setIsClearConfirmOpen(true)}
            >
              Clear Cart
            </Button>
          )}
        </div>
      </div>

      {/* Cart Content Body */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Item List Column */}
          <div className="lg:col-span-8 space-y-4">
            {items.map((item) => {
              const product = item.productId || {};
              const price = item.priceSnapshot !== undefined ? item.priceSnapshot : 0;
              const lineTotal = price * item.quantity;
              const imgUrl = product.images?.[0]?.url || product.image || '';

              return (
                <Card
                  key={product._id || item._id}
                  className="p-4 bg-card border-border flex flex-col sm:flex-row items-center gap-4 justify-between shadow-sm"
                >
                  {/* Thumbnail & Product Details */}
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <Link to={`/products/${product._id}`} className="shrink-0">
                      <Image
                        src={imgUrl}
                        alt={product.name || 'Product'}
                        aspectRatio="aspect-square"
                        className="w-20 h-20 rounded-xl object-cover border border-border"
                      />
                    </Link>

                    <div className="space-y-1">
                      <Link to={`/products/${product._id}`} className="hover:text-primary transition-colors">
                        <h4 className="font-bold text-foreground text-sm line-clamp-2">
                          {product.name || 'Vinexus Equipment'}
                        </h4>
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <span>SKU: {product.sku || 'N/A'}</span>
                      </div>
                      <div className="text-xs text-[#664448] font-medium">
                        Unit Price: <span className="text-foreground font-bold">{formatCurrency(price)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Modifier & Line Total Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
                    {/* Quantity Controls */}
                    <div className="flex items-center bg-muted border border-border rounded-xl overflow-hidden">
                      <button
                        onClick={() => handleUpdateQuantity(product._id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || updatingItemId === product._id}
                        className="p-2 text-muted-foreground hover:text-primary disabled:opacity-40"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-bold text-foreground font-mono">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(product._id, item.quantity + 1)}
                        disabled={updatingItemId === product._id}
                        className="p-2 text-muted-foreground hover:text-primary disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-foreground font-mono">
                        {formatCurrency(lineTotal)}
                      </div>
                    </div>

                    {/* Delete Item */}
                    <button
                      onClick={() => handleRemoveItem(product._id, product.name)}
                      disabled={updatingItemId === product._id}
                      className="p-2 text-[#9a6870] hover:text-rose-600 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              );
            })}

            <div className="pt-2">
              <Link to="/products" className="text-xs font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Continue Browsing Catalog
              </Link>
            </div>
          </div>

          {/* Cart Summary & Dual CTAs Column */}
          <div className="lg:col-span-4 space-y-6 sticky top-24">
            <Card className="bg-card p-6 rounded-2xl border border-border space-y-6 shadow-sm">
              <CardHeader className="p-0 pb-4 border-b border-border">
                <CardTitle className="text-foreground">Cart Summary</CardTitle>
              </CardHeader>

              <CardContent className="p-0 space-y-3 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Unique Items</span>
                  <span className="font-bold text-foreground">{items.length}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Equipment Units</span>
                  <span className="font-bold text-foreground">{totalQuantity}</span>
                </div>
                <div className="pt-3 border-t border-border flex justify-between text-sm">
                  <span className="font-bold text-foreground">Estimated Subtotal</span>
                  <span className="font-extrabold text-foreground text-base">{formatCurrency(subtotal)}</span>
                </div>
                <p className="text-[10px] text-[#9a6870]">
                  *Prices shown represent applicable standard or verified dealer rates. Formal quotation confirmed upon submission.
                </p>
              </CardContent>

              {/* DUAL CONVERSION CALL-TO-ACTIONS */}
              <CardFooter className="p-0 pt-2 flex flex-col gap-3">
                {/* CTA B: Primary Official Enquiry Submission */}
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => navigate('/account/checkout-enquiry')}
                >
                  Send Official Enquiry
                </Button>

                {/* CTA A: WhatsApp Instant Deep Link Chat */}
                <a
                  href={generateWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button
                    variant="success"
                    size="lg"
                    fullWidth
                    leftIcon={<MessageCircle className="w-4 h-4" />}
                  >
                    Chat on WhatsApp
                  </Button>
                </a>
              </CardFooter>
            </Card>

            <div className="p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground space-y-1 shadow-sm">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Non-Transactional B2B Platform</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                No online payment required. Submitting an enquiry or WhatsApp message dispatches your lead directly to Vinexus commercial representatives.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Clear Cart Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={handleClearCart}
        title="Clear Entire Shopping Cart?"
        description="Are you sure you want to remove all items from your quotation cart?"
        confirmText="Yes, Clear Cart"
        isDanger
      />
    </div>
  );
};

export default CartPage;
