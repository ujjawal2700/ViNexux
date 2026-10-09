import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import cartService from '../../services/cartService';
import guestCartService from '../../services/guestCartService';
import wishlistService from '../../services/wishlistService';
import { Minus, Plus, Check, Heart, ImageOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import { buildProductPath } from '../../utils/categoryUrls';
import { getMaximumOrderQuantity, isLowStock } from '../../utils/inventory';

export const ProductCard = ({ product, onCartUpdated, className }) => {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const productId = product?._id || product?.id;
  const [isWishlisted, setIsWishlisted] = useState(() => wishlistService.isInWishlist(productId));

  useEffect(() => {
    const syncWishlist = () => {
      setIsWishlisted(wishlistService.isInWishlist(productId));
    };
    syncWishlist();
    window.addEventListener('wishlist-updated', syncWishlist);
    return () => window.removeEventListener('wishlist-updated', syncWishlist);
  }, [productId]);

  if (!product) return null;

  const primaryImage = product.images?.[0]?.url || product.image;

  // Determine user role for pricing presentation
  const isApprovedDealer = user?.role === 'dealer' && (user?.dealerStatus === 'approved' || user?.kycStatus === 'approved');
  const isAdmin = user?.role === 'admin';

  const standardPrice = product.standardPrice || 0;
  const dealerPrice = product.dealerPrice || 0;
  const maximumQuantity = getMaximumOrderQuantity(product);
  const isOutOfStock = product.stockStatus === 'out-of-stock' || maximumQuantity === 0;
  const isLowStockItem = !isOutOfStock && isLowStock(product);

  let displayPrice = product?.applicablePrice ?? standardPrice;
  let hasDealerDiscount = false;

  if (isApprovedDealer && dealerPrice > 0) {
    displayPrice = product?.applicablePrice ?? dealerPrice;
    if (standardPrice > dealerPrice) {
      hasDealerDiscount = true;
    }
  }

  // Brand info
  const brandName =
    product.brandId?.name ||
    product.specifications?.find((s) => s.key?.toLowerCase() === 'brand')?.value ||
    (typeof product.categoryId === 'object' ? product.categoryId?.name : 'ViNexus');
  const brandLogo = product.brandId?.logo?.url;

  // Model number - from dedicated field or specs
  const modelNumber =
    product.modelNumber ||
    product.specifications?.find((s) => /^(model number|model no)$/i.test(s.key || ''))?.value ||
    null;



  // Handle Wishlist Toggle
  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const added = wishlistService.toggleWishlist(product);
    if (added === null) return;
    setIsWishlisted(added);
    if (added) {
      toast.success(`Saved "${product.name}" to wishlist!`);
    } else {
      toast.info(`Removed "${product.name}" from wishlist`);
    }
  };

  // Handle Quantity Change
  const handleDecrement = (e) => {
    e.stopPropagation();
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (quantity >= maximumQuantity) {
      toast.warning('The quantity limit for this enquiry has been reached.');
      return;
    }
    const nextQuantity = quantity + 1;
    setQuantity(nextQuantity);
  };

  // Handle Add to Cart action
  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) {
      toast.warning('This product is currently out of stock.');
      return;
    }

    if (!isAuthenticated) {
      const updatedCart = guestCartService.addItem(product, quantity);
      window.dispatchEvent(new CustomEvent('cart-item-added', { detail: { product, quantity, displayPrice, cart: updatedCart } }));
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
      return;
    }

    if (isAdmin) {
      toast.warning('Admin accounts are view-only and cannot submit cart items.');
      return;
    }

    try {
      setIsAdding(true);
      const res = await cartService.addItem(product._id, quantity);
      const updatedCart = res.data?.cart || res.data || res.cart || res;
      setIsAdded(true);
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart: updatedCart } }));
      window.dispatchEvent(new CustomEvent('cart-item-added', { detail: { product, quantity, displayPrice, cart: updatedCart } }));
      if (onCartUpdated) onCartUpdated();
      setTimeout(() => setIsAdded(false), 2000);
    } catch (err) {
      console.error('Failed to add item to cart:', err);
      const errMsg = err.response?.data?.message || 'Failed to add product to cart.';
      toast.error(errMsg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCardClick = () => {
    navigate(buildProductPath(product));
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "theme-product-card group relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--store-border)] bg-[var(--store-surface)] text-[var(--store-text)] shadow-sm transition-[border-color,box-shadow,transform] duration-200 motion-reduce:transition-none cursor-pointer",
        className
      )}
    >
      {/* ── IMAGE AREA (large, no restricting inner div, transparent bg for PNGs) ── */}
      <div className="relative w-full aspect-[4/3] bg-[var(--store-surface)] overflow-hidden">
        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-label="Wishlist"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-[var(--store-surface)] shadow-sm border border-[var(--store-border)] flex items-center justify-center text-[var(--store-muted)] hover:text-[var(--store-primary)] hover:scale-105 active:scale-95 transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
        >
          <Heart
            className={cn(
              'w-4 h-4 transition-colors',
              isWishlisted ? 'fill-red-500 text-red-500' : 'text-[var(--store-muted)] hover:text-red-500'
            )}
          />
        </button>

        {/* Product Image – full size, no wrapper box clipping PNG */}
        {primaryImage && !imgError ? (
          <img
            src={primaryImage}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain transition-transform duration-300 motion-safe:group-hover:scale-105 p-4 sm:p-5"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--store-background)] text-[var(--store-muted)]">
            <ImageOff className="w-8 h-8 mb-2 opacity-35" />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">No image available</span>
          </div>
        )}
      </div>

      {/* ── CONTENT AREA ── */}
      <div className="flex flex-1 flex-col p-3 sm:p-3.5 text-left border-t border-[var(--store-border)]">

        {/* Product Title */}
        <h3 className="min-h-[38px] line-clamp-2 text-[13px] font-semibold leading-[1.45] text-[var(--store-text)] transition-colors group-hover:text-[var(--store-primary)] sm:text-sm">
          {product.name}
        </h3>

        {/* Model Number box only (no PID) */}
        <div className="mt-1.5 min-h-5">
          {modelNumber && (
            <span
              className="block min-w-0 max-w-full truncate text-[10.5px] sm:text-[11px] font-medium text-[var(--store-muted)]"
              title={`Model: ${modelNumber}`}
            >
              Model: {modelNumber}
            </span>
          )}
        </div>

        {/* Price row with brand logo/name */}
        <div className="mt-2 flex min-h-9 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5">
            <span className="text-lg font-bold text-[var(--store-text)] sm:text-xl leading-none">
              ₹{(Number(displayPrice) || 0).toLocaleString('en-IN')}
            </span>
            {hasDealerDiscount && (
              <span className="text-[10px] sm:text-xs text-[var(--store-muted)] line-through">
                ₹{(Number(standardPrice) || 0).toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {brandLogo ? (
            <img loading="lazy" decoding="async" src={brandLogo} alt={`${brandName} logo`} title={brandName} className="h-8 w-[30%] max-w-16 shrink-0 object-contain object-right" />
          ) : (
            <span className="max-w-[30%] shrink-0 truncate text-right text-[10px] font-extrabold uppercase text-[var(--store-primary)]" title={brandName}>{brandName}</span>
          )}
        </div>

        {/* Stock Status Badge (matching Mega Jaipur green/amber/rose dot + text) */}
        <div className="mt-2 min-h-6">
          {isOutOfStock ? (
            <span className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-rose-700">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
              Out of Stock
            </span>
          ) : isLowStockItem ? (
            <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-800">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              Low Stock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-700">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              In Stock
            </span>
          )}
        </div>

        {hasDealerDiscount && (
          <div className="mt-1 text-[10px] font-semibold text-[var(--store-primary)]">
            Dealer saving: ₹{(standardPrice - displayPrice).toLocaleString('en-IN')}
          </div>
        )}

        <div className="h-3" />
        {/* Quantity Selector + Add to Cart / Out of Stock Button */}
        <div className="product-card-actions mt-auto pt-3 border-t border-[var(--store-border)] flex w-full items-center gap-2 translate-y-0">
          {/* Qty Stepper - only shown when not OOS */}
          {!isOutOfStock && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex shrink-0 h-9 overflow-hidden rounded border border-[var(--store-border)] bg-[var(--store-surface)] text-xs shadow-xs"
            >
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1}
                className="flex w-6 sm:w-7 items-center justify-center text-[var(--store-muted)] hover:bg-[var(--store-background)] disabled:opacity-30 transition-colors cursor-pointer"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="flex w-6 sm:w-7 items-center justify-center border-x border-[var(--store-border)] text-xs font-bold text-[var(--store-text)] select-none">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={quantity >= maximumQuantity || maximumQuantity <= 0}
                className="flex w-6 sm:w-7 items-center justify-center text-[var(--store-muted)] hover:bg-[var(--store-background)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Increase quantity"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Add to Cart OR Out of Stock button */}
          {isOutOfStock ? (
            /* Full width disabled OOS button in orange (matching user request) */
            <button
              type="button"
              disabled
              className="flex h-9 w-full items-center justify-center whitespace-nowrap rounded border border-orange-300 bg-orange-50 text-orange-700 text-[10.5px] font-bold tracking-tight uppercase cursor-not-allowed select-none"
            >
              OUT OF STOCK
            </button>
          ) : (
            <button
              type="button"
              disabled={!product.isActive || isAdding}
              onClick={handleAddToCart}
              className={cn(
                'flex h-9 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1.5 sm:px-2 text-[10.5px] font-semibold tracking-normal transition-all shadow-xs',
                isAdded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[var(--store-primary)] text-white hover:bg-[var(--store-primary-hover)] active:scale-98 cursor-pointer'
              )}
            >
              {isAdding ? (
                <span>ADDING...</span>
              ) : isAdded ? (
                <>
                  <Check className="h-3 w-3 stroke-[3]" />
                  <span>ADDED</span>
                </>
              ) : (
                <span>Add to cart</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
