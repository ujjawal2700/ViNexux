import { Image } from '../ui/Image';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import cartService from '../../services/cartService';
import guestCartService from '../../services/guestCartService';
import wishlistService from '../../services/wishlistService';
import { Minus, Plus, Check, Heart } from 'lucide-react';
import { cn } from '../../lib/utils';
import { buildProductPath } from '../../utils/categoryUrls';

export const ProductCard = ({ product, onCartUpdated, className }) => {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
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

  let displayPrice = product?.applicablePrice ?? standardPrice;
  let hasDealerDiscount = false;

  if (isApprovedDealer && dealerPrice > 0) {
    displayPrice = product?.applicablePrice ?? dealerPrice;
    if (standardPrice > dealerPrice) {
      hasDealerDiscount = true;
    }
  }

  // Brand tag
  const brandName =
    product.specifications?.find((s) => s.key?.toLowerCase() === 'brand')?.value ||
    (typeof product.categoryId === 'object' ? product.categoryId?.name : 'ViNexus');

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
    setQuantity((prev) => prev + 1);
  };

  // Handle Add to Cart action
  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

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
      window.dispatchEvent(
        new CustomEvent('cart-updated', {
          detail: { cart: updatedCart },
        })
      );
      window.dispatchEvent(
        new CustomEvent('cart-item-added', {
          detail: {
            product,
            quantity,
            displayPrice,
            cart: updatedCart,
          },
        })
      );
      if (onCartUpdated) {
        onCartUpdated();
      }
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
        "group relative flex h-full flex-col justify-between overflow-hidden rounded border border-gray-200 bg-white p-3 sm:p-3.5 text-gray-900 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer",
        className
      )}
    >
      {/* Top Image Container with generous height like Mega Jaipur */}
      <div className="relative mb-2.5 flex h-48 sm:h-52 md:h-56 lg:h-60 w-full items-center justify-center overflow-hidden bg-white p-2 sm:p-3">
        {/* Wishlist Floating Button (visible on hover, matching Mega Jaipur) */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-label="Wishlist"
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:scale-105 active:scale-95 transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-colors",
              isWishlisted ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-500"
            )}
          />
        </button>

        <Image
          src={primaryImage}
          alt={product.name}
          objectFit="object-contain"
          className="h-full w-full transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* Content Container */}
      <div className="flex flex-col text-left gap-1.5 w-full flex-grow">
        {/* Title */}
        <h3 className="font-semibold text-xs sm:text-sm text-gray-800 leading-snug line-clamp-2 min-h-[34px] sm:min-h-[38px] group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {product.modelNumber && <div className="text-[10px] sm:text-[11px] text-gray-500 font-medium">Model: <strong className="text-gray-700">{product.modelNumber}</strong></div>}

        {/* Price & In Stock row */}
        <div className="flex items-center justify-between gap-1 pt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-sm sm:text-base md:text-lg font-bold text-gray-900">
              ₹{(Number(displayPrice) || 0).toLocaleString('en-IN')}
            </span>
            {hasDealerDiscount && (
              <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                ₹{(Number(standardPrice) || 0).toLocaleString('en-IN')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block"></span>
              {product.stockStatus === 'in-stock' ? 'In Stock' : product.stockStatus === 'out-of-stock' ? 'Out of Stock' : 'On Request'}
            </span>
            <span className="text-[10px] sm:text-[11px] text-gray-500 font-bold uppercase truncate max-w-[65px] sm:max-w-[85px]" title={brandName}>
              {brandName}
            </span>
          </div>
        </div>

        {hasDealerDiscount && <div className="text-xs text-emerald-700">Dealer saving: ?{(standardPrice - displayPrice).toLocaleString('en-IN')}</div>}

        {/* Sub-label: Quantity Slabs Not Applicable */}
        <div className="text-[10px] text-gray-400 select-none pt-0.5">
          Quantity Slabs Not Applicable
        </div>
      </div>

      {/* Interactive Actions Row: Quantity Stepper + ADD TO CART */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center gap-1.5 w-full min-w-0">
        {/* Quantity Stepper [- 1 +] */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center border border-gray-300 rounded bg-white overflow-hidden text-xs shrink-0 h-9"
        >
          <button
            type="button"
            onClick={handleDecrement}
            className="w-6 h-full text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-center font-bold"
            aria-label="Decrease quantity"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-6 text-center font-bold text-gray-800 select-none text-xs">
            {quantity}
          </span>
          <button
            type="button"
            onClick={handleIncrement}
            className="w-6 h-full text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-center font-bold"
            aria-label="Increase quantity"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* ADD TO CART Button in Solid Maroon */}
        <button
          type="button"
          disabled={!product.isActive || isAdding}
          onClick={handleAddToCart}
          className={cn(
            "flex-1 min-w-0 h-9 px-1 rounded text-[9px] sm:text-[10px] font-bold uppercase transition-all duration-150 flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap",
            isAdded
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-primary hover:bg-primary/90 text-white active:scale-98"
          )}
        >
          {isAdding ? (
            <span className="animate-spin text-xs">●</span>
          ) : isAdded ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3]" /> ADDED
            </>
          ) : (
            'ADD TO CART'
          )}
        </button>

      </div>
    </div>
  );
};

export default ProductCard;
