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
import ThemeToggle from '../components/ui/ThemeToggle';
import Logo from '../components/ui/Logo';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../components/ui/DropdownMenu';
import {
  Shield,
  ShoppingCart,
  Search,
  User,
  UserCircle,
  LogOut,
  Lock,
  Menu,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ChevronDown,
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

  // Get user role profile route. No dedicated dashboard for customer/dealer
  // roles - both share the same unified /account/profile; admin manages
  // its own account separately (no link shown here for admin).
  const getProfileLink = () => {
    if (user?.role === ROLES.DEALER || user?.role === ROLES.CUSTOMER) return '/account/profile';
    return null;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-white bg-grid-pattern">
      {/* 1. PUBLIC HEADER NAVIGATION */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border px-4 sm:px-6 py-3 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Vi Nexus Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <Logo
              className="w-11 h-auto drop-shadow-[0_0_12px_rgba(128,0,32,0.25)] group-hover:scale-110 transition-transform duration-300"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-widest text-primary">
                  VI
                </span>
                <span className="text-xl font-black tracking-widest text-foreground">
                  NEXUS
                </span>
              </div>
              <span className="text-[9px] tracking-widest text-accent uppercase -mt-1 font-bold">
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
              className="w-full bg-muted/80 hover:bg-muted focus:bg-card text-foreground placeholder-muted-foreground text-xs px-4 py-2.5 pl-10 rounded-xl border border-border focus:border-primary focus-ring transition-all"
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 pointer-events-none" />
            {headerSearch && (
              <button
                type="submit"
                className="absolute right-2 text-[10px] font-bold bg-primary hover:bg-accent text-white px-2.5 py-1 rounded-lg transition-colors shadow-sm"
              >
                Search
              </button>
            )}
          </form>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-bold text-foreground shrink-0">
            <Link
              to="/"
              className={`relative py-1 transition-colors duration-200 hover:text-primary ${
                location.pathname === '/' ? 'text-primary font-black' : ''
              }`}
            >
              Home
              {location.pathname === '/' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full shadow-[0_0_8px_#800020]"></span>
              )}
            </Link>
            <Link
              to="/products"
              className={`relative py-1 transition-colors duration-200 hover:text-primary ${
                location.pathname === '/products' ? 'text-primary font-black' : ''
              }`}
            >
              Catalog
              {location.pathname === '/products' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full shadow-[0_0_8px_#800020]"></span>
              )}
            </Link>
            <Link
              to="/categories"
              className={`relative py-1 transition-colors duration-200 hover:text-primary ${
                location.pathname === '/categories' ? 'text-primary font-black' : ''
              }`}
            >
              Categories
              {location.pathname === '/categories' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full shadow-[0_0_8px_#800020]"></span>
              )}
            </Link>
          </nav>

          {/* Header Action Controls */}
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />

            {/* Cart Icon & Indicator Badge */}
            {user?.role !== 'admin' && (
              <Link
                to="/account/cart"
                className="relative p-2.5 text-foreground hover:text-primary bg-muted hover:bg-border border border-border rounded-xl transition-all duration-200 flex items-center justify-center group"
                title="Enquiry Cart"
              >
                <ShoppingCart className="w-4.5 h-4.5 group-hover:text-primary transition-colors" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white text-[11px] font-extrabold rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* Auth State Control */}
            {isAuthenticated ? (
              <div className="hidden sm:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-border border border-border text-foreground text-xs font-bold transition-colors">
                      <User className="w-3.5 h-3.5 text-primary" />
                      {user?.role === 'admin' ? 'Admin Panel' : 'My Account'}
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>
                      <div className="truncate text-foreground normal-case font-bold text-xs">{user?.fullName || user?.name}</div>
                      <div className="truncate font-normal normal-case">{user?.email || user?.phone}</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {getProfileLink() && (
                      <DropdownMenuItem asChild>
                        <Link to={getProfileLink()}>
                          <UserCircle className="w-3.5 h-3.5 text-muted-foreground" /> Profile
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10">
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
              className="md:hidden p-2 text-foreground hover:text-primary bg-muted border border-border rounded-xl transition-colors"
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
              className="w-full bg-muted/60 text-foreground text-sm px-4 py-2.5 pl-10 rounded-xl border border-border focus:border-primary focus-ring"
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3 pointer-events-none" />
          </form>

          {/* Navigation Links */}
          <div className="flex flex-col gap-2 font-medium text-foreground">
            <Link
              to="/"
              className="px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted border border-border/60 flex items-center justify-between"
            >
              <span>Home</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link
              to="/products"
              className="px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted border border-border/60 flex items-center justify-between"
            >
              <span>Product Catalog</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link
              to="/categories"
              className="px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted border border-border/60 flex items-center justify-between"
            >
              <span>Categories</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>

          {/* Account Actions */}
          <div className="pt-4 border-t border-border space-y-3">
            {isAuthenticated ? (
              <>
                <div className="px-4 py-2.5 bg-muted/80 rounded-xl border border-border text-xs">
                  <div className="text-muted-foreground">Logged in as</div>
                  <div className="font-bold text-foreground text-sm truncate">{user?.fullName || user?.identifier}</div>
                  <Badge variant="primary" className="mt-1.5 uppercase text-[10px]">
                    {user?.role}
                  </Badge>
                </div>
                {getProfileLink() && (
                  <Link to={getProfileLink()} className="block">
                    <Button variant="secondary" fullWidth leftIcon={<UserCircle className="w-4 h-4" />}>
                      My Profile
                    </Button>
                  </Link>
                )}
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
      <footer className="bg-muted border-t border-border pt-8 pb-8 px-6 text-muted-foreground text-xs">
        {/* UTILITY FOOTER BANNER */}
        <div className="max-w-7xl mx-auto mb-8 pb-6 border-b border-border text-[11px] text-muted-foreground font-medium">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-foreground">
                <Phone className="w-3.5 h-3.5 text-primary" /> Helpline: <strong className="text-foreground">+91 89499 40610</strong>
              </span>
              <span className="hidden sm:inline-block text-border">|</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-muted-foreground">
                <Shield className="w-3.5 h-3.5 text-primary" /> Authorized CCTV & Security Hardware Distributor
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login" className="hover:text-primary transition-colors flex items-center gap-1 font-semibold text-foreground">
                <Lock className="w-3.5 h-3.5 text-primary" /> Dealer & Customer Portal Access
              </Link>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-border">
          
          {/* Col 1: Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="text-lg font-bold text-foreground tracking-wider">
                {footerData?.companyName || 'VINEXUS'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {footerData?.companyDescription ||
                'Leading B2B CCTV & security equipment dealer platform in India. Providing wholesale cameras, DVRs, NVRs, routers, and accessories.'}
            </p>
          </div>

          {/* Col 2: Contact Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Contact Us</h4>
            {isFooterLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <div className="space-y-2 text-muted-foreground">
                {footerData?.contactDetails?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{footerData.contactDetails.phone}</span>
                  </div>
                )}
                {footerData?.contactDetails?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{footerData.contactDetails.email}</span>
                  </div>
                )}
                {footerData?.contactDetails?.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{footerData.contactDetails.address}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Col 3: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Quick Navigation</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link to="/products" className="hover:text-primary transition-colors">
                  Product Catalog
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-primary transition-colors">
                  Category Directory
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-primary transition-colors">
                  Customer & Dealer Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Legal & Policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Legal & Compliance</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link to="/content/pages/privacy-policy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/content/pages/terms-and-conditions" className="hover:text-primary transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/content/pages/about-us" className="hover:text-primary transition-colors">
                  About Vinexus
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted-foreground">
          <p>© {new Date().getFullYear()} {footerData?.companyName || 'Vinexus'}. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-rose-500" />
            <span>Authorized Security Equipment Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
