import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import cartService from '../../services/cartService';
import guestCartService from '../../services/guestCartService';
import productService from '../../services/productService';
import contentService from '../../services/contentService';
import categoryService from '../../services/categoryService';
import useToast from '../../hooks/useToast';
import ProductCard from '../../components/products/ProductCard';
import { buildProductPath } from '../../utils/categoryUrls';
import { getAvailableStock, getMaximumOrderQuantity } from '../../utils/inventory';
import { allowsPreferences } from '../../utils/storageConsent';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  FileText,
  ShieldCheck,
  Store,
  ChevronRight,
} from 'lucide-react';

const WhatsAppIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M.057 24l1.687-6.163A11.86 11.86 0 0 1 .157 11.891C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24Zm6.597-3.807a9.86 9.86 0 0 0 5.392 1.592c5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.746 5.634l-.999 3.648 3.742-.981Zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414Z" />
  </svg>
);

export const CartPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [cart, setCart] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [primaryHeaderCategory, setPrimaryHeaderCategory] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [supportPhone, setSupportPhone] = useState('918769959424');
  const [whatsappNote, setWhatsappNote] = useState('Please confirm live stock availability, delivery timeline & share official GST commercial invoice.');

  // Raw items array from cart
  const rawItems = cart?.items || [];
  // Filter valid items where product exists
  const items = useMemo(() => {
    return rawItems.filter((item) => item && (item.productId?._id || item.productId));
  }, [rawItems]);

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
      const guestCart = guestCartService.getCart();
      setCart(guestCart);
      setSelectedItemIds(new Set(guestCart.items.map((item) => String(item.productId?._id || item.productId))));
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
    let active = true;
    const loadRecentlyViewed = async () => {
      if (!allowsPreferences()) {
        setRecentlyViewed([]);
        return;
      }
      try {
        const stored = JSON.parse(localStorage.getItem('vinexus_recently_viewed') || '[]');
        if (stored.length >= 6) {
          if (active) setRecentlyViewed(stored.slice(0, 6));
          return;
        }

        // Fetch top featured / popular products as fallback / supplement
        const res = await productService.getProducts({ limit: 12, isActive: true, includeFacets: false });
        const list = res.data?.products || res.products || [];
        
        // Merge stored with fetched
        const merged = [...stored];
        list.forEach((p) => {
          if (!merged.some((m) => String(m._id) === String(p._id))) {
            merged.push(p);
          }
        });
        if (active) setRecentlyViewed(merged.slice(0, 6));
      } catch (err) {
        console.warn('Could not load recently viewed products:', err);
      }
    };

    loadRecentlyViewed();
    window.addEventListener('storage-choices-updated', loadRecentlyViewed);
    return () => {
      active = false;
      window.removeEventListener('storage-choices-updated', loadRecentlyViewed);
    };
  }, []);

  // 3. Load Category Tree to map categories across levels (Header -> Main -> Sub)
  useEffect(() => {
    let active = true;
    categoryService.getCategoryTree()
      .then((res) => {
        if (active) {
          setAllCategories(res.data?.categories || res.categories || []);
        }
      })
      .catch((err) => console.warn('Could not load categories for cart recommendations:', err));
    return () => { active = false; };
  }, []);

  // 4. Fetch Similar Products based on Header, Main, and Sub categories of cart items (Max 10)
  useEffect(() => {
    if (!items.length) {
      setSimilarProducts([]);
      setPrimaryHeaderCategory(null);
      return;
    }

    let active = true;
    setSimilarLoading(true);

    const loadSimilarProducts = async () => {
      try {
        const cartProductIds = new Set(
          items.map((i) => String(i.productId?._id || i.productId || i._id))
        );

        const cartCatIds = new Set();
        items.forEach((item) => {
          const p = item.productId || {};
          const cId = p.categoryId?._id || p.categoryId;
          if (cId) cartCatIds.add(String(cId));
        });

        const subCatIds = new Set();
        const mainCatIds = new Set();
        const rootCatMap = new Map();

        cartCatIds.forEach((cId) => {
          const cat = allCategories.find((c) => String(c._id) === cId);
          if (!cat) return;

          let curr = cat;
          const path = [curr];
          const visited = new Set([String(curr._id)]);

          while (curr.parentId) {
            const pId = String(curr.parentId?._id || curr.parentId);
            if (visited.has(pId)) break;
            visited.add(pId);
            const parent = allCategories.find((c) => String(c._id) === pId);
            if (parent) {
              path.unshift(parent);
              curr = parent;
            } else {
              break;
            }
          }

          const root = path[0];
          if (root) {
            rootCatMap.set(String(root._id), root);
          }

          if (path.length >= 3) {
            // [Header/Root, Main, Sub]
            subCatIds.add(String(path[2]._id));
            mainCatIds.add(String(path[1]._id));
          } else if (path.length === 2) {
            // [Header/Root, Main]
            mainCatIds.add(String(path[1]._id));
          }
        });

        // Resolve primary header category (from first cart item, or first resolved root)
        const firstCartItem = items[0]?.productId || {};
        const firstCId = String(firstCartItem.categoryId?._id || firstCartItem.categoryId || '');
        let targetRoot = null;

        if (firstCId) {
          let curr = allCategories.find((c) => String(c._id) === firstCId);
          const visited = new Set();
          while (curr && curr.parentId && !visited.has(String(curr._id))) {
            visited.add(String(curr._id));
            const pId = String(curr.parentId?._id || curr.parentId);
            curr = allCategories.find((c) => String(c._id) === pId);
          }
          if (curr) targetRoot = curr;
        }

        if (!targetRoot && rootCatMap.size > 0) {
          targetRoot = Array.from(rootCatMap.values())[0];
        }

        if (active) {
          setPrimaryHeaderCategory(targetRoot || null);
        }

        // Fetch candidate products from backend for root categories
        const rootIds = Array.from(rootCatMap.keys());
        const targetIds = rootIds.length > 0 ? rootIds.slice(0, 2) : (targetRoot?._id ? [targetRoot._id] : []);

        let candidateList = [];
        if (targetIds.length > 0) {
          const fetchPromises = targetIds.map((id) =>
            productService.getProducts({ categoryId: id, limit: 25, isActive: true, includeFacets: false })
              .then((res) => res.data?.products || res.products || [])
              .catch(() => [])
          );
          const results = await Promise.all(fetchPromises);
          const merged = [];
          const seen = new Set();
          results.flat().forEach((p) => {
            if (p?._id && !seen.has(String(p._id))) {
              seen.add(String(p._id));
              merged.push(p);
            }
          });
          candidateList = merged;
        } else {
          const res = await productService.getProducts({ limit: 25, isActive: true, includeFacets: false });
          candidateList = res.data?.products || res.products || [];
        }

        // Score products: subcategory match (+30), main category match (+20), header category match (+10)
        const scored = candidateList
          .filter((p) => !cartProductIds.has(String(p._id)))
          .map((p) => {
            const pCatId = String(p.categoryId?._id || p.categoryId || '');
            let score = 10;
            if (subCatIds.has(pCatId)) {
              score = 30; // exact same subcategory
            } else if (mainCatIds.has(pCatId)) {
              score = 20; // same main category
            }
            return { product: p, score };
          });

        scored.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return new Date(b.product.createdAt || 0) - new Date(a.product.createdAt || 0);
        });

        // Limit strictly to max 10 products
        const top10 = scored.slice(0, 10).map((s) => s.product);

        if (active) {
          setSimilarProducts(top10);
        }
      } catch (err) {
        console.warn('Failed to load similar products for cart:', err);
        if (active) setSimilarProducts([]);
      } finally {
        if (active) setSimilarLoading(false);
      }
    };

    loadSimilarProducts();
    return () => { active = false; };
  }, [items, allCategories]);

  // 5. Fetch CMS Footer WhatsApp settings
  useEffect(() => {
    const fetchFooterPhone = async () => {
      try {
        const footerRes = await contentService.getFooterContent();
        const footer = footerRes?.data?.footer || footerRes?.footer || footerRes?.data;
        const phoneRaw = footer?.whatsappNumbers?.[0]?.number || footer?.whatsappNumber || '8769959424';
        const cleaned = phoneRaw.replace(/\D/g, '');
        if (cleaned.length >= 10) {
          setSupportPhone(cleaned.startsWith('91') ? cleaned : `91${cleaned.slice(-10)}`);
        } else {
          setSupportPhone('918769959424');
        }
        if (footer?.whatsappMessageNote) {
          setWhatsappNote(footer.whatsappMessageNote);
        }
      } catch {
        setSupportPhone('918769959424');
      }
    };
    fetchFooterPhone();
  }, []);
  // 4. Initial fetch & listen to live cart-updated events
  useEffect(() => {
    fetchCartData();
    const handleCartUpdated = (e) => {
      // Ignore self-dispatched events to prevent stale background refetches during quantity updates
      if (e?.detail?.source === 'cart-page') return;
      if (e?.detail?.cart) {
        setCart(e.detail.cart);
        return;
      }
      fetchCartData();
    };
    window.addEventListener('cart-updated', handleCartUpdated);
    return () => window.removeEventListener('cart-updated', handleCartUpdated);
  }, [fetchCartData]);

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
  const handleUpdateQuantity = async (productId, newQuantity, product) => {
    if (newQuantity < 1 || !productId) return;
    const maxAllowed = getMaximumOrderQuantity(product);
    if (newQuantity > maxAllowed) {
      toast.warning('The quantity limit for this enquiry has been reached.');
      return;
    }
    const availableStock = getAvailableStock(product);
    if (availableStock !== null && newQuantity > availableStock) {
      toast.warning('The quantity limit for this enquiry has been reached.');
      return;
    }
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

      const res = isAuthenticated ? await cartService.updateItemQuantity(productId, newQuantity) : guestCartService.updateItem(productId, newQuantity);
      const updatedCart = isAuthenticated ? (res.data?.cart || res.data || res.cart || res) : res;
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

      const res = isAuthenticated ? await cartService.removeItem(productId) : guestCartService.removeItem(productId);
      const updatedCart = isAuthenticated ? (res?.data?.cart || res?.data || res?.cart || res) : res;
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
      const standardPrice = prod.standardPrice || prod.price || unitPrice;
      const cdDiscount = Math.max(0, standardPrice - unitPrice);
      const qty = item.quantity || 1;

      sub += standardPrice * qty;
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

  const selectedLineCount = items.filter((item) => {
    const product = item.productId || {};
    return selectedItemIds.has(String(product._id || item.productId || item._id));
  }).length;

  // Proceed to Checkout Handler
  const handleProceedCheckout = () => {
    if (selectedItemIds.size === 0) {
      toast.warning('Please select at least one product to checkout.');
      return;
    }
    if (!isAuthenticated) {
      toast.info('Please sign up or log in to send your enquiry. Your cart will be kept.');
      navigate('/login', { state: { from: { pathname: '/account/checkout-enquiry' } } });
      return;
    }
    sessionStorage.setItem('vinexus_enquiry_selected_products', JSON.stringify([...selectedItemIds]));
    navigate('/account/checkout-enquiry');
  };

  // Open a pre-filled WhatsApp chat with the CMS-configured admin number.
  const handleChatOnWhatsApp = () => {
    if (!isAuthenticated) {
      toast.info('Please sign up or log in to chat on WhatsApp. Your cart will be kept.');
      navigate('/login', { state: { from: { pathname: '/cart' } } });
      return;
    }

    if (selectedItemIds.size === 0) {
      toast.warning('Please select at least one product using the checkboxes.');
      return;
    }

    const customerName = user?.fullName || user?.name || user?.contactPerson || 'Customer';
    const customerPhone = user?.phone ? ` | Phone: ${user.phone}` : '';
    const nowStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let text = `🛍️ *ViNexus Compu World — Product Enquiry*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👤 *Customer:* ${customerName}${customerPhone}\n`;
    text += `📅 *Date:* ${nowStr}\n\n`;
    text += `📦 *Selected Items (${selectedCount} pcs):*\n`;

    let itemIndex = 0;
    items.forEach((item) => {
      const prod = item.productId || {};
      const id = String(prod._id || item.productId || item._id);
      if (!selectedItemIds.has(id)) return;

      itemIndex += 1;
      const name = prod.name || 'Product';
      const model = prod.modelNumber || prod.specifications?.find((s) => s.key?.toLowerCase().includes('model'))?.value || '';

      const unitPrice =
        item.priceSnapshot !== undefined
          ? item.priceSnapshot
          : (prod.standardPrice || prod.price || 0);
      const qty = item.quantity || 1;
      const itemTotal = unitPrice * qty;

      text += `${itemIndex}. *${name}*\n`;
      if (model) text += `   • Model: ${model}\n`;
      text += `   • Qty: *${qty}* | Unit: ${formatCurrency(unitPrice)} | Total: *${formatCurrency(itemTotal)}*\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *Enquiry Summary:*\n`;
    text += `• Total Items: ${selectedCount}\n`;
    text += `• Subtotal: ${formatCurrency(subtotal)}\n`;
    if (totalDiscount > 0) {
      text += `• Verified Dealer Discount: -${formatCurrency(totalDiscount)}\n`;
    }
    text += `👉 *Estimated Total: ${formatCurrency(grandTotal)}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `💬 _${whatsappNote || 'Please confirm live stock availability, delivery timeline & share official GST commercial invoice.'}_\n`;

    const cleanNumber = (supportPhone || '8769959424').replace(/\D/g, '');
    const finalPhone =
      cleanNumber.length === 10
        ? `91${cleanNumber}`
        : cleanNumber.startsWith('91')
        ? cleanNumber
        : `91${cleanNumber.slice(-10) || '8769959424'}`;
    const encodedText = encodeURIComponent(text);
    const waUrl = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodedText}`;

    try {
      const link = document.createElement('a');
      link.href = waUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(waUrl, '_blank');
    }

    toast.success('Opening the pre-filled WhatsApp chat.');
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
    <div className={`storefront-container px-3 sm:px-6 lg:px-8 2xl:px-12 py-6 space-y-8 bg-white text-gray-900 min-h-screen ${items.length ? 'pb-24 md:pb-6' : ''}`}>
      
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
              to="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--store-primary)] text-white text-xs font-bold uppercase tracking-wider hover:bg-[var(--store-primary-hover)] transition-all shadow-xs"
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
              <div className="space-y-3 p-3 md:hidden">
                <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-800">
                  <input type="checkbox" checked={selectedLineCount === items.length} onChange={handleToggleSelectAll} className="h-4 w-4 accent-[var(--store-primary)]" />
                  <span className="flex-1">Select all items</span>
                  <span className="text-gray-500">{selectedLineCount}/{items.length}</span>
                </label>
                {items.map((item) => {
                  const prod = item.productId || {};
                  const prodId = String(prod._id || item.productId || item._id);
                  const unitPrice = item.priceSnapshot !== undefined ? item.priceSnapshot : (prod.standardPrice || prod.price || 0);
                  const availableStock = getAvailableStock(prod);
                  const maxAllowedQty = getMaximumOrderQuantity(prod);
                  const currentQty = item.quantity || 1;
                  const isAtLimit = currentQty >= maxAllowedQty || (availableStock !== null && currentQty >= availableStock);
                  const imgUrl = prod.images?.[0]?.url || prod.image || '';
                  return (
                    <div key={prodId} className={`rounded-lg border border-gray-200 bg-white p-3 ${selectedItemIds.has(prodId) ? '' : 'opacity-60'}`}>
                      <div className="flex items-start gap-2.5">
                        <input type="checkbox" aria-label={`Select ${prod.name || 'product'}`} checked={selectedItemIds.has(prodId)} onChange={() => handleToggleSelectItem(prodId)} className="mt-3 h-4 w-4 shrink-0 accent-[var(--store-primary)]" />
                        <Link to={buildProductPath(prod)} className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-gray-200 bg-white p-1">
                          {imgUrl ? <img loading="lazy" decoding="async" src={imgUrl} alt={prod.name || 'Product'} className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] text-gray-400">No image</span>}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link to={buildProductPath(prod)} className="line-clamp-2 text-xs font-semibold leading-snug text-gray-900">{prod.name || 'Vinexus Product'}</Link>
                          <p className="mt-1 truncate text-[10px] text-gray-600">Model: {prod.modelNumber || prod.model || '—'}</p>
                          <p className="mt-1 text-[11px] font-semibold text-gray-800">{formatCurrency(unitPrice)} each</p>
                        </div>
                        <button type="button" onClick={() => handleRemoveItem(prodId, prod.name)} disabled={updatingItemId === prodId} aria-label={`Remove ${prod.name || 'product'}`} className="p-1 text-gray-500 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-2 border-t border-gray-100 pt-2.5">
                        <div>
                          <div className="inline-flex items-center overflow-hidden rounded border border-gray-300 bg-white">
                            <button type="button" onClick={() => handleUpdateQuantity(prodId, (item.quantity || 1) - 1, prod)} disabled={(item.quantity || 1) <= 1 || updatingItemId === prodId} aria-label="Decrease quantity" className="flex h-8 w-8 items-center justify-center disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                            <span className="flex h-8 w-8 items-center justify-center border-x border-gray-200 text-xs font-semibold">{item.quantity || 1}</span>
                            <button type="button" onClick={() => handleUpdateQuantity(prodId, (item.quantity || 1) + 1, prod)} disabled={updatingItemId === prodId || isAtLimit || availableStock === 0} aria-label="Increase quantity" className="flex h-8 w-8 items-center justify-center disabled:opacity-30"><Plus className="h-4 w-4" /></button>
                          </div>
                          {isAtLimit && (
                            <p className="mt-1 text-[10px] font-semibold text-[var(--store-primary)]">
                              Enquiry quantity limit reached
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-bold text-[var(--store-primary)]">{formatCurrency(unitPrice * (item.quantity || 1))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden md:block overflow-x-auto">
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
                      <th className="py-2.5 px-2.5 text-left font-semibold whitespace-nowrap">MODEL</th>
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
                      const standardPrice = prod.standardPrice || prod.price || unitPrice;
                      const cdDiscount = Math.max(0, standardPrice - unitPrice);
                      const lineTotal = unitPrice * (item.quantity || 1);
                      const availableStock = getAvailableStock(prod);
                      const maxAllowedQty = getMaximumOrderQuantity(prod);
                      const currentQty = item.quantity || 1;
                      const isAtLimit = currentQty >= maxAllowedQty || (availableStock !== null && currentQty >= availableStock);

                      const imgUrl =
                        prod.images?.[0]?.url ||
                        prod.image ||
                        'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=300';
                      
                      const model = prod.modelNumber || prod.specifications?.find((s) => s.key?.toLowerCase().includes('model'))?.value || '—';

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

                          {/* MODEL */}
                          <td className="py-3 px-2.5 font-mono text-xs sm:text-[13px] text-gray-700 whitespace-nowrap">
                            {model}
                          </td>

                          {/* IMAGE (Thumbnail matching reference image) */}
                          <td className="py-3 px-2.5 text-center">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded border border-gray-200 p-0.5 inline-flex items-center justify-center overflow-hidden shrink-0">
                              <img loading="lazy" decoding="async"
                                src={imgUrl}
                                alt={prod.name || 'Product'}
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                          </td>

                          {/* PRODUCT NAME (1 line with ellipsis) */}
                          <td className="py-3 px-3 min-w-[200px] max-w-[320px]">
                            <Link
                              to={buildProductPath(prod)}
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
                                onClick={() => handleUpdateQuantity(prodId, (item.quantity || 1) - 1, prod)}
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
                                onClick={() => handleUpdateQuantity(prodId, (item.quantity || 1) + 1, prod)}
                                disabled={updatingItemId === prodId || isAtLimit || availableStock === 0}
                                className="w-7 h-7 flex items-center justify-center text-[#420b45] hover:bg-[#fbf7fc] disabled:opacity-30 cursor-pointer transition-colors"
                                title="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            </div>
                            {isAtLimit && (
                              <div className="mt-1 text-[11px] font-semibold text-[var(--store-primary)]">
                                Enquiry quantity limit reached
                              </div>
                            )}
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

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#d2b8d5] rounded-md text-xs sm:text-[13px] font-semibold text-[var(--store-primary)] hover:bg-[#fcf8fd] hover:border-[var(--store-primary)] transition-all shadow-2xs active:scale-98"
              >
                <span>Continue Shopping</span>
              </Link>
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN: ORDER SUMMARY CARD (Matching Reference Image)
             ======================================================== */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
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
                <span className="text-xl sm:text-2xl font-bold text-[var(--store-primary)]">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              {/* Primary cart actions */}
              <div className="space-y-2.5 pt-2">
                {/* 1. WhatsApp chat button */}
                <button
                  type="button"
                  onClick={handleChatOnWhatsApp}
                  disabled={selectedCount === 0}
                  className="w-full h-11 rounded-md bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <WhatsAppIcon className="w-4 h-4 text-white" />
                  <span>Chat on WhatsApp</span>
                </button>

                {/* 2. Send Enquiry Web Form Button */}
                <button
                  type="button"
                  onClick={handleProceedCheckout}
                  disabled={selectedCount === 0}
                  className="w-full h-11 rounded-md bg-[var(--store-primary)] hover:bg-[var(--store-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <FileText className="w-4 h-4" />
                  <span>Send Enquiry</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 font-medium pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2]" />
                <span>Selected products are ready to send as an enquiry</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SIMILAR PRODUCTS SECTION (Same Header, Main & Sub Category - Max 10)
         ======================================================== */}
      {items.length > 0 && (similarLoading || similarProducts.length > 0) && (
        <div className="space-y-4 pt-10 border-t border-gray-200 text-left">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#420b45] tracking-tight">
                Similar Products{primaryHeaderCategory?.name ? ` in ${primaryHeaderCategory.name}` : ''}
              </h2>
              <p className="text-xs text-gray-500">
                Products from the same category you can add directly to your order
              </p>
            </div>
            <Link
              to={primaryHeaderCategory?.slug ? `/${primaryHeaderCategory.slug}` : '/products'}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[var(--store-primary)] bg-white text-xs sm:text-sm font-semibold text-[var(--store-primary)] hover:bg-[var(--store-primary)] hover:text-white shadow-2xs transition-all cursor-pointer"
            >
              <span>View All Products</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {similarLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-md" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {similarProducts.map((prod) => (
                <ProductCard
                  key={prod._id}
                  product={prod}
                  onCartUpdated={fetchCartData}
                  className="bg-white border-gray-200 shadow-2xs hover:shadow-md transition-shadow"
                />
              ))}
            </div>
          )}
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
              to="/"
              className="text-xs font-semibold text-[var(--store-primary)] hover:underline flex items-center gap-1"
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

      {items.length > 0 && <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] md:hidden">
        <div className="min-w-0 flex-1"><p className="text-[10px] text-gray-600">TOTAL ({selectedCount} ITEMS)</p><p className="truncate text-base font-bold text-[var(--store-primary)]">{formatCurrency(grandTotal)}</p></div>
        <button type="button" onClick={handleProceedCheckout} disabled={selectedCount === 0} className="min-h-10 rounded-md bg-[var(--store-primary)] px-4 text-xs font-bold text-white disabled:opacity-50">Send Enquiry</button>
      </div>}

      {/* 4. FOOTER is rendered automatically by PublicLayout below this main container */}
    </div>
  );
};

export default CartPage;
