import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import cartService from '../../services/cartService';
import { Card, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge, StatusBadge } from '../ui/Badge';
import { Image } from '../ui/Image';
import { ShoppingCart, Eye, Tag, CheckCircle2 } from 'lucide-react';

export const ProductCard = ({ product, onCartUpdated }) => {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);

  if (!product) return null;

  // Extract primary image
  const primaryImage = product.images?.[0]?.url || product.image || '';

  // Determine user role for pricing presentation
  const isApprovedDealer = user?.role === 'dealer' && (user?.dealerStatus === 'approved' || user?.kycStatus === 'approved');
  const isAdmin = user?.role === 'admin';

  // Pricing calculations for UI presentation
  const standardPrice = product.standardPrice || 0;
  const dealerPrice = product.dealerPrice || 0;

  // Determine displayed main price and savings tag
  let displayPrice = standardPrice;
  let hasDealerDiscount = false;

  if (isApprovedDealer && dealerPrice > 0) {
    displayPrice = dealerPrice;
    if (standardPrice > dealerPrice) {
      hasDealerDiscount = true;
    }
  }

  // Format currency helper (INR ₹)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Handle Add to Cart action
  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.info('Please log in to add products to your cart.');
      navigate('/login');
      return;
    }

    // Admins are view-only according to RBAC
    if (user?.role === 'admin') {
      toast.warning('Admin accounts are view-only and cannot submit cart items.');
      return;
    }

    try {
      setIsAdding(true);
      await cartService.addItem(product._id, 1);
      toast.success(`"${product.name}" added to cart!`);
      if (onCartUpdated) {
        onCartUpdated();
      }
    } catch (err) {
      console.error('Failed to add item to cart:', err);
      const errMsg = err.response?.data?.message || 'Failed to add product to cart.';
      toast.error(errMsg);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card hoverable className="h-full flex flex-col justify-between overflow-hidden group bg-white border-[#e5d1d4] hover:border-[#800020] transition-all duration-300 shadow-sm hover:shadow-xl">
      <div>
        {/* Product Image & Badges Overlay */}
        <div className="relative overflow-hidden bg-[#f4e7ea]">
          <Link to={`/products/${product._id}`} className="block">
            <Image
              src={primaryImage}
              alt={product.name}
              aspectRatio="aspect-square"
              className="group-hover:scale-105 transition-transform duration-500"
            />
          </Link>

          {/* Top Floating Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
            <div className="flex flex-col gap-1">
              {product.isFeatured && (
                <Badge variant="warning" className="shadow-md backdrop-blur-md">
                  Featured
                </Badge>
              )}
              {hasDealerDiscount && (
                <Badge variant="success" icon={<Tag className="w-3 h-3" />} className="shadow-md backdrop-blur-md">
                  Wholesale Price
                </Badge>
              )}
            </div>

            <StatusBadge status={product.isActive ? 'in-stock' : 'out-of-stock'} />
          </div>
        </div>

        {/* Product Content Details */}
        <CardContent className="p-5 space-y-3">
          {/* Category & SKU row */}
          <div className="flex items-center justify-between text-xs text-[#7c5c5f] font-semibold">
            <span className="truncate max-w-[60%] text-[#7c5c5f]">
              {typeof product.categoryId === 'object' ? product.categoryId?.name : 'Security'}
            </span>
            <span className="font-mono text-[11px] text-[#7c5c5f] uppercase tracking-wider">
              {product.sku}
            </span>
          </div>

          {/* Product Name */}
          <Link to={`/products/${product._id}`} className="block group-hover:text-[#800020] transition-colors">
            <h3 className="font-bold text-[#3d0a0d] text-base line-clamp-2 leading-snug">
              {product.name}
            </h3>
          </Link>

          {/* Short Description */}
          {product.description && (
            <p className="text-xs text-[#7c5c5f] line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Role-Aware Pricing Presentation */}
          <div className="pt-2 border-t border-[#e5d1d4] flex items-baseline justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-[#3d0a0d] tracking-tight">
                  {formatCurrency(displayPrice)}
                </span>

                {/* Show Strike-through Standard Price for Approved Dealers */}
                {hasDealerDiscount && (
                  <span className="text-xs text-[#7c5c5f] line-through font-medium">
                    {formatCurrency(standardPrice)}
                  </span>
                )}
              </div>

              {/* Price level subtitle explanation */}
              <div className="text-[10px] text-[#7c5c5f] mt-0.5 font-medium">
                {isApprovedDealer ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Dealer Price Unlocked
                  </span>
                ) : isAdmin ? (
                  <span className="text-[#7c5c5f]">Standard: {formatCurrency(standardPrice)} | Dealer: {formatCurrency(dealerPrice)}</span>
                ) : (
                  <span>Standard Retail Price</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Card Action Buttons */}
      <CardFooter className="p-5 pt-0 gap-2 border-t-0">
        <Button
          variant="primary"
          size="sm"
          fullWidth
          isLoading={isAdding}
          isDisabled={!product.isActive}
          leftIcon={<ShoppingCart className="w-4 h-4" />}
          onClick={handleAddToCart}
        >
          {product.isActive ? 'Add to Cart' : 'Out of Stock'}
        </Button>
        <Link to={`/products/${product._id}`}>
          <Button
            variant="outline"
            size="sm"
            iconOnly
            title="View Details"
            className="hover:border-[#800020]"
          >
            <Eye className="w-4 h-4 text-[#800020]" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
