import { Image } from '../components/ui/Image';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import contentService from '../services/contentService';
import cartService from '../services/cartService';
import guestCartService from '../services/guestCartService';
import wishlistService from '../services/wishlistService';
import categoryService from '../services/categoryService';
import productService from '../services/productService';
import { ROLES } from '../constants';
import Logo from '../components/ui/Logo';
import useWebsiteSettings from '../hooks/useWebsiteSettings';
import { Drawer } from '../components/ui/Drawer';
import { Skeleton } from '../components/ui/Skeleton';
import { slugify, buildCategoryPath, buildProductPath } from '../utils/categoryUrls';
import { openStorageChoices } from '../utils/storageConsent';
import {
  Search,
  Mic,
  Camera,
  Phone,
  Store,
  Heart,
  FileText,
  ShoppingCart,
  Trash2,
  Check,
  X,
  User,
  LogIn,
  Menu,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ArrowRight,
  Laptop as LaptopIcon,
  Monitor,
  HardDrive,
  Keyboard,
  Printer,
  Shield,
  Wifi,
  FileCode,
  Briefcase,
  Cable,
  Cpu,
  Layers,
  Smartphone,
  MapPin,
  Mail,
} from 'lucide-react';

const STORE_MAP_URL = 'https://maps.app.goo.gl/QSuzGqkbp2HxMHLp6';
const CONTACT_PHONE_DISPLAY = '8209224481';
const CONTACT_PHONE_LINK = '+918209224481';
const WHATSAPP_NUMBER = '918209224481';

const getHeaderCategoryIcon = (name = '', slug = '') => {
  const s = (slug + ' ' + name).toLowerCase();
  if (s.includes('laptop')) return <LaptopIcon className="w-4 h-4" />;
  if (s.includes('desktop')) return <Monitor className="w-4 h-4" />;
  if (s.includes('storage')) return <HardDrive className="w-4 h-4" />;
  if (s.includes('display')) return <Monitor className="w-4 h-4" />;
  if (s.includes('peripheral')) return <Keyboard className="w-4 h-4" />;
  if (s.includes('printer')) return <Printer className="w-4 h-4" />;
  if (s.includes('security')) return <Shield className="w-4 h-4" />;
  if (s.includes('network')) return <Wifi className="w-4 h-4" />;
  if (s.includes('software')) return <FileCode className="w-4 h-4" />;
  if (s.includes('mobility')) return <Briefcase className="w-4 h-4" />;
  if (s.includes('cable')) return <Cable className="w-4 h-4" />;
  if (s.includes('connector') || s.includes('converter')) return <Cpu className="w-4 h-4" />;
  if (s.includes('accessories')) return <Layers className="w-4 h-4" />;
  if (s.includes('telecom')) return <Phone className="w-4 h-4" />;
  if (s.includes('mobile')) return <Smartphone className="w-4 h-4" />;
  return <Layers className="w-4 h-4" />;
};

