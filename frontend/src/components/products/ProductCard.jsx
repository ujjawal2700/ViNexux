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
import { getAvailableStock, getMaximumOrderQuantity } from '../../utils/inventory';

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
  const availableStock = getAvailableStock(product);
  const maximumQuantity = getMaximumOrderQuantity(product);
  const isOutOfStock = product.stockStatus === 'out-of-stock' || maximumQuantity === 0;
  const isLowStock = !isOutOfStock && (product.stockStatus === 'low-stock' || (availableStock !== null && availableStock > 0 && availableStock < 5));
  const isInStock = !isOutOfStock && !isLowStock;

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
    // If no stock info, allow free increment (legacy products)
    if (availableStock === null) {
      setQuantity((prev) => prev + 1);
      return;
    }
    if (quantity >= availableStock) {
      toast.stock(`Limited stock — only ${availableStock} unit${availableStock === 1 ? '' : 's'} available.`);
      return;
    }
    const nextQuantity = quantity + 1;
    setQuantity(nextQuantity);
    // Warn when reaching the max
    if (nextQuantity >= availableStock) {
      toast.stock(`Limited stock — only ${availableStock} unit${availableStock === 1 ? '' : 's'} available.`);
    }
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
        "group relative flex h-full flex-col overflow-hidden rounded-sm border border-gray-200 bg-white text-gray-900 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer",
        className
      )}
    >
      {/* ── IMAGE AREA (large, no restricting inner div, transparent bg for PNGs) ── */}
      <div className="relative w-full bg-white overflow-hidden" style={{ minHeight: '220px', maxHeight: '260px', height: '240px' }}>
        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-label="Wishlist"
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#800020] hover:scale-105 active:scale-95 transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          <Heart
            className={cn(
              'w-4 h-4 transition-colors',
              isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'
            )}
          />
        </button>

        {/* Product Image – full size, no wrapper box clipping PNG */}
        {primaryImage && !imgError ? (
          <img
            src={primaryImage}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 p-3"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-300">
            <ImageOff className="w-10 h-10 mb-1 opacity-40" />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-40">No Image</span>
          </div>
        )}
      </div>

      {/* ── CONTENT AREA ── */}
      <div className="flex flex-1 flex-col p-3 text-left border-t border-gray-100">

        {/* Product Title */}
        <h3 className="min-h-[50px] line-clamp-3 text-[13px] font-semibold leading-[1.35] text-gray-900 transition-colors group-hover:text-[#800020] sm:text-[13.5px]">
          {product.name}
        </h3>

        {/* Model Number box only (no PID) */}
        {modelNumber && (
          <div className="mt-2">
            <span
              className="inline-block min-w-0 max-w-full truncate rounded bg-gray-100 border border-gray-200 px-1.5 py-0.5 text-[10.5px] font-semibold text-gray-600"
              title={`Model: ${modelNumber}`}
            >
              Model: {modelNumber}
            </span>
          </div>
        )}

        {/* Price row with brand logo/name */}
        <div className="mt-2.5 flex min-h-8 items-center justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-1">
            <span className="text-[17px] font-extrabold text-gray-900 sm:text-lg leading-none">
              ₹{(Number(displayPrice) || 0).toLocaleString('en-IN')}
            </span>
            {hasDealerDiscount && (
              <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                ₹{(Number(standardPrice) || 0).toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {brandLogo ? (
            <img src={brandLogo} alt={`${brandName} logo`} title={brandName} className="h-7 w-14 shrink-0 object-contain object-right" />
          ) : (
            <span className="max-w-[72px] shrink-0 truncate text-right text-[10px] font-extrabold uppercase text-[#800020]" title={brandName}>{brandName}</span>
          )}
        </div>

        {/* Stock Status Badge (matching Mega Jaipur green/amber/rose dot + text) */}
        <div className="mt-1.5">
          {isOutOfStock ? (
            <span className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-rose-700">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
              Out of Stock
            </span>
          ) : isLowStock ? (
            <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-700">
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
          <div className="mt-1 text-[10px] font-semibold text-[#800020]">
            Dealer saving: ₹{(standardPrice - displayPrice).toLocaleString('en-IN')}
          </div>
        )}

        {/* Quantity Selector + Add to Cart / Out of Stock Button */}
        <div className="mt-auto pt-2 border-t border-gray-100 flex h-8.5 w-full items-center gap-1.5 mt-3">
          {/* Qty Stepper - only shown when not OOS */}
          {!isOutOfStock && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex shrink-0 h-8 overflow-hidden rounded border border-gray-300 bg-white text-xs shadow-xs"
            >
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1}
                className="flex w-6 items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="flex w-6 items-center justify-center border-x border-gray-200 text-xs font-bold text-gray-900 select-none">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={maximumQuantity <= 0}
                className="flex w-6 items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
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
              className="flex h-8 w-full items-center justify-center whitespace-nowrap rounded border border-orange-300 bg-orange-50 text-orange-700 text-[10.5px] font-bold tracking-tight uppercase cursor-not-allowed select-none"
            >
              OUT OF STOCK
            </button>
          ) : (
            <button
              type="button"
              disabled={!product.isActive || isAdding}
              onClick={handleAddToCart}
              className={cn(
                'flex h-8 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded px-1.5 sm:px-2 text-[10px] sm:text-[10.5px] font-bold uppercase tracking-tight transition-all shadow-xs',
                isAdded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#800020] text-white hover:bg-[#660019] active:scale-98 cursor-pointer'
              )}
            >
              {isAdding ? (
<<<<<<< HEAD
                <span>ADDING...</span>
=======
                <span className="animate-spin text-xs">●</span>
>>>>>>> 934d1a4eab67a41edc8a69992a0070b627ee5747
              ) : isAdded ? (
                <>
                  <Check className="h-3 w-3 stroke-[3]" />
                  <span>ADDED</span>
                </>
              ) : (
                <span>ADD TO CART</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
