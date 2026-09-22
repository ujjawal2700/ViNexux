import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Store, ArrowRight, ShoppingBag, Trash2 } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import wishlistService from '../../services/wishlistService';
import { ProductCard } from '../../components/products/ProductCard';

const WishlistPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState(() => wishlistService.getWishlist());

  useEffect(() => {
    const handleUpdate = () => {
      setItems(wishlistService.getWishlist());
    };
    window.addEventListener('wishlist-updated', handleUpdate);
    return () => window.removeEventListener('wishlist-updated', handleUpdate);
  }, []);

  const handleClearWishlist = () => {
    if (window.confirm('Are you sure you want to clear your entire wishlist?')) {
      wishlistService.clearWishlist();
      toast.info('Wishlist cleared');
    }
  };

  const isEmpty = items.length === 0;

  return (
    <div className="w-full min-h-[calc(100vh-220px)] bg-white">
      {/* Top Header Bar */}
      <div className="w-full border-b border-gray-100 bg-white">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between flex-wrap gap-3">
          {/* Left Title + Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 fill-red-500 shrink-0" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                My Wishlist
              </h1>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
              {isEmpty ? 'No items saved' : `${items.length} ${items.length === 1 ? 'item' : 'items'} saved`}
            </span>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!isEmpty && (
              <button
                onClick={handleClearWishlist}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 hover:border-red-200 bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 text-xs font-semibold transition-all cursor-pointer"
                title="Clear all saved items"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}

            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs sm:text-sm font-semibold transition-all active:scale-98"
            >
              <Store className="w-4 h-4" />
              <span>Browse Products</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-12">
        {isEmpty ? (
          /* Empty State - Matching megajaipur.com/wishlist */
          <div className="flex flex-col items-center justify-center text-center pt-6 sm:pt-10 pb-16 max-w-lg mx-auto">
            {/* Soft Heart Icon Circle */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-5 shadow-xs">
              <Heart className="w-9 h-9 sm:w-11 sm:h-11 text-primary/70 fill-primary/15 stroke-[1.5]" />
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Your wishlist is empty
            </h2>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-sm mb-4">
              Browse our collection and tap the heart on any product to save it here.
            </p>

            {/* Auth hint */}
            {!isAuthenticated ? (
              <p className="text-xs sm:text-sm text-gray-500 mb-7">
                <Link
                  to="/login"
                  className="font-medium text-primary hover:underline underline-offset-2"
                >
                  Log in
                </Link>{' '}
                — your wishlist follows your account.
              </p>
            ) : (
              <p className="text-xs text-gray-400 mb-7">
                Logged in as <span className="font-semibold text-gray-700">{user?.fullName || user?.email}</span>
              </p>
            )}

            {/* Shop Now Button - Navigates to Home section */}
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all active:scale-98"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Shop Now</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
        ) : (
          /* Populated State - 6 column responsive product grid */
          <div>
            <div className="mb-4 flex items-center justify-between text-xs text-gray-500">
              <span>Showing {items.length} saved {items.length === 1 ? 'item' : 'items'}</span>
              <Link
                to="/products"
                className="text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <span>Continue shopping</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {items.map((product) => (
                <ProductCard
                  key={product._id || product.id}
                  product={product}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