const PublicLayout = () => {
  const { user, isAuthenticated, adminUser, isAdminAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings: websiteSettings } = useWebsiteSettings();
  const websiteName = (websiteSettings.websiteName || 'Vi Nexus').toUpperCase();

  // Search state
  const [headerSearch, setHeaderSearch] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const searchDebounceRef = useRef(null);

  // Mobile menu drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Cart state
  const [cartCount, setCartCount] = useState(0);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [isCartHovered, setIsCartHovered] = useState(false);
  const cartCloseTimeoutRef = useRef(null);
  const [addedCartToast, setAddedCartToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Wishlist state
  const [wishlistCount, setWishlistCount] = useState(() => wishlistService.getWishlist().length);

  // CMS Footer state
  const [footerData, setFooterData] = useState(null);

  // Category Mega Menu & Navigation State
  const [allCategories, setAllCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);
  const [categoryRetry, setCategoryRetry] = useState(0);
  const [hoveredHeaderId, setHoveredHeaderId] = useState(null);
  const closeTimeoutRef = useRef(null);

  // Responsive category bar positioning & horizontal scrolling
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [dropdownLeft, setDropdownLeft] = useState(16);
  const headerItemRefs = useRef({});
  const categoryNavRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Re-read on navigation/focus so admin catalog edits are reflected without
  // a hardcoded menu or a persistent stale cache.
  useEffect(() => {
    let active = true;
    const fetchCats = async () => {
      try {
        const res = await categoryService.getCategoryTree();
        if (!active) return;
        setAllCategories(res.data?.categories || []);
        setCategoriesError(null);
      } catch {
        if (!active) return;
        setAllCategories([]);
        setCategoriesError('Categories unavailable');
      } finally {
        if (active) setCategoriesLoading(false);
      }
    };
    fetchCats();
    window.addEventListener('focus', fetchCats);
    return () => { active = false; window.removeEventListener('focus', fetchCats); };
  }, [location.pathname, categoryRetry]);

  // Category Tree: Headers -> Mains -> Subs
  const categoryTree = useMemo(() => {
    const headers = allCategories.filter((c) => !c.parentId);
    return headers.map((header) => {
      const mains = allCategories.filter((c) => {
        const pId = c.parentId?._id || c.parentId;
        return pId && String(pId) === String(header._id);
      });

      const mainsWithSubs = mains.map((main) => {
        const subs = allCategories.filter((c) => {
          const pId = c.parentId?._id || c.parentId;
          return pId && String(pId) === String(main._id);
        });
        return {
          ...main,
          subCategories: subs,
        };
      });

      return {
        ...header,
        mainCategories: mainsWithSubs,
      };
    });
  }, [allCategories]);

  const checkNavScroll = useCallback(() => {
    const el = categoryNavRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    checkNavScroll();
    window.addEventListener('resize', checkNavScroll);
    return () => window.removeEventListener('resize', checkNavScroll);
  }, [categoryTree, checkNavScroll]);

  const scrollNav = (direction) => {
    if (categoryNavRef.current) {
      const scrollAmount = 280;
      categoryNavRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkNavScroll, 300);
    }
  };

  const handleCategoryWheel = (e) => {
    if (categoryNavRef.current && e.deltaY !== 0) {
      categoryNavRef.current.scrollLeft += e.deltaY;
      checkNavScroll();
    }
  };

  const megaMenuRef = useRef(null);

  const hoveredHeader = useMemo(() => {
    if (!hoveredHeaderId) return null;
    return categoryTree.find((h) => String(h._id) === String(hoveredHeaderId));
  }, [categoryTree, hoveredHeaderId]);

  // Click outside listener for Mega Menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target)) {
        const isHeaderItem = Object.values(headerItemRefs.current).some(
          (el) => el && el.contains(e.target)
        );
        if (!isHeaderItem) {
          setHoveredHeaderId(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnterHeader = (headerId) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    setHoveredHeaderId(headerId);
    const el = headerItemRefs.current[headerId];
    if (el) {
      const rect = el.getBoundingClientRect();
      setDropdownLeft(rect.left);
    }
  };

  const handleMouseLeaveHeader = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredHeaderId(null);
    }, 200);
  };

  const handleHeaderClick = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setHoveredHeaderId(null);
  };

  // Divide main categories into 3 balanced columns matching Mega Jaipur screenshot
  const dropdownColumns = useMemo(() => {
    if (!hoveredHeader || !hoveredHeader.mainCategories) return [[], [], []];
    const mains = hoveredHeader.mainCategories;
    const col1 = [];
    const col2 = [];
    const col3 = [];
    let w1 = 0, w2 = 0, w3 = 0;

    mains.forEach((main) => {
      const hasSubs = main.subCategories && main.subCategories.length > 0;
      const weight = hasSubs ? 1 + main.subCategories.length * 0.7 : 1;
      if (w1 <= w2 && w1 <= w3) {
        col1.push(main);
        w1 += weight;
      } else if (w2 <= w1 && w2 <= w3) {
        col2.push(main);
        w2 += weight;
      } else {
        col3.push(main);
        w3 += weight;
      }
    });

    return [col1, col2, col3];
  }, [hoveredHeader]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Sync wishlist item count on changes
  useEffect(() => {
    const handleWishlistChange = () => {
      setWishlistCount(wishlistService.getWishlist().length);
    };
    window.addEventListener('wishlist-updated', handleWishlistChange);
    return () => window.removeEventListener('wishlist-updated', handleWishlistChange);
  }, []);

  // Fetch Cart Item Count, Subtotal, and Cart Items
  const fetchCartData = useCallback(async () => {
    if (user?.role === 'admin') {
      setCartCount(0);
      setCartSubtotal(0);
      setCartItems([]);
      return;
    }
    try {
      const response = isAuthenticated ? await cartService.getCart() : guestCartService.getCart();
      const cart = isAuthenticated ? (response?.data?.cart || response?.data || response?.cart || response) : response;
      const rawItems = cart?.items || [];
      // Filter valid items where product exists
      const items = rawItems.filter((i) => i && (i.productId?._id || i.productId));
      
      // 1 product in cart = 1, 2 products = 2 (Count of distinct products)
      const count = items.length;

      // Subtotal after CD discount (matching Mega Jaipur and CartPage)
      const subtotal = items.reduce((acc, item) => {
        const prod = item.productId || item.product || {};
        const unitPrice =
          item.priceSnapshot !== undefined
            ? item.priceSnapshot
            : (prod.standardPrice || prod.price || 0);
        return acc + unitPrice * (item.quantity || 1);
      }, 0);

      setCartCount(count);
      setCartSubtotal(subtotal);
      setCartItems(items);
    } catch (err) {
      console.warn('Failed to fetch cart data in layout:', err);
      setCartCount(0);
      setCartSubtotal(0);
      setCartItems([]);
    }
  }, [isAuthenticated, user]);

  // Fetch on mount or auth change, and listen for live cart-updated events
  useEffect(() => {
    const handleCartUpdated = (e) => {
      if (e?.detail?.cart) {
        const cartData = e.detail.cart;
        const rawItems = cartData.items || [];
        const items = rawItems.filter((i) => i && (i.productId?._id || i.productId));
        const count = items.length; // 1 product = 1, 2 products = 2
        const subtotal = items.reduce((acc, item) => {
          const prod = item.productId || item.product || {};
          const unitPrice =
            item.priceSnapshot !== undefined
              ? item.priceSnapshot
              : (prod.standardPrice || prod.price || 0);
          return acc + unitPrice * (item.quantity || 1);
        }, 0);

        setCartCount(count);
        setCartSubtotal(subtotal);
        setCartItems(items);
        return;
      }
      fetchCartData();
    };

    fetchCartData();
    window.addEventListener('cart-updated', handleCartUpdated);
    return () => window.removeEventListener('cart-updated', handleCartUpdated);
  }, [fetchCartData, location.pathname]);

  // Listen for Added to Cart popup event (Matching Image 2)
  useEffect(() => {
    const handleItemAdded = async (e) => {
      const { product, quantity, displayPrice, cart: freshCart } = e.detail || {};
      if (!product) return;
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);

      const addQty = quantity || 1;
      const unitPrice = displayPrice || product.standardPrice || product.price || 0;
      const prodId = String(product._id || product.id);

      // If freshCart was passed from response, use it directly (0ms)
      if (freshCart?.items) {
        const rawItems = freshCart.items || [];
        const items = rawItems.filter((i) => i && (i.productId?._id || i.productId));
        const count = items.length;
        const subtotal = items.reduce((acc, item) => {
          const p = item.productId || item.product || {};
          const uPrice =
            item.priceSnapshot !== undefined
              ? item.priceSnapshot
              : (p.standardPrice || p.price || 0);
          return acc + uPrice * (item.quantity || 1);
        }, 0);
        setCartCount(count);
        setCartSubtotal(subtotal);
        setCartItems(items);
      } else {
        // Instant optimistic update (0ms)
        setCartItems((prev) => {
          const existingIdx = prev.findIndex((i) => {
            const id = String(i.productId?._id || i.productId || i._id);
            return id === prodId;
          });

          let updated;
          if (existingIdx > -1) {
            updated = [...prev];
            updated[existingIdx] = {
              ...updated[existingIdx],
              quantity: (updated[existingIdx].quantity || 1) + addQty,
            };
          } else {
            updated = [
              ...prev,
              {
                _id: `temp_${Date.now()}`,
                productId: product,
                quantity: addQty,
                priceSnapshot: unitPrice,
              },
            ];
            // Only increment product count if brand new product added
            setCartCount((c) => c + 1);
          }

          const newSubtotal = updated.reduce((acc, item) => {
            const p = item.productId || item.product || {};
            const uPrice =
              item.priceSnapshot !== undefined
                ? item.priceSnapshot
                : (p.standardPrice || p.price || 0);
            return acc + uPrice * (item.quantity || 1);
          }, 0);
          setCartSubtotal(newSubtotal);

          return updated;
        });
      }

      // Show toast
      setAddedCartToast({
        id: Date.now(),
        product,
        quantity: addQty,
        price: unitPrice,
      });

      toastTimeoutRef.current = setTimeout(() => {
        setAddedCartToast(null);
      }, 5000);

      // Background sync with server
      await fetchCartData();
    };

    window.addEventListener('cart-item-added', handleItemAdded);
    return () => {
      window.removeEventListener('cart-item-added', handleItemAdded);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [fetchCartData]);

  // Remove item directly from cart hover dropdown (Instant Optimistic + Broadcast)
  const handleRemoveCartItem = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!productId) return;
    try {
      const prodIdStr = String(productId);
      let updatedList = [];
      setCartItems((prev) => {
        updatedList = prev.filter((item) => {
          const id = String(item.productId?._id || item.productId || item._id);
          return id !== prodIdStr;
        });

        // Unique product count decrements by 1 (e.g. 2 -> 1, 1 -> 0)
        setCartCount(updatedList.length);

        const newSubtotal = updatedList.reduce((acc, item) => {
          const p = item.productId || item.product || {};
          const uPrice =
            item.priceSnapshot !== undefined
              ? item.priceSnapshot
              : (p.standardPrice || p.price || 0);
          return acc + uPrice * (item.quantity || 1);
        }, 0);
        setCartSubtotal(newSubtotal);

        return updatedList;
      });

      // Broadcast to all open pages (e.g. CartPage updates immediately without reload!)
      window.dispatchEvent(
        new CustomEvent('cart-updated', {
          detail: { cart: { items: updatedList } },
        })
      );

      if (isAuthenticated) await cartService.removeItem(productId);
      else guestCartService.removeItem(productId);
      await fetchCartData();
    } catch (err) {
      console.error('Failed to remove cart item:', err);
      fetchCartData();
    }
  };

  // Fetch CMS Footer Content
  useEffect(() => {
    const fetchFooter = async () => {
      try {
        const response = await contentService.getFooterContent();
        if (response.success && response.data?.footer) {
          setFooterData(response.data.footer);
        } else if (response.footer) {
          setFooterData(response.footer);
        }
      } catch (err) {
        console.warn('Failed to load CMS footer content:', err);
      }
    };

    fetchFooter();
  }, []);

  const searchCategory = useMemo(() => {
    const path = location.pathname.replace(/\/$/, '');
    return allCategories.find((category) => buildCategoryPath(category, allCategories) === path);
  }, [allCategories, location.pathname]);
  const searchTarget = useCallback((text) => {
    const query = new URLSearchParams(location.search);
    query.set('search', text);
    return `${searchCategory ? location.pathname : '/search'}?${query}`;
  }, [searchCategory, location.pathname, location.search]);

  // Handle Header Search Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (headerSearch.trim()) {
      navigate(searchTarget(headerSearch.trim()));
      setIsMobileMenuOpen(false);
      setIsSearchOpen(false);
    }
  };

  // Debounced Live Search Suggestions
  useEffect(() => {
    let active = true;
    const query = headerSearch.trim();
    if (!query) {
      setSearchSuggestions([]);
      setIsSearching(false);
      setIsSearchOpen(false);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await productService.getProducts({
          search: query,
          ...(searchCategory ? { categoryId: searchCategory._id } : {}),
          limit: 8,
          isActive: true,
        });
        const prods = res?.data?.products || res?.products || [];
        if (!active) return;
        setSearchSuggestions(prods);
        setIsSearchOpen(true);
      } catch (err) {
        if (!active) return;
        setSearchSuggestions([]);
        console.warn('Live search error:', err);
        setSearchSuggestions([]);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [headerSearch, searchCategory]);

  // Click outside and keydown listeners to dismiss search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isInsideDesktop = desktopSearchRef.current && desktopSearchRef.current.contains(e.target);
      const isInsideMobile = mobileSearchRef.current && mobileSearchRef.current.contains(e.target);
      if (!isInsideDesktop && !isInsideMobile) {
        setIsSearchOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close search dropdown on route change
  useEffect(() => {
    setIsSearchOpen(false);
  }, [location.pathname, location.search]);

  // Format product search row data
  const formatSearchProduct = (prod) => {
    const img = prod?.images?.[0]?.url || prod?.image;

    const brand =
      prod.specifications?.find((s) => s.key?.toLowerCase() === 'brand')?.value ||
      (typeof prod.categoryId === 'object' ? prod.categoryId?.name : 'OEM');

    const price = prod.applicablePrice ?? prod.standardPrice ?? 0;

    const pidCode = prod.sku
      ? `A${prod.sku.replace(/[^0-9]/g, '').slice(-4) || prod.sku.slice(-4).toUpperCase()}`
      : `A${(prod._id || '3768').slice(-4).toUpperCase()}`;

    const itemCd =
      prod.specifications?.find((s) => s.key?.toLowerCase().includes('code') || s.key?.toLowerCase().includes('item cd'))?.value ||
      (prod.sku ? prod.sku.replace(/[^A-Za-z0-9]/g, '').slice(-7).toUpperCase() : (prod._id || '1INGRUO').slice(-7).toUpperCase());

    const stockText = prod.stockStatus === 'in-stock' ? 'In Stock' : prod.stockStatus === 'out-of-stock' ? 'Out of Stock' : 'On Request';
    const stockClass = 'text-gray-600 font-medium text-[11px]';

    return { img, brand, price, pidCode, itemCd, stockText, stockClass };
  };

  // Render Search Autocomplete Dropdown
  const renderSearchDropdown = () => {
    if (!isSearchOpen || !headerSearch.trim()) return null;

    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-b-lg shadow-2xl border border-gray-200 z-50 overflow-hidden text-left animate-in fade-in-50 duration-150">
        {isSearching && searchSuggestions.length === 0 ? (
          <div role="status" aria-label="Searching products" className="space-y-3 px-4 py-4">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : searchSuggestions.length === 0 ? (
          <div>
            <div className="py-7 px-4 text-center text-[13px] text-gray-600 font-normal">
              No matches &mdash; press Enter to see full results.
            </div>
            <div
              onClick={() => {
                navigate(searchTarget(headerSearch.trim()));
                setIsSearchOpen(false);
              }}
              className="border-t border-gray-100 flex items-center justify-between px-4 py-3 text-sm text-[#800020] hover:bg-gray-50 cursor-pointer font-medium transition-colors group"
            >
              <span>View all results for &ldquo;{headerSearch.trim()}&rdquo;</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        ) : (
          <div>
            <div className="px-4 pt-3 pb-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
              PRODUCTS
            </div>
            <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100">
              {searchSuggestions.map((prod) => {
                const { img, brand, price, pidCode, itemCd, stockText, stockClass } = formatSearchProduct(prod);
                return (
                  <div
                    key={prod._id}
                    onClick={() => {
                      navigate(buildProductPath(prod, allCategories));
                      setIsSearchOpen(false);
                    }}
                    className="flex items-center px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded border border-gray-200 p-1 flex items-center justify-center shrink-0 bg-white mr-3">
                      <Image
                        src={img}
                        alt={prod.name}
                        className="w-full h-full object-contain"

                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="text-[13px] font-medium text-gray-900 group-hover:text-primary transition-colors truncate leading-snug">
                        {prod.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs mt-0.5">
                        <span className="font-semibold text-gray-500 uppercase tracking-tight text-[11px]">
                          {brand}
                        </span>
                        <span className="font-bold text-gray-900">
                          ₹{price.toLocaleString('en-IN')}
                        </span>
                        <span className={stockClass}>
                          {stockText}
                        </span>
                      </div>
                      {(prod.modelNumber || prod.specifications?.find((s) => s.key?.toLowerCase().includes('model'))?.value) && <div className="text-[11px] text-gray-400 mt-0.5">Model: {prod.modelNumber || prod.specifications.find((s) => s.key?.toLowerCase().includes('model'))?.value}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              onClick={() => {
                navigate(searchTarget(headerSearch.trim()));
                setIsSearchOpen(false);
              }}
              className="border-t border-gray-100 flex items-center justify-between px-4 py-2.5 text-xs text-[#800020] hover:bg-gray-50 cursor-pointer font-medium transition-colors group"
            >
              <span>View all results for &ldquo;{headerSearch.trim()}&rdquo;</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const getProfileLink = () => {
    if (user?.role === ROLES.DEALER || user?.role === ROLES.CUSTOMER) return '/account/profile';
    return null;
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900 flex flex-col font-sans">
      {/* 1. STICKY HEADER CONTAINER (Locks top announcement + main header + category nav at top when scrolling) */}
      <header className="sticky top-0 z-50 w-full bg-white shadow-xs">
        
        {/* Top Announcement Bar (Mega Jaipur Style: Welcome back, {FULL_NAME}, you are now logged in. Logout) */}
        <div className="w-full bg-white border-b border-gray-200 py-1 sm:py-1.5 px-4 text-center text-xs text-gray-600 font-medium tracking-wide">
          {isAuthenticated ? (
            <span>
              Welcome back,{' '}
              <strong className="text-[#800020] font-bold uppercase tracking-tight">
                {user?.fullName || user?.name || user?.contactPerson || 'Customer'}
              </strong>
              {user?.role === 'dealer' && ' (Verified Dealer)'}
              {', you are now logged in. '}
              <button
                type="button"
                onClick={handleLogout}
                className="font-bold text-[#800020] hover:underline cursor-pointer transition-colors inline-block ml-0.5"
              >
                Logout
              </button>
            </span>
          ) : (
            <span>You are not logged in.</span>
          )}
        </div>

        {/* Main Header Row */}
        <div className="storefront-container bg-[#800020] md:bg-white px-3 sm:px-5 lg:px-6 2xl:px-8 py-2 md:py-3 sm:py-3.5 flex items-center justify-between gap-1.5 sm:gap-3 lg:gap-4 min-[1750px]:gap-5 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden flex h-9 w-8 shrink-0 items-center justify-center text-white"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          {/* Logo & Brand Name */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group" aria-label="Vinexus home">
            <Logo className="w-8 h-8 sm:w-12 sm:h-12 object-contain rounded bg-white p-0.5 md:bg-transparent md:p-0 group-hover:scale-105 transition-transform" />
            <div className="hidden md:flex flex-col text-left">
              <div className="flex items-center" aria-label={websiteName}>
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-primary">{websiteName.slice(0, 2)}</span>
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">{websiteName.slice(2)}</span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-primary uppercase -mt-1">
                COMPU WORLD
              </span>
            </div>
          </Link>

          {/* Search Bar with Mic & Camera & Search Button (Expands across middle to eliminate margin) */}
          <form
            ref={desktopSearchRef}
            onSubmit={handleSearchSubmit}
            className="flex-1 min-w-0 max-w-4xl hidden md:flex items-center mx-1 lg:mx-2 min-[1750px]:mx-3 relative"
          >
            <div className="relative w-full flex items-center">
              <input
                type="text"
                placeholder="Search laptops, printers, RAM, SSD, cameras, CCTV..."
                value={headerSearch}
                onFocus={() => {
                  if (headerSearch.trim()) setIsSearchOpen(true);
                }}
                onChange={(e) => {
                  setHeaderSearch(e.target.value);
                  if (e.target.value.trim()) setIsSearchOpen(true);
                }}
                className="w-full h-11 lg:h-12 pl-4 pr-20 bg-gray-50 hover:bg-white focus:bg-white text-gray-900 placeholder-gray-400 text-sm rounded-l-md border border-r-0 border-gray-300 focus:border-primary focus:outline-none transition-all shadow-inner"
              />

              {/* Mic & Camera quick buttons */}
              <div className="absolute right-3 flex items-center gap-2 text-gray-400">
                <button
                  type="button"
                  title="Voice Search"
                  className="hover:text-primary transition-colors p-1"
                >
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  type="button"
                  title="Search by Image"
                  className="hover:text-primary transition-colors p-1"
                >
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Live Search Autocomplete Dropdown */}
              {renderSearchDropdown()}
            </div>

            {/* Search Button in Maroon */}
            <button
              type="submit"
              className="h-11 lg:h-12 px-5 sm:px-7 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-r-md flex items-center gap-2 transition-colors shrink-0 shadow-xs cursor-pointer active:scale-98"
            >
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span>Search</span>
            </button>
          </form>

          {/* Action Icons & Details Cluster */}
          <div className="ml-auto flex items-center gap-1 sm:gap-2 lg:gap-3 min-[1750px]:gap-4 shrink-0">
            
            {/* Contact details appear when browser zoom-out provides a wide viewport. */}
            <a
              href={`tel:${CONTACT_PHONE_LINK}`}
              className="flex items-center gap-2 text-white md:text-gray-800 hover:text-primary transition-colors p-1 group"
              title={`Call ${CONTACT_PHONE_DISPLAY}`}
            >
              <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-white md:text-gray-800 group-hover:text-primary group-hover:scale-105 transition-all shrink-0" />
              <div className="hidden min-[1750px]:flex flex-col text-left leading-tight">
                <span className="text-xs font-black text-gray-900 whitespace-nowrap">{CONTACT_PHONE_DISPLAY}</span>
                <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">Call Us</span>
              </div>
            </a>

            {/* Store Location: Bare Store Icon (Text reveals at 75% zoom / min-[1650px]) */}
            <a
              href={STORE_MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 text-gray-800 hover:text-primary transition-colors p-1 group"
              title="Store Location - Directions to the Store"
            >
              <Store className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800 group-hover:text-primary group-hover:scale-105 transition-all shrink-0" />
              <div className="hidden min-[1750px]:flex flex-col text-left leading-tight">
                <span className="text-xs font-black text-gray-900 whitespace-nowrap">Store Location</span>
                <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">Directions to the Store</span>
              </div>
            </a>

            {/* WhatsApp chat */}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:opacity-85 transition-opacity p-1 group"
              title="Chat on WhatsApp"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 text-[#25D366] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-full h-full fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </div>
              <div className="hidden min-[1750px]:flex flex-col text-left leading-tight">
                <span className="text-xs font-black text-gray-900 whitespace-nowrap">Chat With Us</span>
                <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">Available 24/7</span>
              </div>
            </a>

            {/* Login / Profile */}
            {isAuthenticated ? (
              <Link
                to={getProfileLink() || '/account/profile'}
                className="flex flex-col items-center text-white md:text-gray-700 hover:text-primary transition-colors text-center px-1 group"
              >
                <User className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-105 transition-transform" />
                <span className="hidden md:block text-[10px] sm:text-[11px] font-semibold mt-1">Account</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="flex flex-col items-center text-white md:text-gray-700 hover:text-primary transition-colors text-center px-1 group"
              >
                <LogIn className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-105 transition-transform" />
                <span className="hidden md:block text-[10px] sm:text-[11px] font-semibold mt-1">Login</span>
              </Link>
            )}

            {/* Wishlist */}
            <Link
              to="/wishlist"
              title="Wishlist"
              className="hidden sm:flex flex-col items-center text-gray-700 hover:text-primary transition-colors text-center px-1 group relative"
            >
              <div className="relative">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-105 transition-transform" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[15px] h-3.5 px-1 rounded-full bg-primary text-white text-[8px] font-bold flex items-center justify-center shadow-xs">
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold mt-1">Wishlist</span>
            </Link>

            {/* Enquiries */}
            <Link
              to="/account/enquiries"
              title="Enquiries"
              className="hidden sm:flex flex-col items-center text-gray-700 hover:text-primary transition-colors text-center px-1 group"
            >
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-105 transition-transform" />
              <span className="text-[10px] sm:text-[11px] font-semibold mt-1">Enquiries</span>
            </Link>

            {/* Cart Box: [X item(s) - ₹Y] + Maroon Cart Badge with Hover Dropdown (Matching Image 1) */}
            <div
              className="relative"
              onMouseEnter={() => {
                if (cartCloseTimeoutRef.current) clearTimeout(cartCloseTimeoutRef.current);
                setIsCartHovered(true);
              }}
              onMouseLeave={() => {
                cartCloseTimeoutRef.current = setTimeout(() => {
                  setIsCartHovered(false);
                }, 200);
              }}
            >
              <Link
                to="/cart"
                className="relative flex items-center border-[1.5px] border-transparent md:border-primary rounded-md hover:shadow-sm transition-all group shrink-0 h-9 md:h-11 overflow-visible"
              >
                <span className="hidden sm:flex px-2.5 sm:px-3 text-xs sm:text-sm font-semibold text-gray-900 bg-white group-hover:bg-gray-50 transition-colors whitespace-nowrap rounded-l-[5px] h-full items-center">
                  {cartCount} item(s) - ₹{(Number(cartSubtotal) || 0).toLocaleString('en-IN')}
                </span>
                <div className="relative bg-primary text-white w-9 sm:w-11 h-full flex items-center justify-center rounded-r-[4px]">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                {cartCount > 0 && (
                  <span className="absolute -top-2.5 -right-2.5 min-w-[22px] h-[22px] px-1 aspect-square rounded-full bg-[#f03a3a] text-white text-xs font-bold flex items-center justify-center shadow-sm z-30 pointer-events-none select-none leading-none">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Cart Dropdown on Hover (Matching Image 1) */}
              {isCartHovered && (
                <div
                  className="hidden md:block absolute right-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  onMouseEnter={() => {
                    if (cartCloseTimeoutRef.current) clearTimeout(cartCloseTimeoutRef.current);
                  }}
                  onMouseLeave={() => {
                    cartCloseTimeoutRef.current = setTimeout(() => {
                      setIsCartHovered(false);
                    }, 200);
                  }}
                >
                  <div className="w-[360px] sm:w-[420px] bg-white rounded-xl shadow-2xl border border-gray-200 relative overflow-hidden text-left">
                    {/* Top indicator arrow pointing up to cart icon */}
                    <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white border-t border-l border-gray-200 rotate-45 transform z-10" />

                    {/* EMPTY STATE */}
                    {cartItems.length === 0 ? (
                      <div className="py-10 px-6 text-center select-none">
                        <p className="text-gray-500 font-medium text-sm sm:text-base">
                          Your cart is empty
                        </p>
                      </div>
                    ) : (
                      /* CART PRODUCTS LIST (Matching Reference Images) */
                      <div className="p-3.5 space-y-3">
                        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 pr-1 space-y-2.5">
                          {cartItems.map((item, idx) => {
                            const product = item.productId || item.product || {};
                            const price =
                              item.priceSnapshot || item.price || product.standardPrice || product.price || 0;
                            const img =
                              product.images?.[0]?.url || product.image;
                            const pid =
                              product.sku ||
                              (product._id ? `A${String(product._id).slice(-4).toUpperCase()}` : 'A2522');
                            const itemCd =
                              product.specifications?.find((s) => s.key?.toLowerCase().includes('code'))?.value ||
                              product.sku?.slice(0, 8).toUpperCase() ||
                              '1CXARIE';

                            return (
                              <div
                                key={item._id || idx}
                                className="pt-2.5 first:pt-0 flex items-start gap-3 group/item"
                              >
                                <div className="w-14 h-14 bg-white rounded-lg border border-gray-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                                  <Image
                                    src={img}
                                    alt={product.name || 'Product'}
                                    objectFit="object-contain" className="h-full w-full"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <Link
                                    to={buildProductPath(product, allCategories)}
                                    onClick={() => setIsCartHovered(false)}
                                    className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug hover:text-[#800020] transition-colors block"
                                    title={product.name}
                                  >
                                    {product.name || 'Product'}
                                  </Link>
                                  {(product.modelNumber || product.specifications?.find((s) => s.key?.toLowerCase().includes('model'))?.value) && <p className="text-[11px] text-gray-500 mt-1">Model: {product.modelNumber || product.specifications.find((s) => s.key?.toLowerCase().includes('model'))?.value}</p>}
                                </div>
                                <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
                                  <span className="text-[11px] text-gray-400 font-medium">
                                    x {item.quantity || 1}
                                  </span>
                                  <span className="text-xs font-black text-gray-900">
                                    ₹{Number(price * (item.quantity || 1)).toLocaleString('en-IN')}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleRemoveCartItem(e, product._id || item.productId || item._id)}
                                    className="text-gray-400 hover:text-rose-600 transition-colors p-0.5 mt-0.5 cursor-pointer"
                                    title="Remove item from cart"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Total & Action Buttons (Matching Reference Image) */}
                        <div className="pt-3 border-t border-gray-200 space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-sm font-bold text-gray-900">Total</span>
                            <span className="text-base font-black text-gray-900">
                              ₹{(Number(cartSubtotal) || 0).toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div>
                            <Link
                              to="/cart"
                              onClick={() => setIsCartHovered(false)}
                              className="w-full h-11 rounded-lg bg-[#800020] hover:bg-[#66001a] text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-xs uppercase tracking-wider cursor-pointer active:scale-98"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              <span>View Cart</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Mobile Search Bar Row (small screens) */}
        <div className="md:hidden bg-[#800020] px-3 pb-3" ref={mobileSearchRef}>
          <form onSubmit={handleSearchSubmit} className="flex w-full items-center relative rounded-full bg-white overflow-visible">
            <button type="submit" className="pl-3 text-gray-600" aria-label="Search products"><Search className="h-4 w-4" /></button>
            <div className="relative min-w-0 flex-1 flex items-center">
              <input
                type="text"
                placeholder="Search products..."
                value={headerSearch}
                onFocus={() => {
                  if (headerSearch.trim()) setIsSearchOpen(true);
                }}
                onChange={(e) => {
                  setHeaderSearch(e.target.value);
                  if (e.target.value.trim()) setIsSearchOpen(true);
                }}
                className="w-full h-10 px-2 bg-transparent text-gray-900 placeholder-gray-400 text-xs border-0 focus:outline-none"
              />
              {renderSearchDropdown()}
            </div>
            <span className="px-1.5 text-gray-500" aria-hidden="true"><Mic className="h-4 w-4" /></span>
            <span className="pl-1.5 pr-3 text-gray-500" aria-hidden="true"><Camera className="h-4 w-4" /></span>
          </form>
        </div>

        {/* 3. CATEGORY NAVIGATION BAR WITH MEGA MENU ON HOVER (Compact sleek scale matching Mega Jaipur) */}
        <nav className="hidden md:block w-full bg-[#800020] text-white shadow-xs relative z-40 select-none">
          <div className="storefront-container px-2 sm:px-3 lg:px-4 2xl:px-6 flex items-center relative h-[38px] sm:h-[40px]">
            
            {/* Scroll Left Button (if categories overflow on narrow screens) */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollNav('left')}
                className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 w-5 h-5 rounded-full bg-white text-[#800020] shadow-md items-center justify-center hover:bg-gray-100 transition-all cursor-pointer"
                aria-label="Scroll categories left"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
            )}

            {/* Category Nav Row: exact compact height matching Mega Jaipur */}
            <div
              ref={categoryNavRef}
              onScroll={checkNavScroll}
              onWheel={handleCategoryWheel}
              className="w-full flex items-center overflow-x-auto scrollbar-none h-full"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* Shop By Brand Button */}
              <Link
                to="/brands"
                className="flex items-center gap-1.5 bg-white text-[#800020] hover:bg-gray-100 font-bold text-xs sm:text-[13px] px-2.5 h-[29px] rounded shadow-2xs transition-colors mr-1 sm:mr-1.5 whitespace-nowrap shrink-0"
              >
                <Store className="w-3.5 h-3.5 text-[#800020]" />
                <span>Shop By Brand</span>
              </Link>

              {categoriesLoading && <div role="status" aria-label="Loading categories" className="flex items-center gap-2 px-2">{[80, 64, 96, 72, 88, 64].map((width, index) => <Skeleton key={index} className="h-6 shrink-0 rounded" style={{ width }} />)}</div>}
              {categoriesError && <button className="px-3 text-xs" onClick={() => setCategoryRetry((value) => value + 1)}>{categoriesError}. Retry</button>}
              {!categoriesLoading && !categoriesError && categoryTree.length === 0 && <span className="px-3 text-xs">No categories available</span>}
              {/* Horizontal Categories with compact gaps and clear readable font matching Mega Jaipur */}
              <div className="flex items-center gap-1 h-full whitespace-nowrap">
                {categoryTree.map((header) => {
                  const isHovered = hoveredHeaderId === header._id;

                  return (
                    <div
                      key={header._id || header.slug}
                      ref={(el) => {
                        if (el) headerItemRefs.current[header._id] = el;
                      }}
                      className="shrink-0 h-full flex items-center relative"
                      onMouseEnter={() => handleMouseEnterHeader(header._id)}
                      onMouseLeave={handleMouseLeaveHeader}
                    >
                      <Link
                        to={`/${header.slug || slugify(header.name)}`}
                        onClick={handleHeaderClick}
                        className={`transition-colors duration-150 select-none px-2 h-[29px] rounded flex items-center text-[14.5px] font-medium tracking-normal leading-none no-underline ${
                          isHovered
                            ? 'bg-white/15 text-white'
                            : 'text-white/90 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{header.name}</span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scroll Right Button (if categories overflow on narrow screens) */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollNav('right')}
                className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 w-5 h-5 rounded-full bg-white text-[#800020] shadow-md items-center justify-center hover:bg-gray-100 transition-all cursor-pointer"
                aria-label="Scroll categories right"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Mega Menu Dropdown Card (matching user reference screenshot) */}
          {hoveredHeader && hoveredHeader.mainCategories && hoveredHeader.mainCategories.length > 0 && (
            <div
              ref={megaMenuRef}
              className="absolute top-full z-50 pt-1 pointer-events-auto"
              style={{
                left: `${Math.max(12, Math.min(dropdownLeft, windowWidth - Math.min(840, windowWidth - 24) - 12))}px`,
                width: `${Math.min(840, windowWidth - 24)}px`,
              }}
              onMouseEnter={() => {
                if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
              }}
              onMouseLeave={handleMouseLeaveHeader}
            >
              {/* Upward arrow connecting dropdown to category above */}
              <div
                className="absolute -top-1 w-0 h-0 border-x-[7px] border-x-transparent border-b-[7px] border-b-[#800020] z-50 pointer-events-none"
                style={{
                  left: `${Math.max(20, Math.min(dropdownLeft - Math.max(12, Math.min(dropdownLeft, windowWidth - Math.min(840, windowWidth - 24) - 12)) + 16, Math.min(840, windowWidth - 24) - 40))}px`,
                }}
              />

              <div className="w-full bg-white rounded-md shadow-2xl border border-gray-200 overflow-hidden text-left animate-in fade-in slide-in-from-top-1 duration-150">
                {/* Dropdown Header Bar (Solid Maroon theme) */}
                <div className="bg-[#800020] text-white px-4 py-2.5 flex items-center">
                  <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base tracking-wide text-white">
                    <div className="w-6 h-6 rounded bg-white/15 flex items-center justify-center shrink-0">
                      {getHeaderCategoryIcon(hoveredHeader.name, hoveredHeader.slug)}
                    </div>
                    <span>{hoveredHeader.name}</span>
                  </div>
                </div>

                {/* Dropdown Body: 3-column grid matching user screenshot */}
                <div className="p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-3 gap-3 max-h-[75vh] overflow-y-auto bg-white">
                  {dropdownColumns.map((col, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-2.5">
                      {col.map((main) => {
                        const hasSubs = main.subCategories && main.subCategories.length > 0;
                        const headerSlug = hoveredHeader.slug || slugify(hoveredHeader.name);
                        const mainSlug = main.slug || slugify(main.name);

                        if (hasSubs) {
                          return (
                            <div
                              key={main._id}
                              className="border border-gray-200/90 rounded-md p-3.5 bg-white hover:border-[#800020]/40 transition-all shadow-2xs flex flex-col justify-start"
                            >
                              {/* Main Category Header with Divider Line */}
                              <Link
                                to={`/${headerSlug}/${mainSlug}`}
                                onClick={() => setHoveredHeaderId(null)}
                                className="text-[13px] sm:text-[13.5px] font-bold text-[#800020] flex items-center gap-2 pb-2 border-b border-gray-200 hover:text-[#590016] transition-colors no-underline group"
                              >
                                <span className="text-[#800020] text-sm leading-none font-bold">•</span>
                                <span>{main.name}</span>
                              </Link>

                              {/* Subcategories vertical list */}
                              <div className="pt-2 pl-2 space-y-1">
                                {main.subCategories.map((sub) => {
                                  const subSlug = sub.slug || slugify(sub.name);
                                  return (
                                    <Link
                                      key={sub._id}
                                      to={`/${headerSlug}/${mainSlug}/${subSlug}`}
                                      onClick={() => setHoveredHeaderId(null)}
                                      className="block text-[12px] sm:text-[12.5px] text-gray-700 hover:text-[#800020] px-2 py-1 rounded-md border border-transparent hover:border-[#800020]/25 hover:bg-[#800020]/5 transition-all duration-150 leading-snug no-underline"
                                    >
                                      {sub.name}
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        // Standalone Main Category Card (like Branded Laptop, Laptop Battery, Laptop Adaptor)
                        return (
                          <Link
                            key={main._id}
                            to={`/${headerSlug}/${mainSlug}`}
                            onClick={() => setHoveredHeaderId(null)}
                            className="border border-gray-200/90 rounded-md px-3.5 py-2.5 bg-white hover:border-[#800020] hover:bg-[#800020]/5 hover:shadow-xs transition-all duration-200 flex items-center justify-between group select-none cursor-pointer no-underline"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-gray-400 text-sm leading-none font-bold group-hover:text-[#800020] transition-colors">•</span>
                              <span className="text-[12.5px] sm:text-[13px] font-medium text-gray-800 group-hover:text-[#800020] group-hover:font-semibold transition-all leading-tight truncate">
                                {main.name}
                              </span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#800020] group-hover:translate-x-0.5 transition-all duration-200 shrink-0 ml-1.5 opacity-60 group-hover:opacity-100" />
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* MOBILE NAVIGATION DRAWER */}
      <Drawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        position="left"
        showHeader={false}
        className="!max-w-[min(88vw,380px)]"
        contentClassName="!p-0 !space-y-0"
        footer={<div className="grid w-full grid-cols-2 gap-2">
          <a href={`tel:${CONTACT_PHONE_LINK}`} className="flex items-center justify-center gap-2 rounded-full border border-[#800020]/20 bg-[#800020]/5 px-3 py-2.5 text-xs font-semibold text-[#800020]"><Phone className="h-4 w-4" /> Call us</a>
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-800">WhatsApp</a>
        </div>}
      >
        <div className="text-left" onClick={(event) => { if (event.target.closest('a')) setIsMobileMenuOpen(false); }}>
          <div className="space-y-4 bg-[#800020] px-4 py-5 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"><User className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{isAuthenticated ? (user?.fullName || user?.name || 'My account') : 'Welcome to Vinexus'}</p>
                <p className="text-xs text-white/80">{isAuthenticated ? 'Manage your account and enquiries' : 'Sign in to manage your enquiries'}</p>
              </div>
              <button type="button" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu" className="rounded-full p-2 text-white hover:bg-white/15"><X className="h-5 w-5" /></button>
            </div>
            {isAuthenticated ? (
              <div className="grid grid-cols-2 gap-2">
                <Link to={getProfileLink() || '/account/profile'} className="rounded-md bg-white py-2.5 text-center text-xs font-bold text-[#800020]">My Account</Link>
                <button type="button" onClick={handleLogout} className="rounded-md border border-white/50 py-2.5 text-xs font-bold text-white">Log out</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" className="rounded-md bg-white py-2.5 text-center text-xs font-bold text-[#800020]">Login</Link>
                <Link to="/register" className="rounded-md border border-white/50 py-2.5 text-center text-xs font-bold text-white">Register</Link>
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5 border-b border-gray-200 p-3">
            {[
              { to: '/cart', label: 'Cart', icon: ShoppingCart },
              { to: '/wishlist', label: 'Wishlist', icon: Heart },
              { to: '/account/enquiries', label: 'Enquiries', icon: FileText },
              { to: '/brands', label: 'Brands', icon: Store },
            ].map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="flex min-w-0 flex-col items-center gap-1.5 rounded-md border border-gray-200 bg-[#800020]/5 px-1 py-3 text-[10px] font-semibold text-[#800020]">
                <Icon className="h-5 w-5" /><span className="truncate max-w-full">{label}</span>
              </Link>
            ))}
          </div>
          <div className="px-4 pt-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">Shop by category</div>
          <div className="px-2 pb-5">
            {categoriesLoading && <div role="status" aria-label="Loading categories" className="space-y-2 px-3 py-2">{[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-10 w-full" />)}</div>}
            {categoriesError && <button onClick={() => setCategoryRetry((value) => value + 1)} className="px-3 py-3 text-sm text-[#800020]">{categoriesError}. Retry</button>}
            {categoryTree.map((header) => (
              <details key={header._id} className="group border-b border-gray-100">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 text-sm font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#800020]/10 text-[#800020]">{getHeaderCategoryIcon(header.name, header.slug)}</span>
                  <span className="min-w-0 flex-1 truncate">{header.name}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-1 bg-[#800020]/[0.03] px-4 pb-3 pl-14 text-xs">
                  {header.mainCategories.map((main) => (
                    <div key={main._id} className="space-y-1">
                      <Link className="block py-2 font-semibold text-gray-800" to={buildCategoryPath(main, allCategories)}>{main.name}</Link>
                      {main.subCategories.map((sub) => <Link key={sub._id} className="block py-1.5 pl-3 text-gray-600" to={buildCategoryPath(sub, allCategories)}>{sub.name}</Link>)}
                    </div>
                  ))}
                  <Link className="block pt-2 font-semibold text-[#800020]" to={buildCategoryPath(header, allCategories)}>View all {header.name} →</Link>
                </div>
              </details>
            ))}
          </div>
        </div>
      </Drawer>

      {/* 4. ADDED TO CART FLOATING TOAST POPUP (Matching Image 2) */}
      {addedCartToast && (
        <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-8 z-50 sm:max-w-md w-auto sm:w-full bg-white rounded-2xl shadow-2xl border border-gray-200 border-l-4 border-l-emerald-500 overflow-hidden animate-in slide-in-from-top-4 duration-200 text-left">
          <div className="p-4 space-y-2.5">
            {/* Top Row: Green Check Circle + Title + Close Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <h3 className="font-bold text-sm text-gray-900">
                  Added to cart
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddedCartToast(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-full cursor-pointer transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product Details line matching Image 2 */}
            <p className="text-xs text-gray-600 leading-snug pl-8 pr-1 font-medium">
              {addedCartToast.quantity} unit · {addedCartToast.product.name} · ₹{Number(addedCartToast.price).toLocaleString('en-IN')}
            </p>

            {/* View Cart Button */}
            <div className="pl-8 pt-1">
              <Link
                to="/cart"
                onClick={() => setAddedCartToast(null)}
                className="inline-flex items-center justify-center px-5 py-2 rounded-lg bg-[#800020] hover:bg-[#66001a] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
              >
                View Cart ({cartCount > 0 ? cartCount : (addedCartToast.quantity || 1)})
              </Link>
            </div>
          </div>

          {/* Progress Bar (Auto-Dismiss in 5s) */}
          <div className="w-full bg-emerald-100 h-1 overflow-hidden">
            <div className="bg-emerald-500 h-full animate-shrink-progress" />
          </div>
        </div>
      )}

      {/* 5. MAIN PAGE CONTENT (Natural Height Flow Matching Mega Jaipur) */}
      <main className="w-full flex flex-col">
        <Outlet />
      </main>

      {footerData && <footer className="w-full bg-[#111111] text-white px-6 pt-10 text-left">
        <div className="storefront-container grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 pb-9">
          <div className="space-y-3">
            <h4 className="font-bold text-xl">{footerData.aboutHeading || 'About'}</h4>
            {footerData.companyDescription && <p className="text-[15px] text-white/90 leading-7">{footerData.companyDescription}</p>}
            {(footerData.socialLinks || []).length > 0 && <div className="flex flex-wrap gap-2 pt-2">
              {[...(footerData.socialLinks || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((link, index) => (
                <a key={`${link.label}-${index}`} href={link.url} target="_blank" rel="noopener noreferrer" className="rounded-md border border-white/20 px-2.5 py-1.5 text-xs text-gray-200 hover:border-white/50 hover:text-white">{link.label}</a>
              ))}
            </div>}
          </div>
          <div className="space-y-2 text-[15px]">
            <h4 className="font-bold text-xl text-white mb-4">{footerData.quickLinksHeading || 'Information'}</h4>
            {[...(footerData.quickLinks || []), ...(footerData.legalLinks || [])]
              .filter((link) => !['all products', 'category directory', 'component library', 'privacy policy', 'terms & conditions'].includes((link.label || '').trim().toLowerCase()))
              .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((link, index) => (
              <a key={`${link.label}-${index}`} className="block text-white/90 hover:text-white hover:underline" href={link.url}>{link.label}</a>
            ))}
            <Link className="block text-white/90 hover:text-white hover:underline" to="/privacy">Privacy Policy</Link>
            <Link className="block text-white/90 hover:text-white hover:underline" to="/terms">Terms &amp; Conditions</Link>
            <button type="button" onClick={openStorageChoices} className="block text-left text-white/90 hover:text-white hover:underline">Storage choices</button>
          </div>
          <div className="space-y-3 text-[15px] text-white/90">
            <h4 className="font-bold text-xl text-white mb-4">{footerData.contactHeading || 'Contact Details'}</h4>
            {footerData.address && <a className="flex items-start gap-2 hover:text-white hover:underline leading-6" href={footerData.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(footerData.address)}`} target="_blank" rel="noopener noreferrer"><MapPin className="w-4 h-4 mt-1 shrink-0" /> <span>{footerData.address}</span></a>}
            {footerData.phone && <a className="flex items-center gap-2 hover:text-white hover:underline" href={`tel:${footerData.phone.replace(/[^+\d]/g, '')}`}><Phone className="w-4 h-4 shrink-0" /> {footerData.phone}</a>}
            {footerData.email && <a className="flex items-center gap-2 hover:text-white hover:underline" href={`mailto:${footerData.email}`}><Mail className="w-4 h-4 shrink-0" /> {footerData.email}</a>}
          </div>
        </div>
        <p className="storefront-container border-t border-white/15 py-5 text-center text-sm text-white/90">
          {(footerData.copyrightText || '© {year} {company}. All Rights Reserved.').replace(/\{year\}/g, String(new Date().getFullYear())).replace(/\{company\}/g, footerData.companyName || '')}
        </p>
      </footer>}
      {!footerData && <footer className="w-full bg-[#111111] px-6 py-6 text-white">
        <div className="storefront-container flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link to="/terms" className="hover:underline">Terms &amp; Conditions</Link>
          <button type="button" onClick={openStorageChoices} className="hover:underline">Storage choices</button>
          <a href="mailto:vinexus@gmail.com" className="hover:underline">vinexus@gmail.com</a>
        </div>
      </footer>}
    </div>
  );
};

export default PublicLayout;
