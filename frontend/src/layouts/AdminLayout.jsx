import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  FolderTree, 
  Package, 
  Users, 
  UserCheck, 
  Inbox, 
  ShieldAlert, 
  BarChart3, 
  Image, 
  Sparkles, 
  FileText, 
  Award, 
  LayoutList,
  LogOut,
  ArrowLeft,
  Menu,
  X
} from 'lucide-react';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const mainNav = [
    { label: 'Overview Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Category Management', path: '/admin/categories', icon: FolderTree },
    { label: 'Product Catalog', path: '/admin/products', icon: Package },
    { label: 'Dealer Verification', path: '/admin/dealers', icon: Users },
    { label: 'Customer Accounts', path: '/admin/customers', icon: UserCheck },
    { label: 'B2B Enquiries', path: '/admin/enquiries', icon: Inbox },
    { label: 'Active User Sessions', path: '/admin/sessions', icon: ShieldAlert },
    { label: 'Analytics Reports', path: '/admin/reports', icon: BarChart3 },
  ];

  const cmsNav = [
    { label: 'Hero Banners', path: '/admin/cms/banners', icon: Image },
    { label: 'Promotional Cards', path: '/admin/cms/promotional-banners', icon: Sparkles },
    { label: 'CMS Static Pages', path: '/admin/cms/pages', icon: FileText },
    { label: 'Trust Badges', path: '/admin/cms/trust-badges', icon: Award },
    { label: 'Footer Content', path: '/admin/cms/footer-content', icon: LayoutList },
  ];

  return (
    <div className="min-h-screen bg-[#fdf8f9] text-[#3d0a0d] flex flex-col md:flex-row font-sans relative">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-[#3d0a0d]/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#e5d1d4] flex flex-col p-6 shadow-sm transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#800020] to-[#9a1b32] flex items-center justify-center font-extrabold text-white shadow-sm">
              A
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-[#3d0a0d] tracking-wider">ADMIN PANEL</h2>
              <span className="text-[10px] text-[#800020] font-bold uppercase tracking-widest">Control Center</span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-[#7c5c5f] hover:text-[#3d0a0d] p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          <div>
            <h3 className="text-[10px] font-bold text-[#7c5c5f] uppercase tracking-widest mb-2 px-3">
              Core Operations
            </h3>
            <div className="space-y-1">
              {mainNav.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#f4e7ea] text-[#800020] border border-[#e5d1d4] font-bold shadow-xs'
                        : 'text-[#7c5c5f] hover:text-[#3d0a0d] hover:bg-[#f4e7ea]/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#800020]' : 'text-[#7c5c5f]'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-bold text-[#7c5c5f] uppercase tracking-widest mb-2 px-3">
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
                        ? 'bg-[#f4e7ea] text-[#800020] border border-[#e5d1d4] font-bold shadow-xs'
                        : 'text-[#7c5c5f] hover:text-[#3d0a0d] hover:bg-[#f4e7ea]/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#800020]' : 'text-[#7c5c5f]'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#e5d1d4] flex flex-col gap-2">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#7c5c5f] hover:text-[#3d0a0d] hover:bg-[#f4e7ea]/50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Public Storefront
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors w-full text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            Admin Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#e5d1d4] bg-white px-4 sm:px-8 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-[#7c5c5f] hover:text-[#3d0a0d] p-1"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span className="text-xs font-semibold text-[#7c5c5f]">System Status: Operational</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#7c5c5f]">
            <span>Admin: <strong className="text-[#3d0a0d] font-bold">{user?.name || user?.fullName || user?.email}</strong></span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#fdf8f9]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
