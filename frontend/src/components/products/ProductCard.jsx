import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import cartService from '../../services/cartService';
import { Button } from '../ui/Button';
import { ShoppingCart, CheckCircle2, Tag } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ProductCard = ({ product, onCartUpdated, className }) => {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  if (!product) return null;

  // Fallback high quality Unsplash images
  const fallbackImages = [
    'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
  ];

  let primaryImage = product.images?.[0]?.url || product.image;
  if (!primaryImage || typeof primaryImage !== 'string' || !primaryImage.startsWith('http')) {
    const hash = (product._id || product.name || '0').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    primaryImage = fallbackImages[hash % fallbackImages.length];
  }

  // Determine user role for pricing presentation
  const isApprovedDealer = user?.role === 'dealer' && (user?.dealerStatus === 'approved' || user?.kycStatus === 'approved');
  const isAdmin = user?.role === 'admin';

  const standardPrice = product.standardPrice || 0;
  const dealerPrice = product.dealerPrice || 0;

  let displayPrice = standardPrice;
  let hasDealerDiscount = false;

  if (isApprovedDealer && dealerPrice > 0) {
    displayPrice = dealerPrice;
    if (standardPrice > dealerPrice) {
      hasDealerDiscount = true;
    }
  }

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const discountPercent = hasDealerDiscount && standardPrice > 0
    ? Math.round(((standardPrice - dealerPrice) / standardPrice) * 100)
    : 0;

  const offerText = hasDealerDiscount
    ? `${discountPercent}% Off (Wholesale)`
    : product.isFeatured
    ? 'Featured Deal'
    : 'Standard Price';

  const tagline = product.description || (typeof product.categoryId === 'object' ? product.categoryId?.name : 'Surveillance Hardware');

  // Handle Add to Cart action
  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.info('Please log in to add products to your cart.');
      navigate('/login');
      return;
    }

    if (isAdmin) {
      toast.warning('Admin accounts are view-only and cannot submit cart items.');
      return;
    }

    try {
      setIsAdding(true);
      await cartService.addItem(product._id, 1);
      toast.success(`"${product.name}" added to cart!`);
      setIsAdded(true);
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
    navigate(`/products/${product._id}`);
  };

  return (
    <motion.div
      onClick={handleCardClick}
      className={cn(
        "group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-3 sm:p-3.5 text-card-foreground shadow-xs transition-all duration-300 ease-in-out hover:shadow-lg hover:border-primary/50 cursor-pointer",
        className
      )}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Top Left Discount / Status Badge */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
        {hasDealerDiscount ? (
          <span className="rounded-md bg-emerald-600 text-white px-1.5 py-0.5 font-extrabold text-[9px] uppercase tracking-wider shadow-sm">
            {discountPercent}% OFF
          </span>
        ) : product.isFeatured ? (
          <span className="rounded-md bg-primary text-white px-1.5 py-0.5 font-bold text-[9px] uppercase tracking-wider shadow-sm">
            Featured
          </span>
        ) : <div />}

        {!product.isActive && (
          <span className="rounded-md bg-rose-600 text-white px-1.5 py-0.5 font-bold text-[9px] shadow-sm">
            Out of Stock
          </span>
        )}
      </div>

      {/* Product Image Box */}
      <div className="relative mb-2.5 flex h-28 sm:h-34 w-full items-center justify-center overflow-hidden rounded-xl bg-muted/30 p-2">
        <img
          src={primaryImage}
          alt={product.name}
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          draggable={false}
        />
      </div>

      {/* Tagline / Stock Status */}
      <div className="flex flex-col text-left gap-1 w-full flex-grow">
        <div className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
          <span className="truncate">{typeof product.categoryId === 'object' ? product.categoryId?.name : 'Surveillance'}</span>
        </div>

        {/* Product Name */}
        <h3 className="font-bold text-foreground text-xs leading-snug group-hover:text-primary transition-colors line-clamp-2 text-left">
          {product.name}
        </h3>
      </div>

      {/* Pricing & ADD Action Button Row */}
      <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between gap-2 w-full">
        <div className="flex flex-col text-left">
          <span className="text-sm sm:text-base font-black tracking-tight text-foreground">
            {formatPrice(displayPrice)}
          </span>
          {hasDealerDiscount && (
            <span className="text-[10px] font-bold text-muted-foreground line-through">
              {formatPrice(standardPrice)}
            </span>
          )}
        </div>

        {/* Action Button */}
        <Button
          variant={isAdded ? "success" : "outline"}
          size="sm"
          isLoading={isAdding}
          isDisabled={!product.isActive || isAdded}
          onClick={handleAddToCart}
          className={cn(
            "px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-xs shrink-0",
            isAdded
              ? "bg-emerald-600 text-white border-emerald-600"
              : "border-primary text-primary hover:bg-primary hover:text-white"
          )}
        >
          {isAdded ? 'ADDED' : 'ADD'}
        </Button>
      </div>
    </motion.div>
  );
};

export default ProductCard;
