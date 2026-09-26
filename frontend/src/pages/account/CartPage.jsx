import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import cartService from '../../services/cartService';
import productService from '../../services/productService';
import contentService from '../../services/contentService';
import useToast from '../../hooks/useToast';
import ProductCard from '../../components/products/ProductCard';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  FileText,
  Lock,
  ShieldCheck,
  Store,
  Heart,
  ChevronRight,
} from 'lucide-react';

export const CartPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [cart, setCart] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [supportPhone, setSupportPhone] = useState('918949940610');

  // Format Currency (INR ₹)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 1. Fetch Cart Data
  const fetchCartData = useCallback(async () => {
    if (!isAuthenticated) {
      setCart({ items: [] });
      setIsLoading(false);
      return;
    }

    try {
      const res = await cartService.getCart();
      const cartData = res?.data?.cart || res?.data || res?.cart || res;
      setCart(cartData);

      // Initialize all items as selected
      const items = cartData?.items || [];
      const ids = new Set();
      items.forEach((item) => {
        const id = item.productId?._id || item.productId || item._id;
        if (id) ids.add(String(id));
      });
      setSelectedItemIds(ids);
    } catch (err) {
      console.error('Cart fetch error:', err);
      if (err.response?.status === 401) {
        setCart({ items: [] });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // 2. Fetch Recently Viewed / Popular Products for bottom section
  useEffect(() => {
    const loadRecentlyViewed = async () => {
      try {
        const stored = JSON.parse(localStorage.getItem('vinexus_recently_viewed') || '[]');
        if (stored.length >= 6) {
          setRecentlyViewed(stored.slice(0, 6));
          return;
        }

        // Fetch top featured / popular products as fallback / supplement
        const res = await productService.getProducts({ limit: 12, isActive: true });
        const list = res.data?.products || res.products || [];
        
        // Merge stored with fetched
        const merged = [...stored];
        list.forEach((p) => {
          if (!merged.some((m) => String(m._id) === String(p._id))) {
            merged.push(p);
          }
        });
        setRecentlyViewed(merged.slice(0, 6));
      } catch (err) {
        console.warn('Could not load recently viewed products:', err);
      }
    };

    loadRecentlyViewed();
  }, []);

  // 3. Fetch CMS Footer phone for WhatsApp quotation
  useEffect(() => {
    const fetchFooterPhone = async () => {
      try {
        const footerRes = await contentService.getFooterContent();
        const phoneRaw =
          footerRes.data?.footer?.contactDetails?.phone ||
          footerRes.footer?.contactDetails?.phone;
        if (phoneRaw) {
          const cleaned = phoneRaw.replace(/\D/g, '');
          if (cleaned.length >= 10) {
            setSupportPhone(cleaned.startsWith('91') ? cleaned : `91${cleaned}`);
          }
        }
      } catch {
        // non-blocking
      }
    };
    fetchFooterPhone();
  }, []);

  // 4. Initial fetch & listen to live cart-updated events
  useEffect(() => {
    fetchCartData();
    window.addEventListener('cart-updated', fetchCartData);
    return () => window.removeEventListener('cart-updated', fetchCartData);
  }, [fetchCartData]);

  // Raw items array from cart
  const rawItems = cart?.items || [];
  // Filter valid items where product exists
  const items = useMemo(() => {
    return rawItems.filter((item) => item && (item.productId?._id || item.productId));
  }, [rawItems]);

  // Checkbox Selection Handlers
  const isAllSelected = items.length > 0 && items.every((i) => {
    const id = String(i.productId?._id || i.productId || i._id);
    return selectedItemIds.has(id);
  });

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemIds(new Set());
    } else {
      const allIds = new Set(
        items.map((i) => String(i.productId?._id || i.productId || i._id))
      );
      setSelectedItemIds(allIds);
    }
  };

  const handleToggleSelectItem = (id) => {
    const strId = String(id);
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(strId)) {
        next.delete(strId);
      } else {
        next.add(strId);
      }
      return next;
    });
  };

  // Update Item Quantity (Optimistic + Broadcast)
  const handleUpdateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1 || !productId) return;
    try {
      setUpdatingItemId(productId);

      // Instant optimistic UI update (0ms latency)
      setCart((prev) => {
        if (!prev) return prev;
        const updatedItems = (prev.items || []).map((item) => {
          const id = item.productId?._id || item.productId || item._id;
          if (String(id) === String(productId)) {
            return { ...item, quantity: newQuantity };
          }
          return item;
        });
        const nextCart = { ...prev, items: updatedItems };
        window.dispatchEvent(
          new CustomEvent('cart-updated', {
            detail: { cart: nextCart },
          })
        );
        return nextCart;
      });

      const res = await cartService.updateItemQuantity(productId, newQuantity);
      const updatedCart = res.data?.cart || res.data || res.cart || res;
      if (updatedCart) {
        setCart(updatedCart);
        window.dispatchEvent(
          new CustomEvent('cart-updated', {
            detail: { cart: updatedCart },
          })
        );
      }
    } catch (err) {
      console.error('Update item quantity error:', err);
      toast.error('Failed to update item quantity.');
      fetchCartData();
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Remove Item from Cart (Optimistic + Broadcast)
  const handleRemoveItem = async (productId, productName) => {
    if (!productId) return;
    try {
      setUpdatingItemId(productId);

      // Instant optimistic UI update (0ms latency)
      setCart((prev) => {
        if (!prev) return prev;
        const remaining = (prev.items || []).filter((item) => {
          const id = item.productId?._id || item.productId || item._id;
          return String(id) !== String(productId);
        });
        const nextCart = { ...prev, items: remaining };
        window.dispatchEvent(
          new CustomEvent('cart-updated', {
            detail: { cart: nextCart },
          })
        );
        return nextCart;
      });

      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(String(productId));
        return next;
      });

      const res = await cartService.removeItem(productId);
      const updatedCart = res?.data?.cart || res?.data || res?.cart || res;
      if (updatedCart) {
        setCart(updatedCart);
        window.dispatchEvent(
          new CustomEvent('cart-updated', {
            detail: { cart: updatedCart },
          })
        );
      }
      toast.success(productName ? `Removed "${productName}" from cart` : 'Item removed');
    } catch (err) {
      console.error('Remove item error:', err);
      toast.error('Failed to remove item from cart.');
      fetchCartData();
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Calculations for Order Summary based ONLY on selected items
  const { subtotal, totalDiscount, grandTotal, selectedCount } = useMemo(() => {
    let sub = 0;
    let disc = 0;
    let count = 0;

    items.forEach((item) => {
      const prod = item.productId || {};
      const id = String(prod._id || item.productId || item._id);
      if (!selectedItemIds.has(id)) return;

      const unitPrice =
        item.priceSnapshot !== undefined
          ? item.priceSnapshot
          : (prod.standardPrice || prod.price || 0);
      const cdDiscount = Math.round(unitPrice * 0.015); // ~1.5% CD discount matching Mega Jaipur standards
      const qty = item.quantity || 1;

      sub += unitPrice * qty;
      disc += cdDiscount * qty;
      count += qty;
    });

    const grand = Math.max(0, sub - disc);
    return {
      subtotal: sub,
      totalDiscount: disc,
      grandTotal: grand,
      selectedCount: count,
    };
  }, [items, selectedItemIds]);

  // Proceed to Checkout Handler
  const handleProceedCheckout = () => {
    if (selectedItemIds.size === 0) {
      toast.warning('Please select at least one product to checkout.');
      return;
    }
    navigate('/account/checkout');
  };

  // Convert to Quotation (WhatsApp / Download)
  const handleConvertToQuotation = () => {
    if (selectedItemIds.size === 0) {
      toast.warning('Please select products for quotation.');
      return;
    }

    let text = `*ViNexus Commercial Quotation Request*\n\n`;
    text += `Customer: ${user?.name || user?.fullName || 'Valued Client'}\n`;
    text += `Date: ${new Date().toLocaleDateString('en-IN')}\n\n`;
    text += `*Selected Products:*\n`;

    items.forEach((item, idx) => {
      const prod = item.productId || {};
      const id = String(prod._id || item.productId || item._id);
      if (!selectedItemIds.has(id)) return;

      const name = prod.name || 'Product';
      const pid = prod.sku || `VN-${String(prod._id || '').slice(-4).toUpperCase()}`;
      const unitPrice =
        item.priceSnapshot !== undefined
          ? item.priceSnapshot
          : (prod.standardPrice || prod.price || 0);
      const qty = item.quantity || 1;
      text += `${idx + 1}. *${name}* (PID: ${pid})\n   Qty: ${qty} | Unit: ${formatCurrency(unitPrice)} | Total: ${formatCurrency(unitPrice * qty)}\n\n`;
    });

    text += `*Estimated Subtotal:* ${formatCurrency(subtotal)}\n`;
    text += `*Applicable CD Discount:* -${formatCurrency(totalDiscount)}\n`;
    text += `*Final Quotation Value:* ${formatCurrency(grandTotal)}\n\n`;
    text += `Please issue formal quotation and availability terms.`;

    const waUrl = `https://wa.me/${supportPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 space-y-6 bg-white min-h-screen">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 space-y-10 bg-white text-gray-900 min-h-screen">
      
      {/* 1. TOP HEADER (Matching Mega Jaipur Reference Image) */}
      <div className="flex items-baseline gap-2.5 border-b border-gray-200 pb-3">
        <h1 className="text-xl sm:text-2xl font-bold text-[#420b45] flex items-center gap-2 tracking-tight">
          <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-[#420b45]" />
          <span>My Cart</span>
        </h1>
        <span className="text-xs sm:text-sm text-gray-500 font-normal">
          {items.length} {items.length === 1 ? 'item' : 'items'} · Ready for checkout
        </span>
      </div>

      {/* 2. CART CONTENT (Table Format + Order Summary) */}
      {items.length === 0 ? (
        <div className="py-16 text-center bg-gray-50/50 rounded-2xl border border-gray-200 p-8 space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#420b45]/10 flex items-center justify-center mx-auto text-[#420b45]">
            <ShoppingCart className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Your cart is empty</h2>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Browse our computer hardware, laptops, cameras and accessories catalog to add items.
          </p>
          <div className="pt-2">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#420b45] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#320735] transition-all shadow-xs"
            >
              <Store className="w-4 h-4" /> Continue Shopping
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* ========================================================
              LEFT COLUMN: PRODUCTS TABLE WITH CHECKBOXES (Matching Mega Jaipur)
             ======================================================== */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f5edf6] text-xs font-semibold text-[#420b45] uppercase tracking-wider border-y border-[#eddced] select-none">
                      <th className="py-2.5 px-3 w-14 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="hover:underline font-bold text-xs cursor-pointer text-[#420b45]"
                          title="Click to Toggle Select All"
                        >
                          SELECT
                        </button>
                      </th>
                      <th className="py-2.5 px-2.5 text-left font-semibold whitespace-nowrap">PID</th>
                      <th className="py-2.5 px-2.5 text-left font-semibold whitespace-nowrap">ITEM CD</th>
                      <th className="py-2.5 px-2.5 text-center font-semibold">IMAGE</th>
                      <th className="py-2.5 px-3 text-left font-semibold min-w-[200px]">PRODUCT NAME</th>
                      <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">UNIT PRICE</th>
                      <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">CD DISCOUNT</th>
                      <th className="py-2.5 px-3 text-center font-semibold whitespace-nowrap">QUANTITY</th>
                      <th className="py-2.5 px-4 text-right font-semibold whitespace-nowrap">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => {
                      const prod = item.productId || {};
                      const prodId = String(prod._id || item.productId || item._id);
                      const isSelected = selectedItemIds.has(prodId);

                      const unitPrice =
                        item.priceSnapshot !== undefined
                          ? item.priceSnapshot
                          : (prod.standardPrice || prod.price || 0);
                      const cdDiscount = Math.round(unitPrice * 0.015);
                      const effectivePrice = Math.max(0, unitPrice - cdDiscount);
                      const lineTotal = effectivePrice * (item.quantity || 1);

                      const imgUrl =
                        prod.images?.[0]?.url ||
                        prod.image ||
                        'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=300';
                      
                      // Clean Mega Jaipur PID format (e.g. A3656, A2522)
                      const pid = prod.sku?.replace(/[^0-9]/g, '')
                        ? `A${prod.sku.replace(/[^0-9]/g, '').padStart(4, '0').slice(-4)}`
                        : `A${String(prod._id || '').slice(-4).toUpperCase()}`;

                      // Clean Mega Jaipur ITEM CD format (e.g. 1HVDNEU, 1CXARIE)
                      const itemCd =
                        prod.specifications?.find((s) => s.key?.toLowerCase().includes('code'))?.value ||
                        `1H${String(prod.sku || prod._id || 'VNX').replace(/[^A-Z0-9]/gi, '').slice(-5).toUpperCase()}`;

                      return (
                        <tr
                          key={prodId}
                          className={`hover:bg-gray-50/70 transition-colors ${
                            !isSelected ? 'opacity-50 bg-gray-50/30' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectItem(prodId)}
                              className="w-4 h-4 rounded border-gray-300 text-[#420b45] focus:ring-[#420b45] accent-[#420b45] cursor-pointer"
                            />
                          </td>

                          {/* PID */}
                          <td className="py-3 px-2.5 font-mono text-xs sm:text-[13px] text-gray-700 whitespace-nowrap">
                            {pid}
                          </td>

                          {/* ITEM CD */}
                          <td className="py-3 px-2.5 font-mono text-xs sm:text-[13px] text-gray-700 whitespace-nowrap">
                            {itemCd}
                          </td>

                          {/* IMAGE (Thumbnail matching reference image) */}
                          <td className="py-3 px-2.5 text-center">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded border border-gray-200 p-0.5 inline-flex items-center justify-center overflow-hidden shrink-0">
                              <img
                                src={imgUrl}
                                alt={prod.name || 'Product'}
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                          </td>

                          {/* PRODUCT NAME (1 line with ellipsis) */}
                          <td className="py-3 px-3 min-w-[200px] max-w-[320px]">
                            <Link
                              to={`/products/${prod._id || prodId}`}
                              className="text-xs sm:text-[13px] text-gray-800 hover:text-[#420b45] font-normal truncate block transition-colors"
                              title={prod.name}
                            >
                              {prod.name || 'ViNexus Product'}
                            </Link>
                          </td>

                          {/* UNIT PRICE */}
                          <td className="py-3 px-3 text-right text-gray-800 text-xs sm:text-[13px] whitespace-nowrap">
                            {formatCurrency(unitPrice)}
                          </td>

                          {/* CD DISCOUNT */}
                          <td className="py-3 px-3 text-right text-gray-800 text-xs sm:text-[13px] whitespace-nowrap">
                            {formatCurrency(cdDiscount)}
                          </td>

                          {/* QUANTITY STEPPER (Matching Reference Image) */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="inline-flex items-center border border-[#d2b8d5] rounded bg-white overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(prodId, (item.quantity || 1) - 1)}
                                disabled={(item.quantity || 1) <= 1 || updatingItemId === prodId}
                                className="w-7 h-7 flex items-center justify-center text-[#420b45] hover:bg-[#fbf7fc] disabled:opacity-30 cursor-pointer transition-colors"
                                title="Decrease quantity"
                              >
                                <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                              <span className="w-7 text-center text-xs sm:text-sm font-semibold text-gray-800 select-none">
                                {item.quantity || 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(prodId, (item.quantity || 1) + 1)}
                                disabled={updatingItemId === prodId}
                                className="w-7 h-7 flex items-center justify-center text-[#420b45] hover:bg-[#fbf7fc] disabled:opacity-30 cursor-pointer transition-colors"
                                title="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            </div>
                          </td>

                          {/* TOTAL + TRASH BUTTON */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-3">
                              <span className="font-semibold text-gray-900 text-xs sm:text-[13px]">
                                {formatCurrency(lineTotal)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(prodId, prod.name)}
                                disabled={updatingItemId === prodId}
                                className="text-gray-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4 stroke-[1.5]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions Row (Matching Reference Image) */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
              <button
                type="button"
                onClick={handleConvertToQuotation}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#d2b8d5] rounded-md text-xs sm:text-[13px] font-semibold text-[#420b45] hover:bg-[#fcf8fd] hover:border-[#b895be] transition-all shadow-2xs cursor-pointer active:scale-98"
              >
                <FileText className="w-4 h-4 text-[#420b45]" />
                <span>Convert to quotation</span>
              </button>

              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#d2b8d5] rounded-md text-xs sm:text-[13px] font-semibold text-[#420b45] hover:bg-[#fcf8fd] hover:border-[#b895be] transition-all shadow-2xs active:scale-98"
              >
                <span>Continue Shopping</span>
              </Link>
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN: ORDER SUMMARY CARD (Matching Reference Image)
             ======================================================== */}
          <div className="lg:col-span-4 sticky top-24 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-4 text-left">
              <h2 className="text-base font-semibold text-[#420b45] tracking-tight">
                Order Summary
              </h2>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-gray-600">
                  <span className="uppercase font-medium">SUBTOTAL ({selectedCount} ITEM{selectedCount === 1 ? '' : 'S'})</span>
                  <span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-orange-600 font-semibold">
                  <span>CD DISCOUNT</span>
                  <span>- {formatCurrency(totalDiscount)}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-gray-900">Grand Total</span>
                <span className="text-xl sm:text-2xl font-bold text-[#800020]">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleProceedCheckout}
                disabled={selectedCount === 0}
                className="w-full h-10 rounded bg-[#800020] hover:bg-[#66001a] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
              >
                <Lock className="w-4 h-4" />
                <span>Proceed to Checkout</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 font-medium pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2]" />
                <span>100% Secure SSL Checkout</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          3. RECENTLY VIEWED SECTION (Matching Reference Image)
         ======================================================== */}
      {recentlyViewed.length > 0 && (
        <div className="space-y-4 pt-10 border-t border-gray-200 text-left">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-[#420b45] tracking-tight">
              Recently Viewed
            </h2>
            <Link
              to="/products"
              className="text-xs font-semibold text-[#800020] hover:underline flex items-center gap-1"
            >
              See all products <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {recentlyViewed.map((prod) => (
              <ProductCard
                key={prod._id}
                product={prod}
                className="bg-white border-gray-200 shadow-2xs hover:shadow-md transition-shadow"
              />
            ))}
          </div>
        </div>
      )}

      {/* 4. FOOTER is rendered automatically by PublicLayout below this main container */}
    </div>
  );
};

export default CartPage;
