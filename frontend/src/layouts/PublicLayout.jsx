import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import contentService from '../services/contentService';
import cartService from '../services/cartService';
import wishlistService from '../services/wishlistService';
import categoryService from '../services/categoryService';
import { ROLES } from '../constants';
import Logo from '../components/ui/Logo';
import { Drawer } from '../components/ui/Drawer';
import { slugify } from '../utils/categoryUrls';
import {
  Search,
  Mic,
  Camera,
  Phone,
  Store,
  Heart,
  FileText,
  ShoppingCart,
  User,
  LogIn,
  Menu,
  ChevronRight,
  ChevronLeft,
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
} from 'lucide-react';

const CATEGORY_BAR_ITEMS = [
  { name: 'Desktop', slug: 'desktop' },
  { name: 'Laptop', slug: 'laptop' },
  { name: 'Storage', slug: 'storage' },
  { name: 'Display', slug: 'display' },
  { name: 'Peripherals', slug: 'peripherals' },
  { name: 'Printers & Scanners', slug: 'printers-scanners' },
  { name: 'Security', slug: 'security' },
  { name: 'Networking', slug: 'networking' },
  { name: 'Software', slug: 'software' },
  { name: 'Mobility', slug: 'mobility' },
  { name: 'Cables', slug: 'cables' },
  { name: 'Connector & Converter', slug: 'connector-converter' },
  { name: 'Accessories CCTV & Networking', slug: 'accessories-cctv-networking' },
  { name: 'Telecom', slug: 'telecom' },
];

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

  // Search state
  const [headerSearch, setHeaderSearch] = useState('');

  // Mobile menu drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Cart state
  const [cartCount, setCartCount] = useState(0);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [isCartHovered, setIsCartHovered] = useState(false);
  const cartCloseTimeoutRef = useRef(null);

  // Wishlist state
  const [wishlistCount, setWishlistCount] = useState(() => wishlistService.getWishlist().length);

  // CMS Footer state
  const [footerData, setFooterData] = useState(null);

  // Category Mega Menu & Navigation State
  const [allCategories, setAllCategories] = useState([]);
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

  // Fetch full category hierarchy on mount
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await categoryService.getCategories({ limit: 500, sortBy: 'sortOrder', sortOrder: 'asc' });
        const list = res.data?.categories || res.categories || [];
        setAllCategories(list);
      } catch (err) {
        console.warn('Failed to load categories for nav bar:', err);
      }
    };
    fetchCats();
  }, []);

  // Category Tree: Headers -> Mains -> Subs
  const categoryTree = useMemo(() => {
    if (!allCategories || allCategories.length === 0) {
      return CATEGORY_BAR_ITEMS.map((item, idx) => ({
        _id: `fallback-${idx}`,
        name: item.name,
        slug: item.slug,
        mainCategories: [],
      }));
    }

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

  const handleHeaderClick = (e, headerId) => {
    const header = categoryTree.find((h) => String(h._id) === String(headerId));
    if (header && header.mainCategories && header.mainCategories.length > 0) {
      e.preventDefault();
      if (hoveredHeaderId === headerId) {
        setHoveredHeaderId(null);
      } else {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        setHoveredHeaderId(headerId);
        const el = headerItemRefs.current[headerId];
        if (el) {
          const rect = el.getBoundingClientRect();
          setDropdownLeft(rect.left);
        }
      }
    }
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
  useEffect(() => {
    const fetchCartData = async () => {
      if (!isAuthenticated || user?.role === 'admin') {
        setCartCount(0);
        setCartSubtotal(0);
        setCartItems([]);
        return;
      }
      try {
        const response = await cartService.getCart();
        const cart = response.data?.cart || response.cart;
        const items = cart?.items || [];
        const count = items.reduce((acc, item) => acc + (item.quantity || 1), 0);
        const subtotal =
          cart?.subtotal ||
          items.reduce((acc, item) => {
            const unitPrice =
              item.priceSnapshot || item.price || item.productId?.standardPrice || 0;
            return acc + unitPrice * (item.quantity || 1);
          }, 0);
        setCartCount(count);
        setCartSubtotal(subtotal);
        setCartItems(items);
      } catch (err) {
        setCartCount(0);
        setCartSubtotal(0);
        setCartItems([]);
      }
    };

    fetchCartData();
    window.addEventListener('cart-updated', fetchCartData);
    return () => window.removeEventListener('cart-updated', fetchCartData);
  }, [isAuthenticated, user, location.pathname]);

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

  // Handle Header Search Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (headerSearch.trim()) {
      navigate(`/products?search=${encodeURIComponent(headerSearch.trim())}`);
      setIsMobileMenuOpen(false);
    }
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
        <div className="w-full px-3 sm:px-6 lg:px-8 2xl:px-12 py-3 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-4 lg:gap-6 border-b border-gray-200">
          
          {/* Logo & Brand Name */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <Logo className="w-10 h-10 sm:w-12 sm:h-12 object-contain group-hover:scale-105 transition-transform" />
            <div className="flex flex-col text-left">
              <div className="flex items-center">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-primary">
                  VI
                </span>
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
                  NEXUS
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-primary uppercase -mt-1">
                COMPU WORLD
              </span>
            </div>
          </Link>

          {/* Search Bar with Mic & Camera & Search Button (Expands across middle to eliminate margin) */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 max-w-3xl xl:max-w-4xl 2xl:max-w-5xl hidden md:flex items-center mx-2 lg:mx-4"
          >
            <div className="relative w-full flex items-center">
              <input
                type="text"
                placeholder="Search laptops, printers, RAM, SSD, cameras, CCTV..."
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
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
          <div className="flex items-center gap-3 sm:gap-4 xl:gap-5 shrink-0">
            
            {/* Call Us: Bare Phone Icon (Text reveals at 75% zoom / min-[1650px]) */}
            <a
              href="tel:+918949940610"
              className="flex items-center gap-2 text-gray-800 hover:text-primary transition-colors p-1 group"
              title="Call Us: 89 49 94 0610"
            >
              <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800 group-hover:text-primary group-hover:scale-105 transition-all shrink-0" />
              <div className="hidden min-[1650px]:flex flex-col text-left leading-tight">
                <span className="text-xs font-black text-gray-900 whitespace-nowrap">89 49 94 0610</span>
                <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">Call us</span>
              </div>
            </a>

            {/* Store Location: Bare Store Icon (Text reveals at 75% zoom / min-[1650px]) */}
            <Link
              to="/categories"
              className="flex items-center gap-2 text-gray-800 hover:text-primary transition-colors p-1 group"
              title="Store Location - Directions to the Store"
            >
              <Store className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800 group-hover:text-primary group-hover:scale-105 transition-all shrink-0" />
              <div className="hidden min-[1650px]:flex flex-col text-left leading-tight">
                <span className="text-xs font-black text-gray-900 whitespace-nowrap">Store Location</span>
                <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">Directions to the Store</span>
              </div>
            </Link>

            {/* WhatsApp: Bare WhatsApp Icon in Brand Green (Text reveals at 75% zoom / min-[1650px]) */}
            <a
              href="https://wa.me/918949940610?text=Hello%20ViNexus%2C%20I%20need%20assistance%20with%20products"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:opacity-85 transition-opacity p-1 group"
              title="WhatsApp: 89 49 94 0610 - Connect with Us"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 text-[#25D366] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-full h-full fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </div>
              <div className="hidden min-[1650px]:flex flex-col text-left leading-tight">
                <span className="text-xs font-black text-gray-900 whitespace-nowrap">89 49 94 0610</span>
                <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">Connect with Us</span>
              </div>
            </a>

            {/* Login / Profile */}
            {isAuthenticated ? (
              <Link
                to={getProfileLink() || '/account/profile'}
                className="flex flex-col items-center text-gray-700 hover:text-primary transition-colors text-center px-1 group"
              >
                <User className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-105 transition-transform" />
                <span className="text-[10px] sm:text-[11px] font-semibold mt-1">Account</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="flex flex-col items-center text-gray-700 hover:text-primary transition-colors text-center px-1 group"
              >
                <LogIn className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-105 transition-transform" />
                <span className="text-[10px] sm:text-[11px] font-semibold mt-1">Login</span>
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

            {/* Quotation */}
            <Link
              to="/account/quotations"
              title="Quotation / Inquiries"
              className="hidden sm:flex flex-col items-center text-gray-700 hover:text-primary transition-colors text-center px-1 group"
            >
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-105 transition-transform" />
              <span className="text-[10px] sm:text-[11px] font-semibold mt-1">Quotation</span>
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
                className="flex items-center border-2 border-primary rounded-md overflow-hidden hover:shadow-sm transition-all group shrink-0 h-10 sm:h-11"
              >
                <span className="px-2.5 sm:px-3.5 text-xs sm:text-sm font-bold text-gray-900 bg-white group-hover:bg-gray-50 transition-colors whitespace-nowrap">
                  {cartCount} item(s) - ₹{(Number(cartSubtotal) || 0).toLocaleString('en-IN')}
                </span>
                <div className="relative bg-primary text-white w-10 sm:w-11 h-full flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-xs">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </div>
              </Link>

              {/* Cart Dropdown on Hover (Matching Image 1) */}
              {isCartHovered && (
                <div
                  className="absolute right-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  onMouseEnter={() => {
                    if (cartCloseTimeoutRef.current) clearTimeout(cartCloseTimeoutRef.current);
                  }}
                  onMouseLeave={() => {
                    cartCloseTimeoutRef.current = setTimeout(() => {
                      setIsCartHovered(false);
                    }, 200);
                  }}
                >
                  <div className="w-[300px] sm:w-[350px] bg-white rounded-lg shadow-2xl border border-gray-200 relative overflow-hidden text-left">
                    {/* Top indicator arrow pointing up to cart icon */}
                    <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white border-t border-l border-gray-200 rotate-45 transform z-10" />

                    {/* EMPTY STATE (Matching Image 1: "Your cart is empty") */}
                    {cartItems.length === 0 ? (
                      <div className="py-10 px-6 text-center select-none">
                        <p className="text-gray-500 font-medium text-sm sm:text-base">
                          Your cart is empty
                        </p>
                      </div>
                    ) : (
                      /* CART PRODUCTS LIST */
                      <div className="p-3.5 space-y-3">
                        <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 pr-1 space-y-2">
                          {cartItems.map((item, idx) => {
                            const product = item.productId || {};
                            const price =
                              item.priceSnapshot || item.price || product.standardPrice || 0;
                            const img =
                              product.images?.[0]?.url ||
                              product.image ||
                              'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=200';
                            return (
                              <div
                                key={item._id || idx}
                                className="pt-2 first:pt-0 flex items-center gap-3"
                              >
                                <div className="w-12 h-12 bg-white rounded border border-gray-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                                  <img
                                    src={img}
                                    alt={product.name || 'Product'}
                                    className="max-h-full max-w-full object-contain"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4
                                    className="text-xs font-semibold text-gray-800 truncate"
                                    title={product.name}
                                  >
                                    {product.name || 'Product'}
                                  </h4>
                                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                                    {item.quantity} ×{' '}
                                    <strong className="text-gray-800">
                                      ₹{Number(price).toLocaleString('en-IN')}
                                    </strong>
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Subtotal & Action Buttons */}
                        <div className="pt-2.5 border-t border-gray-200 space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-bold text-gray-800 px-1">
                            <span>Subtotal:</span>
                            <span className="text-sm font-black text-[#800020]">
                              ₹{(Number(cartSubtotal) || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <Link
                              to="/cart"
                              onClick={() => setIsCartHovered(false)}
                              className="h-8 rounded border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center justify-center transition-colors"
                            >
                              View Cart
                            </Link>
                            <Link
                              to="/cart"
                              onClick={() => setIsCartHovered(false)}
                              className="h-8 rounded bg-[#800020] hover:bg-[#660019] text-xs font-bold text-white flex items-center justify-center transition-colors shadow-xs"
                            >
                              Checkout
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 text-gray-700 hover:text-primary rounded border border-gray-200"
              aria-label="Toggle Mobile Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Row (small screens) */}
        <div className="md:hidden px-3 pb-2.5">
          <form onSubmit={handleSearchSubmit} className="flex w-full items-center">
            <input
              type="text"
              placeholder="Search products..."
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              className="w-full h-9 px-3 bg-gray-50 text-gray-900 placeholder-gray-400 text-xs rounded-l border border-r-0 border-gray-300 focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="h-9 px-3.5 bg-primary text-white text-xs font-bold rounded-r flex items-center justify-center shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* 3. CATEGORY NAVIGATION BAR WITH MEGA MENU ON HOVER (Compact sleek scale matching Mega Jaipur) */}
        <nav className="hidden md:block w-full bg-[#800020] text-white shadow-xs relative z-40 select-none">
          <div className="w-full px-2 sm:px-3 lg:px-4 2xl:px-6 flex items-center relative h-[35px] sm:h-[36px]">
            
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

            {/* Category Nav Row: exact compact 35px-36px height matching Mega Jaipur */}
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
                className="flex items-center gap-1.5 bg-white text-[#800020] hover:bg-gray-100 font-bold text-[11px] sm:text-xs px-2.5 h-[26px] rounded shadow-2xs transition-colors mr-2 sm:mr-2.5 whitespace-nowrap shrink-0"
              >
                <Store className="w-3.5 h-3.5 text-[#800020]" />
                <span>Shop By Brand</span>
              </Link>

              {/* Horizontal Categories with compact font and tight gaps matching Mega Jaipur */}
              <div className="flex items-center gap-0.5 sm:gap-1 h-full whitespace-nowrap">
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
                        onClick={(e) => handleHeaderClick(e, header._id)}
                        className={`text-white hover:text-white transition-all select-none px-1.5 sm:px-2 h-[26px] rounded flex items-center text-[11.5px] sm:text-[12px] xl:text-[12.5px] font-semibold tracking-tight leading-none ${
                          isHovered ? 'bg-[#591116] text-white font-bold shadow-2xs' : 'hover:bg-white/10'
                        }`}
                      >
                        <span>{header.name}</span>
                      </Link>

                      {/* Small downward triangle indicator matching Mega Jaipur when hovered/active */}
                      {isHovered && (
                        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white z-50 pointer-events-none" />
                      )}
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
                <div className="bg-[#800020] text-white px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base tracking-wide text-white">
                    <div className="w-6 h-6 rounded bg-white/15 flex items-center justify-center shrink-0">
                      {getHeaderCategoryIcon(hoveredHeader.name, hoveredHeader.slug)}
                    </div>
                    <span>{hoveredHeader.name}</span>
                  </div>
                  <Link
                    to={`/${hoveredHeader.slug || slugify(hoveredHeader.name)}`}
                    onClick={() => setHoveredHeaderId(null)}
                    className="text-xs text-white/80 hover:text-white flex items-center gap-1 font-semibold transition-colors"
                  >
                    <span>View All {hoveredHeader.name} Products</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
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
                                className="text-[13px] sm:text-[13.5px] font-semibold text-[#800020] flex items-center gap-2 group pb-2 border-b border-gray-200 transition-colors"
                              >
                                <span className="text-[#800020] text-sm leading-none font-bold">•</span>
                                <span className="group-hover:underline">{main.name}</span>
                              </Link>

                              {/* Subcategories vertical list */}
                              <div className="pt-2 pl-3 space-y-1.5">
                                {main.subCategories.map((sub) => {
                                  const subSlug = sub.slug || slugify(sub.name);
                                  return (
                                    <Link
                                      key={sub._id}
                                      to={`/${headerSlug}/${mainSlug}/${subSlug}`}
                                      onClick={() => setHoveredHeaderId(null)}
                                      className="block text-[12px] sm:text-[12.5px] text-gray-600 hover:text-[#800020] hover:underline transition-colors py-0.5 leading-snug"
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
                            className="border border-gray-200/90 rounded-md px-3.5 py-2.5 bg-white hover:border-[#800020] hover:bg-[#fffbfc] hover:shadow-2xs transition-all flex items-center gap-2 group select-none cursor-pointer"
                          >
                            <span className="text-[#800020]/70 text-sm leading-none font-bold group-hover:text-[#800020] transition-colors">•</span>
                            <span className="text-[12.5px] sm:text-[13px] font-medium text-gray-800 group-hover:text-[#800020] transition-colors leading-tight">
                              {main.name}
                            </span>
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
        title="Menu"
        position="left"
        size="sm"
      >
        <div className="space-y-4 pt-2 text-sm text-left">
          <div className="flex flex-col gap-1 font-medium border-b border-gray-200 pb-3">
            <Link to="/" className="px-3 py-2 rounded hover:bg-gray-100">Home</Link>
            <Link to="/products" className="px-3 py-2 rounded hover:bg-gray-100">All Products</Link>
            <Link to="/wishlist" className="px-3 py-2 rounded hover:bg-gray-100 flex items-center justify-between">
              <span>Wishlist</span>
              {wishlistCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 text-primary">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <Link to="/brands" className="px-3 py-2 rounded hover:bg-gray-100 flex items-center justify-between">
              <span>Shop By Brand</span>
              <Store className="w-4 h-4 text-primary" />
            </Link>
            <Link to="/categories" className="px-3 py-2 rounded hover:bg-gray-100">Categories</Link>
            <Link to="/cart" className="px-3 py-2 rounded hover:bg-gray-100">
              Shopping Cart ({cartCount})
            </Link>
            <Link to="/account/quotations" className="px-3 py-2 rounded hover:bg-gray-100">Quotations</Link>
          </div>

          <div className="font-semibold text-xs text-gray-500 uppercase tracking-wider px-3">
            Categories
          </div>
          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
            {CATEGORY_BAR_ITEMS.map((item, idx) => (
              <Link
                key={idx}
                to={`/${item.slug || slugify(item.name)}`}
                className="px-3 py-1.5 text-xs text-gray-700 hover:text-primary hover:bg-gray-50 rounded"
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-3 space-y-2">
            {isAuthenticated ? (
              <>
                <div className="px-3 text-xs text-gray-500">
                  Logged in as <strong className="text-gray-800">{user?.fullName || user?.email}</strong>
                </div>
                {getProfileLink() && (
                  <Link to={getProfileLink()} className="block px-3 py-2 bg-gray-100 rounded text-center font-bold text-xs">
                    My Account
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="w-full text-center px-3 py-2 text-xs font-bold text-red-600 bg-red-50 rounded hover:bg-red-100 cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link to="/login" className="block text-center px-3 py-2 bg-primary text-white font-bold rounded text-xs">
                Sign In / Register
              </Link>
            )}
          </div>
        </div>
      </Drawer>

      {/* 4. MAIN PAGE CONTENT (Full Width) */}
      <main className="flex-1 flex flex-col w-full">
        <Outlet />
      </main>

      {/* 5. MULTI-COLUMN BLACK FOOTER (Full Width) */}
      <footer className="w-full bg-[#111111] text-white pt-10 pb-6 px-3 sm:px-6 lg:px-8 2xl:px-12 mt-12 text-left">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-neutral-800 text-xs">
          
          {/* Col 1: About */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide">About</h4>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Since 2008, innovation, passion, and reliability come together to deliver the finest IT & surveillance hardware — CCTV cameras, NVRs, PoE switches, networking equipment, routers, and accessories — empowering businesses across India to succeed in an ever-evolving digital world.
            </p>
          </div>

          {/* Col 2: Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide">Information</h4>
            <ul className="space-y-2 text-[11px] text-gray-300">
              <li>
                <Link to="/content/pages/about-us" className="hover:text-white hover:underline transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/content/pages/shipping-policy" className="hover:text-white hover:underline transition-colors">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link to="/content/pages/privacy-policy" className="hover:text-white hover:underline transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/content/pages/terms-and-conditions" className="hover:text-white hover:underline transition-colors">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide">Contact Details</h4>
            <div className="text-[11px] text-gray-300 space-y-1.5">
              <p className="font-semibold text-white">Vi Nexus Platforms, Jaipur</p>
              <p>2nd Floor, 21, Sudarshanpura Industrial Area</p>
              <p>22 Godown, Jaipur – 302006</p>
              <p className="pt-2 flex items-center gap-1.5 font-bold text-white">
                <Phone className="w-3.5 h-3.5 text-rose-300" />
                <a href="tel:+918949940610" className="hover:underline">+91 89499 40610</a>
              </p>
              <p className="flex items-center gap-1.5 text-gray-300">
                <span>✉️</span>
                <a href="mailto:sales@vinexus.com" className="hover:underline">sales@vinexus.com</a>
              </p>
            </div>
          </div>

          {/* Col 4: Bank Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide">Bank Details</h4>
            <div className="text-[11px] text-gray-300 space-y-1.5">
              <p><strong className="text-white">Name :</strong> Vi Nexus Platforms</p>
              <p><strong className="text-white">A/c Number :</strong> 12342320000433</p>
              <p><strong className="text-white">IFSC :</strong> HDFC0001430</p>
              <p><strong className="text-white">Branch :</strong> Subhash Nagar, Jaipur</p>
              <p className="pt-1">
                <strong className="text-white">UPI :</strong> <span className="underline cursor-pointer hover:text-white">View QR Code</span>
              </p>
            </div>
          </div>

          {/* Col 5: Sales & Support */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide">Sales & Support</h4>
            <div className="text-[11px] text-gray-300 space-y-1">
              {[
                { label: 'Sales Jaipur', phone: '7073888300' },
                { label: 'Billing Counter', phone: '8302885197' },
                { label: 'Sales Rest of Rajasthan', phone: '9460193000' },
                { label: 'Sales Rest of India', phone: '7849909082' },
                { label: 'Sales Laptop Accessories', phone: '8302885196' },
                { label: 'Sales CCTV Surveillance', phone: '8302885193' },
                { label: 'Sales Networking', phone: '7849831942' },
                { label: 'Sales Printer Accessories', phone: '7849831945' },
                { label: 'Dispatch', phone: '8302885194' },
                { label: 'RMA / Replacements', phone: '9358861191' },
                { label: 'Accounts', phone: '9358861193' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-1 text-[10px]">
                  <span className="truncate">{item.label}</span>
                  <a
                    href={`https://wa.me/91${item.phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-gray-200 hover:text-emerald-400 shrink-0 font-medium"
                  >
                    <span>{item.phone}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="w-full pt-4 text-center text-[11px] text-gray-400">
          <p>© 2008–2026 Vi Nexus, Jaipur. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
