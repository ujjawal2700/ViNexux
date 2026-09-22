import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import contentService from '../services/contentService';
import cartService from '../services/cartService';
import wishlistService from '../services/wishlistService';
import { ROLES } from '../constants';
import Logo from '../components/ui/Logo';
import { Drawer } from '../components/ui/Drawer';
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
} from 'lucide-react';

const CATEGORY_BAR_ITEMS = [
  { name: 'Desktop', query: 'Desktop' },
  { name: 'Laptop', query: 'Laptop' },
  { name: 'Storage', query: 'Storage' },
  { name: 'Display', query: 'Display' },
  { name: 'Peripherals', query: 'Peripherals' },
  { name: 'Printers & Scanners', query: 'Printers' },
  { name: 'Security', query: 'CCTV' },
  { name: 'Networking', query: 'Routers' },
  { name: 'Software', query: 'Software' },
  { name: 'Mobility', query: 'Mobility' },
  { name: 'Cables', query: 'Cables' },
  { name: 'Connector & Converter', query: 'Connector' },
  { name: 'Accessories CCTV & Networking', query: 'Accessories' },
  { name: 'Telecom', query: 'Telecom' },
];

const PublicLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Search state
  const [headerSearch, setHeaderSearch] = useState('');

  // Mobile menu drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Cart state
  const [cartCount, setCartCount] = useState(0);
  const [cartSubtotal, setCartSubtotal] = useState(0);

  // Wishlist state
  const [wishlistCount, setWishlistCount] = useState(() => wishlistService.getWishlist().length);

  // CMS Footer state
  const [footerData, setFooterData] = useState(null);

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

  // Fetch Cart Item Count and Subtotal
  useEffect(() => {
    const fetchCartData = async () => {
      if (!isAuthenticated || user?.role === 'admin') {
        setCartCount(0);
        setCartSubtotal(0);
        return;
      }
      try {
        const response = await cartService.getCart();
        const cart = response.data?.cart || response.cart;
        const items = cart?.items || [];
        const count = items.reduce((acc, item) => acc + (item.quantity || 1), 0);
        const subtotal =
          cart?.subtotal ||
          items.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 1), 0);
        setCartCount(count);
        setCartSubtotal(subtotal);
      } catch (err) {
        setCartCount(0);
        setCartSubtotal(0);
      }
    };

    fetchCartData();
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

  const getProfileLink = () => {
    if (user?.role === ROLES.DEALER || user?.role === ROLES.CUSTOMER) return '/account/profile';
    if (user?.role === ROLES.ADMIN) return '/admin/dashboard';
    return null;
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900 flex flex-col font-sans">
      {/* 1. STICKY HEADER CONTAINER (Locks top announcement + main header + category nav at top when scrolling) */}
      <header className="sticky top-0 z-50 w-full bg-white shadow-xs">
        
        {/* Top Announcement Bar */}
        <div className="w-full bg-white border-b border-gray-200 py-1 sm:py-1.5 px-4 text-center text-xs text-gray-500 font-medium tracking-wide">
          {isAuthenticated ? (
            <span>
              Welcome back, <strong className="text-gray-800">{user?.fullName || user?.name || user?.email}</strong>
              {user?.role === 'dealer' && ' (Verified Dealer)'}
              {user?.role === 'admin' && ' (Administrator)'}
            </span>
          ) : (
            <span>You are not logged in.</span>
          )}
        </div>

        {/* Main Header Row */}
        <div className="w-full px-2 sm:px-4 lg:px-8 max-w-[1920px] mx-auto py-3 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-4 lg:gap-6 border-b border-gray-200">
          
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
              to="/account/enquiries"
              title="Quotation / Inquiries"
              className="hidden sm:flex flex-col items-center text-gray-700 hover:text-primary transition-colors text-center px-1 group"
            >
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-105 transition-transform" />
              <span className="text-[10px] sm:text-[11px] font-semibold mt-1">Quotation</span>
            </Link>

            {/* Cart Box: [X item(s) - ₹Y] + Maroon Cart Badge */}
            <Link
              to="/cart"
              className="flex items-center border-2 border-primary rounded-md overflow-hidden hover:shadow-sm transition-all group shrink-0 h-10 sm:h-11"
            >
              <span className="px-2.5 sm:px-3.5 text-xs sm:text-sm font-bold text-gray-800 bg-white group-hover:bg-gray-50 transition-colors whitespace-nowrap">
                {cartCount} item(s) - ₹{cartSubtotal.toLocaleString('en-IN')}
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

        {/* 3. CATEGORY NAVIGATION BAR (Solid Maroon Full Width Bar - Compact scale like Mega Jaipur) */}
        <nav className="w-full bg-[#800020] text-white shadow-xs">
          <div
            className="w-full px-2 sm:px-4 lg:px-6 max-w-[1920px] mx-auto flex items-center overflow-x-auto scrollbar-none py-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Shop By Brand Button */}
            <Link
              to="/categories"
              className="flex items-center gap-1.5 bg-white text-primary hover:bg-gray-100 font-bold text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 my-0.5 rounded shrink-0 shadow-xs transition-colors mr-2 sm:mr-3 uppercase tracking-wide whitespace-nowrap"
            >
              <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              <span>Shop By Brand</span>
            </Link>

            {/* Horizontal Categories Text Links (Compact spacing so all 14 categories fit clearly) */}
            <div className="flex items-center gap-2.5 sm:gap-3 md:gap-3.5 lg:gap-4 xl:gap-5 py-0.5 text-[11px] sm:text-xs font-semibold tracking-tight whitespace-nowrap">
              {CATEGORY_BAR_ITEMS.map((item, idx) => (
                <Link
                  key={idx}
                  to={`/products?search=${encodeURIComponent(item.query)}`}
                  className="text-gray-100 hover:text-white hover:underline transition-colors select-none px-0.5 py-0.5"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
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
            <Link to="/categories" className="px-3 py-2 rounded hover:bg-gray-100">Categories & Brands</Link>
            <Link to="/cart" className="px-3 py-2 rounded hover:bg-gray-100">
              Shopping Cart ({cartCount})
            </Link>
            <Link to="/account/enquiries" className="px-3 py-2 rounded hover:bg-gray-100">Quotations</Link>
          </div>

          <div className="font-semibold text-xs text-gray-500 uppercase tracking-wider px-3">
            Categories
          </div>
          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
            {CATEGORY_BAR_ITEMS.map((item, idx) => (
              <Link
                key={idx}
                to={`/products?search=${encodeURIComponent(item.query)}`}
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

      {/* 5. MULTI-COLUMN MAROON FOOTER (Full Width) */}
      <footer className="w-full bg-[#67001a] text-white pt-10 pb-6 px-3 sm:px-6 lg:px-8 mt-12 text-left">
        <div className="w-full max-w-[1920px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-rose-900/40 text-xs">
          
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
        <div className="w-full max-w-[1920px] mx-auto pt-4 text-center text-[11px] text-gray-400">
          <p>© 2008–2026 Vi Nexus, Jaipur. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
