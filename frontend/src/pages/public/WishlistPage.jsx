import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Store, ShoppingCart, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import wishlistService from '../../services/wishlistService';
import cartService from '../../services/cartService';

export const WishlistPage = () => {
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState(() => wishlistService.getWishlist());
  const [page, setPage] = useState(1);
  const pageSize = 12; // Matching Mega Jaipur pagination (12 items per page)

  useEffect(() => {
    const handleUpdate = () => {
      setItems(wishlistService.getWishlist());
    };
    window.addEventListener('wishlist-updated', handleUpdate);
    return () => window.removeEventListener('wishlist-updated', handleUpdate);
  }, []);

  // Format Currency (INR ₹)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Stock status logic
  const getStockInfo = (product) => {
    const stock =
      product.stock !== undefined
        ? product.stock
        : (product.inventory?.quantity !== undefined ? product.inventory.quantity : 10);

    if (stock <= 0) {
      return { label: '• On Order', color: 'text-amber-700', canAdd: false };
    }
    if (stock <= 5) {
      return { label: '• Low Stock', color: 'text-amber-600', canAdd: true };
    }
    return { label: '• In Stock', color: 'text-emerald-600', canAdd: true };
  };

  // Add item to cart + broadcast
  const handleAddToCart = async (product) => {
    try {
      const productId = product._id || product.id;
      const unitPrice = product.standardPrice || product.price || 0;

      // Trigger instant toast notification
      window.dispatchEvent(
        new CustomEvent('cart-item-added', {
          detail: {
            product,
            quantity: 1,
            price: unitPrice,
          },
        })
      );

      if (isAuthenticated) {
        const res = await cartService.addItem(productId, 1);
        const updatedCart = res.data?.cart || res.data || res.cart || res;
        window.dispatchEvent(
          new CustomEvent('cart-updated', {
            detail: { cart: updatedCart },
          })
        );
      } else {
        window.dispatchEvent(new CustomEvent('cart-updated'));
      }

      toast.success(`Added "${product.name || 'item'}" to cart`);
    } catch (err) {
      console.error('Failed to add to cart:', err);
      toast.error('Failed to add to cart');
    }
  };

  // Remove single item from wishlist
  const handleRemove = (product) => {
    wishlistService.toggleWishlist(product);
    toast.info(`Removed "${product.name || 'item'}" from wishlist`);
  };

  const totalPages = Math.ceil(items.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page]);

  const isEmpty = items.length === 0;

  // User display name
  const userName = user?.fullName || user?.name || (user?.email ? user.email.split('@')[0].toUpperCase() : 'USER');

  return (
    <div className="w-full bg-white text-gray-900 pb-2">
      {/* 1. TOP HEADER (Matching Mega Jaipur Image 1, 2 & 3) */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-100 pb-4">
          {/* Left Title: Heart + User's Wishlist + Items Saved Badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500 fill-red-500 shrink-0" />
              <h1 className="text-xl sm:text-2xl font-bold text-[#800020] tracking-tight">
                {userName} &apos;s Wishlist
              </h1>
            </div>
            <span className="text-xs font-semibold text-[#800020] bg-red-50 px-3 py-1 rounded-full border border-red-100">
              {items.length} {items.length === 1 ? 'item' : 'items'} saved
            </span>
          </div>

          {/* Right Action: Browse Products Button */}
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-50 hover:bg-red-100 text-[#800020] text-xs sm:text-[13px] font-semibold transition-colors shadow-2xs cursor-pointer active:scale-98"
          >
            <Store className="w-4 h-4 text-[#800020]" />
            <span>Browse Products</span>
          </Link>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-2">
        {isEmpty ? (
          /* Empty State */
          <div className="py-20 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto text-[#800020]">
              <Heart className="w-8 h-8 text-[#800020] stroke-[1.5]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Your wishlist is empty</h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Browse our catalog and tap the heart icon on any product to save it here.
            </p>
            <div className="pt-2">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#800020] hover:bg-[#66001a] text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs"
              >
                <Store className="w-4 h-4" />
                <span>Explore Products</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Populated State (Matching Mega Jaipur 4-column Card Grid) */
          <div className="space-y-6">
            {/* 4-column responsive grid: preserves exact card size even if 1 or 2 products */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedItems.map((product) => {
                const prodId = product._id || product.id;
                const unitPrice = product.standardPrice || product.price || 0;
                const cdDiscount = Math.round(unitPrice * 0.015);
                const stockInfo = getStockInfo(product);

                const imgUrl =
                  product.images?.[0]?.url ||
                  product.image ||
                  'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=300';

                // Clean PID (e.g. P972, A3773)
                const pid = product.sku?.replace(/[^0-9]/g, '')
                  ? `P${product.sku.replace(/[^0-9]/g, '').slice(-4)}`
                  : `P${String(prodId || '').slice(-4).toUpperCase()}`;

                // Clean ITEM CD (e.g. 03G32DI, 11O3HDY)
                const itemCd =
                  product.specifications?.find((s) => s.key?.toLowerCase().includes('code'))?.value ||
                  `1H${String(product.sku || prodId || 'VNX').replace(/[^A-Z0-9]/gi, '').slice(-5).toUpperCase()}`;

                return (
                  <div
                    key={prodId}
                    className="bg-white rounded-lg border border-[#eddced] p-3 flex flex-col justify-between hover:shadow-sm transition-all group relative"
                  >
                    {/* Top Row: Small Red Heart + Stock Status */}
                    <div className="flex items-center justify-between mb-2">
                      <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 shrink-0" />
                      <span className={`text-[11px] font-semibold ${stockInfo.color} select-none`}>
                        {stockInfo.label}
                      </span>
                    </div>

                    {/* Middle Row (Horizontal): Image (Left) + Details (Right) */}
                    <div className="flex items-center gap-3 py-1 flex-1">
                      {/* Image Thumbnail */}
                      <Link
                        to={`/products/${prodId}`}
                        className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center bg-white rounded p-1 overflow-hidden"
                      >
                        <img
                          src={imgUrl}
                          alt={product.name || 'Product'}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </Link>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <Link
                          to={`/products/${prodId}`}
                          className="text-xs font-semibold text-gray-900 hover:text-[#420b45] line-clamp-2 leading-tight block transition-colors"
                          title={product.name}
                        >
                          {product.name || 'ViNexus Product'}
                        </Link>

                        {/* Price & CD Discount */}
                        <div className="flex items-baseline gap-1.5 flex-wrap pt-0.5">
                          <span className="text-xs sm:text-[13px] font-bold text-gray-900">
                            {formatCurrency(unitPrice)}
                          </span>
                          <span className="text-[10px] font-medium bg-[#f5edf6] text-[#420b45] px-1.5 py-0.5 rounded leading-none">
                            CD DISCOUNT: {formatCurrency(cdDiscount)}
                          </span>
                        </div>

                        {/* PID badge */}
                        <div>
                          <span className="text-[10px] font-mono font-medium text-[#420b45] bg-[#f5edf6] px-1.5 py-0.5 rounded inline-block leading-none">
                            PID: {pid}
                          </span>
                        </div>

                        {/* ITEM CD badge */}
                        <div>
                          <span className="text-[10px] font-mono font-medium text-[#420b45] bg-[#f5edf6] px-1.5 py-0.5 rounded inline-block leading-none">
                            ITEM CD: {itemCd}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: [Add to Cart] + [Remove] */}
                    <div className="flex items-center gap-2 pt-2.5 mt-2 border-t border-gray-100">
                      {stockInfo.canAdd ? (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          className="flex-1 h-7 sm:h-8 rounded bg-[#800020] hover:bg-[#66001a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98 shadow-xs"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Add to Cart</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="flex-1 h-7 sm:h-8 rounded bg-gray-100 text-gray-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Add to Cart</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemove(product)}
                        className="h-7 sm:h-8 px-2 rounded text-gray-500 hover:text-red-600 hover:bg-gray-50 text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Remove from wishlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3. PAGINATION BAR (Matching Mega Jaipur Image 2 - only shown when items > pageSize) */}
            {items.length > pageSize && (
              <div className="flex items-center justify-between flex-wrap gap-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                {/* Left: Showing X-Y of Z */}
                <div>
                  Showing {(page - 1) * pageSize + 1}-
                  {Math.min(page * pageSize, items.length)} of {items.length}
                </div>

                {/* Right: Prev, Numbers, Next */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={page === 1}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>

                    {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setPage(num);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`min-w-[28px] h-7 px-2 rounded text-xs font-semibold transition-colors cursor-pointer ${
                          page === num
                            ? 'bg-[#800020] text-white shadow-2xs'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {num}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setPage((p) => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={page === totalPages}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
