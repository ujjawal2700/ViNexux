import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import usePushNotifications from '../hooks/usePushNotifications';
import dealerService from '../services/dealerService';
import { StatusBadge } from '../components/ui/Badge';
import ThemeToggle from '../components/ui/ThemeToggle';
import Logo from '../components/ui/Logo';
import { LayoutDashboard, FileCheck, Tag, ShoppingCart, Send, LogOut, ArrowLeft, UserCircle } from 'lucide-react';

const DealerLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  usePushNotifications();

  const [dealerStatus, setDealerStatus] = useState('pending');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await dealerService.getDealerProfile();
        const prof = res.data?.profile || res.profile || res.data;
        if (prof?.status) {
          setDealerStatus(prof.status);
        }
      } catch (err) {
        // Silently handle if profile not created yet
      }
    };

    if (user?.role === 'dealer') {
      fetchStatus();
    }
  }, [user]);

  const navItems = [
    { label: 'Dashboard', path: '/dealer/dashboard', icon: LayoutDashboard },
    { label: 'My Profile', path: '/dealer/profile', icon: UserCircle },
    { label: 'KYC Submission', path: '/dealer/kyc', icon: FileCheck },
    { label: 'KYC Status Check', path: '/dealer/kyc/status', icon: FileCheck },
    { label: 'Wholesale Pricing Matrix', path: '/dealer/pricing', icon: Tag },
    { label: 'Dealer Cart', path: '/dealer/cart', icon: ShoppingCart },
    { label: 'Wholesale Enquiries', path: '/dealer/enquiries', icon: Send },
  ];

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col p-6 shadow-sm shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <Logo />
          <div>
            <h2 className="font-bold text-sm text-foreground uppercase tracking-wider">Dealer Portal</h2>
            <span className="text-[11px] text-primary font-bold">B2B Partner Tier</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
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
        </nav>

        <div className="pt-6 border-t border-border flex flex-col gap-2">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Public Catalog
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors w-full text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-screen">
        <header className="h-16 border-b border-border bg-card px-8 flex items-center justify-between shadow-xs">
          <h1 className="text-sm font-semibold text-muted-foreground">
            Welcome back, <span className="text-foreground font-bold">{user?.fullName || user?.email || 'Dealer Partner'}</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">KYC Status:</span>
            <StatusBadge status={dealerStatus} />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DealerLayout;
