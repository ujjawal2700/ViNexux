import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import adminService from '../services/adminService';
import ThemeToggle from '../components/ui/ThemeToggle';
import Logo from '../components/ui/Logo';
import { 
  LayoutDashboard, 
  FolderTree, 
  Package, 
  Users, 
  UserCheck, 
  Inbox,
  Building2,
  ShieldAlert,
  BarChart3, 
  Image, 
  Sparkles, 
  FileText, 
  Award, 
  LayoutList,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Layers,
  GitBranch
} from 'lucide-react';

const AdminLayout = () => {
  const { user, adminUser, adminLogout, logout } = useAuth();
  const currentAdmin = adminUser || (user?.role === 'admin' ? user : null);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingKycCount, setPendingKycCount] = useState(0);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchPendingCount = async () => {
      try {
        const res = await adminService.getDashboardSummary();
        const count = res.data?.dealers?.pending ?? res.dealers?.pending ?? 0;
        if (!cancelled) setPendingKycCount(count);
      } catch {
        // Non-critical - sidebar badge simply stays hidden on failure
      }
    };
    fetchPendingCount();
    // Re-check periodically so the flag clears/appears without a full reload
    const interval = setInterval(fetchPendingCount, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [location.pathname]);

  const mainNav = [
    { label: 'Overview Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Category Management', path: '/admin/categories', icon: FolderTree },
    { label: 'Product Catalog', path: '/admin/products', icon: Package },
    { label: 'Dealer Verification', path: '/admin/dealers', icon: Users, badgeCount: pendingKycCount },
    { label: 'Customer Accounts', path: '/admin/customers', icon: UserCheck },
    { label: 'B2C Enquiries', path: '/admin/enquiries/customers', icon: Inbox },
    { label: 'B2B Enquiries', path: '/admin/enquiries/dealers', icon: Building2 },
    { label: 'Active User Sessions', path: '/admin/sessions', icon: ShieldAlert },
    { label: 'Analytics Reports', path: '/admin/reports', icon: BarChart3 },
    { label: 'My Admin Profile', path: '/admin/profile', icon: UserCheck },
  ];

  const cmsNav = [
    { label: 'Hero Banners', path: '/admin/cms/banners', icon: Image },
    { label: 'Promotional Cards', path: '/admin/cms/promotional-banners', icon: Sparkles },
    { label: 'CMS Static Pages', path: '/admin/cms/pages', icon: FileText },
    { label: 'Trust Badges', path: '/admin/cms/trust-badges', icon: Award },
    { label: 'Footer Content', path: '/admin/cms/footer-content', icon: LayoutList },
  ];

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex flex-col md:flex-row font-sans relative">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col p-6 shadow-sm transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h2 className="font-extrabold text-sm text-foreground tracking-wider">ADMIN PANEL</h2>
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Control Center</span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-muted-foreground hover:text-foreground p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-3">
              Core Operations
            </h3>
            <div className="space-y-1">
              {mainNav.map((item) => {
                const Icon = item.icon;
                const isCatManagement = item.path === '/admin/categories';

                if (isCatManagement) {
                  const isCatRoute = location.pathname.startsWith('/admin/categories');
                  const currentTier = new URLSearchParams(location.search).get('tier');

                  return (
                    <div key={item.path} className="space-y-1">
                      {/* Main Category Management Header with Dropdown Chevron */}
                      <div
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 select-none ${
                          isCatRoute
                            ? 'bg-muted text-primary border border-border font-bold shadow-xs'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                        onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                      >
                        <Link
                          to="/admin/categories"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCategoryMenuOpen(true);
                            setMobileOpen(false);
                          }}
                          className="flex items-center gap-3 flex-1"
                        >
                          <Icon className={`w-4 h-4 ${isCatRoute ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span>{item.label}</span>
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCategoryMenuOpen(!isCategoryMenuOpen);
                          }}
                          className="p-0.5 hover:text-primary transition-colors cursor-pointer"
                          aria-label="Toggle category hierarchy sub-menu"
                        >
                          {isCategoryMenuOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </div>

                      {/* Dropdown Hierarchy Sub-Items: Header Category -> Main Category -> Sub Category */}
                      {isCategoryMenuOpen && (
                        <div className="pl-5 pr-1 py-1 space-y-1 border-l-2 border-primary/20 ml-4 my-1">
                          {/* 1. Header Category */}
                          <Link
                            to="/admin/categories/header"
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                              location.pathname === '/admin/categories/header'
                                ? 'bg-primary text-white font-bold shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                            }`}
                          >
                            <Layers className="w-3.5 h-3.5 shrink-0" />
                            <span className="flex-1">Header Category</span>
                          </Link>

                          {/* 2. Main Category */}
                          <Link
                            to="/admin/categories/main"
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                              location.pathname === '/admin/categories/main'
                                ? 'bg-primary text-white font-bold shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                            }`}
                          >
                            <FolderTree className="w-3.5 h-3.5 shrink-0" />
                            <span className="flex-1">Main Category</span>
                          </Link>

                          {/* 3. Sub Category */}
                          <Link
                            to="/admin/categories/sub"
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                              location.pathname === '/admin/categories/sub'
                                ? 'bg-primary text-white font-bold shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                            }`}
                          >
                            <GitBranch className="w-3.5 h-3.5 shrink-0" />
                            <span className="flex-1">Sub Category</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                }

                // If Product Catalog is already shown in category hierarchy, we can still keep or show standard items
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-muted text-primary border border-border font-bold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="flex-1">{item.label}</span>
                    {!!item.badgeCount && (
                      <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                        {item.badgeCount > 99 ? '99+' : item.badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-3">
              CMS Content Manager
            </h3>
            <div className="space-y-1">
              {cmsNav.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-muted text-primary border border-border font-bold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex flex-col gap-2">
          <button
            onClick={() => {
              if (adminLogout) adminLogout();
              else logout('admin');
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors w-full text-left cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Admin Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-screen">
        <header className="h-16 border-b border-border bg-card px-4 sm:px-8 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-muted-foreground hover:text-foreground p-1"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span className="text-xs font-semibold text-muted-foreground">System Status: Operational</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Link to="/admin/profile" className="hover:text-primary transition-colors">
              Admin: <strong className="text-foreground font-bold underline decoration-primary/30 underline-offset-4">{currentAdmin?.fullName || currentAdmin?.name || currentAdmin?.email || 'Administrator'}</strong>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
