import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import contentService from '../services/contentService';
import cartService from '../services/cartService';
import { ROLES } from '../constants';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Shield,
  ShoppingBag,
  Search,
  User,
  LogOut,
  Lock,
  Menu,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const PublicLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Search state
  const [headerSearch, setHeaderSearch] = useState('');

  // Mobile menu drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Cart badge count state
  const [cartCount, setCartCount] = useState(0);

  // CMS Footer state
  const [footerData, setFooterData] = useState(null);
  const [isFooterLoading, setIsFooterLoading] = useState(true);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Fetch Cart Item Count when user is logged in
  useEffect(() => {
    const fetchCartCount = async () => {
      if (!isAuthenticated || user?.role === 'admin') {
        setCartCount(0);
        return;
      }
      try {
        const response = await cartService.getCart();
        const items = response.data?.cart?.items || response.cart?.items || [];
        const count = items.reduce((acc, item) => acc + (item.quantity || 1), 0);
        setCartCount(count);
      } catch (err) {
        // Silently handle if cart empty or uninitialized
        setCartCount(0);
      }
    };

    fetchCartCount();
  }, [isAuthenticated, user, location.pathname]);

  // Fetch CMS Footer Content on mount
  useEffect(() => {
    const fetchFooter = async () => {
      try {
        setIsFooterLoading(true);
        const response = await contentService.getFooterContent();
        if (response.success && response.data?.footer) {
          setFooterData(response.data.footer);
        } else if (response.footer) {
          setFooterData(response.footer);
        }
      } catch (err) {
        console.warn('Failed to load CMS footer content:', err);
      } finally {
        setIsFooterLoading(false);
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

  // Get user role dashboard route
  const getDashboardLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case ROLES.ADMIN:
        return '/admin/dashboard';
      case ROLES.DEALER:
        return '/dealer/dashboard';
      case ROLES.CUSTOMER:
      default:
        return '/customer/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf8f9] text-[#3d0a0d] flex flex-col font-sans selection:bg-[#800020] selection:text-white bg-grid-pattern">
      {/* 0. TOP UTILITY BANNER */}
      <div className="bg-[#f4e7ea] border-b border-[#e5d1d4] px-4 py-1.5 text-[11px] text-[#7c5c5f] font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#3d0a0d]">
              <Phone className="w-3 h-3 text-[#800020]" /> Helpline: <strong className="text-[#3d0a0d]">+91 89499 40610</strong>
            </span>
            <span className="hidden sm:inline-block text-[#e5d1d4]">|</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[#7c5c5f]">
              <Shield className="w-3 h-3 text-[#800020]" /> Authorized CCTV & Security Hardware Distributor
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hover:text-[#800020] transition-colors flex items-center gap-1 font-semibold text-[#3d0a0d]">
              <Lock className="w-3 h-3 text-[#800020]" /> Dealer Portal Access
            </Link>
          </div>
        </div>
      </div>

      {/* 1. PUBLIC HEADER NAVIGATION */}
      <header className="sticky top-0 z-50 bg-[#ffffff]/95 backdrop-blur-xl border-b border-[#e5d1d4] px-4 sm:px-6 py-3 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Hexagon Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-10 h-10 text-[#800020] drop-shadow-[0_0_12px_rgba(128,0,32,0.3)] group-hover:scale-110 transition-transform duration-300">
                <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" fill="none" stroke="currentColor" strokeWidth="6" />
                <polygon points="50,15 82,33 82,67 50,85 18,67 18,33" fill="#f4e7ea" stroke="rgba(128,0,32,0.4)" strokeWidth="2" />
                <path d="M35 32 L50 68 L65 32" fill="none" stroke="#800020" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="50" cy="24" r="4" fill="#9a1b32" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-widest text-[#800020]">
                  VI
                </span>
                <span className="text-xl font-black tracking-widest text-[#3d0a0d]">
                  NEXUS
                </span>
              </div>
              <span className="text-[9px] tracking-widest text-[#9a1b32] uppercase -mt-1 font-bold">
                Security Systems Ecosystem
              </span>
            </div>
          </Link>

          {/* Desktop Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center flex-1 max-w-md mx-6 relative">
            <input
              type="text"
              placeholder="Search cameras, DVRs, modems, cables, accessories..."
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              className="w-full bg-[#f4e7ea]/80 hover:bg-[#f4e7ea] focus:bg-white text-[#3d0a0d] placeholder-[#7c5c5f] text-xs px-4 py-2.5 pl-10 rounded-xl border border-[#e5d1d4] focus:border-[#800020] focus-ring transition-all"
            />
            <Search className="w-4 h-4 text-[#7c5c5f] absolute left-3.5 pointer-events-none" />
            {headerSearch && (
              <button
                type="submit"
                className="absolute right-2 text-[10px] font-bold bg-[#800020] hover:bg-[#9a1b32] text-white px-2.5 py-1 rounded-lg transition-colors shadow-sm"
              >
                Search
              </button>
            )}
          </form>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-bold text-[#3d0a0d] shrink-0">
            <Link
              to="/"
              className={`relative py-1 transition-colors duration-200 hover:text-[#800020] ${
                location.pathname === '/' ? 'text-[#800020] font-black' : ''
              }`}
            >
              Home
              {location.pathname === '/' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#800020] rounded-full shadow-[0_0_8px_#800020]"></span>
              )}
            </Link>
            <Link
              to="/products"
              className={`relative py-1 transition-colors duration-200 hover:text-[#800020] ${
                location.pathname === '/products' ? 'text-[#800020] font-black' : ''
              }`}
            >
              Catalog
              {location.pathname === '/products' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#800020] rounded-full shadow-[0_0_8px_#800020]"></span>
              )}
            </Link>
            <Link
              to="/categories"
              className={`relative py-1 transition-colors duration-200 hover:text-[#800020] ${
                location.pathname === '/categories' ? 'text-[#800020] font-black' : ''
              }`}
            >
              Categories
              {location.pathname === '/categories' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#800020] rounded-full shadow-[0_0_8px_#800020]"></span>
              )}
            </Link>
          </nav>

          {/* Header Action Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Cart Icon & Indicator Badge */}
            {user?.role !== 'admin' && (
              <Link
                to={user?.role === 'dealer' ? '/dealer/cart' : '/customer/cart'}
                className="relative p-2.5 text-[#3d0a0d] hover:text-[#800020] bg-[#f4e7ea] hover:bg-[#e5d1d4] border border-[#e5d1d4] rounded-xl transition-all duration-200 flex items-center justify-center group"
                title="Enquiry Cart"
              >
                <ShoppingBag className="w-4.5 h-4.5 group-hover:text-[#800020] transition-colors" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#800020] text-white text-[11px] font-extrabold rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* Auth State Control */}
            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link to={getDashboardLink()}>
                  <Button variant="secondary" size="sm" leftIcon={<User className="w-3.5 h-3.5 text-red-500" />}>
                    {user?.role === 'dealer' ? 'Dealer Portal' : user?.role === 'admin' ? 'Admin Panel' : 'My Account'}
                  </Button>
                </Link>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-400 bg-slate-900/80 hover:bg-red-950/40 border border-slate-800 rounded-xl transition-all duration-200"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="hidden sm:block">
                <Button variant="primary" size="sm" leftIcon={<Lock className="w-3.5 h-3.5" />}>
                  Sign In
                </Button>
              </Link>
            )}

            {/* Mobile Hamburger Drawer Trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-colors"
              aria-label="Toggle Mobile Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MOBILE NAVIGATION DRAWER */}
      <Drawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        title="Navigation Menu"
        position="left"
        size="sm"
      >
        <div className="space-y-6 pt-2">
          {/* Mobile Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              className="w-full bg-slate-900 text-slate-100 text-sm px-4 py-2.5 pl-10 rounded-xl border border-slate-800 focus:border-crimson-500 focus-ring"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
          </form>

          {/* Navigation Links */}
          <div className="flex flex-col gap-2 font-medium text-slate-200">
            <Link
              to="/"
              className="px-4 py-3 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800/60 flex items-center justify-between"
            >
              <span>Home</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </Link>
            <Link
              to="/products"
              className="px-4 py-3 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800/60 flex items-center justify-between"
            >
              <span>Product Catalog</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </Link>
            <Link
              to="/categories"
              className="px-4 py-3 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800/60 flex items-center justify-between"
            >
              <span>Categories</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </Link>
          </div>

          {/* Account Actions */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            {isAuthenticated ? (
              <>
                <div className="px-4 py-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
                  <div className="text-slate-400">Logged in as</div>
                  <div className="font-bold text-white text-sm truncate">{user?.fullName || user?.identifier}</div>
                  <Badge variant="primary" className="mt-1.5 uppercase text-[10px]">
                    {user?.role}
                  </Badge>
                </div>
                <Link to={getDashboardLink()} className="block">
                  <Button variant="primary" fullWidth leftIcon={<User className="w-4 h-4" />}>
                    Go to Dashboard
                  </Button>
                </Link>
                <Button variant="outline" fullWidth leftIcon={<LogOut className="w-4 h-4" />} onClick={logout}>
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/login" className="block">
                <Button variant="primary" fullWidth leftIcon={<Lock className="w-4 h-4" />}>
                  Sign In / Register
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Drawer>

      {/* 3. MAIN PAGE CONTENT OUTLET */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* 4. CMS-DRIVEN PUBLIC FOOTER */}
      <footer className="bg-[#f4e7ea] border-t border-[#e5d1d4] pt-12 pb-8 px-6 text-[#7c5c5f] text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[#e5d1d4]">
          
          {/* Col 1: Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#800020] flex items-center justify-center text-white font-bold text-base shadow-sm">
                V
              </div>
              <span className="text-lg font-bold text-[#3d0a0d] tracking-wider">
                {footerData?.companyName || 'VINEXUS'}
              </span>
            </div>
            <p className="text-xs text-[#7c5c5f] leading-relaxed">
              {footerData?.companyDescription ||
                'Leading B2B CCTV & security equipment dealer platform in India. Providing wholesale cameras, DVRs, NVRs, routers, and accessories.'}
            </p>
          </div>

          {/* Col 2: Contact Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#3d0a0d] uppercase tracking-wider">Contact Us</h4>
            {isFooterLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <div className="space-y-2 text-[#7c5c5f]">
                {footerData?.contactDetails?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#800020] shrink-0" />
                    <span>{footerData.contactDetails.phone}</span>
                  </div>
                )}
                {footerData?.contactDetails?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#800020] shrink-0" />
                    <span>{footerData.contactDetails.email}</span>
                  </div>
                )}
                {footerData?.contactDetails?.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#800020] shrink-0 mt-0.5" />
                    <span>{footerData.contactDetails.address}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Col 3: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#3d0a0d] uppercase tracking-wider">Quick Navigation</h4>
            <ul className="space-y-2 text-[#7c5c5f]">
              <li>
                <Link to="/products" className="hover:text-[#800020] transition-colors">
                  Product Catalog
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-[#800020] transition-colors">
                  Category Directory
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#800020] transition-colors">
                  Dealer Onboarding / Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Legal & Policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#3d0a0d] uppercase tracking-wider">Legal & Compliance</h4>
            <ul className="space-y-2 text-[#7c5c5f]">
              <li>
                <Link to="/content/pages/privacy-policy" className="hover:text-[#800020] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/content/pages/terms-and-conditions" className="hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/content/pages/about-us" className="hover:text-white transition-colors">
                  About Vinexus
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} {footerData?.companyName || 'Vinexus'}. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-crimson-500" />
            <span>Authorized Security Equipment Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
