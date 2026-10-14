import AdminSidebarNav from '../components/admin/AdminSidebarNav';
import Modal from '../components/ui/Modal';
import { visibleAdminNavigation } from '../../../shared/adminNavigation.js';
import { canAdmin, canVisitAdmin, sectionForAdminPath, isSuperAdmin } from '../../../shared/adminAccess.js';
import apiClient from '../api/axios';
import AdminLocationNotice from '../components/admin/AdminLocationNotice';
import { setAdminAccessState } from '../utils/adminAccessState';
import React, { Suspense, useState, useEffect } from 'react';
import RouteFallback from '../components/ui/RouteFallback';
import { Outlet, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useLogoutConfirmation from '../hooks/useLogoutConfirmation';
import adminService from '../services/adminService';
import Logo from '../components/ui/Logo';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { AdminNumberInputContext } from '../context/AdminNumberInputContext';
import { LogOut, Menu, X, RefreshCw } from 'lucide-react';

const AdminLayout = () => {
  const { user, adminUser } = useAuth();
  const confirmLogout = useLogoutConfirmation();
  const currentAdmin = adminUser || (user?.role === 'admin' ? user : null);
  const [access, setAccess] = useState(currentAdmin);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try { const response = await apiClient.get('/admin/access/self', { skipGlobalLoader: true });
        if (active && response.data?.data?.access) { const next = { ...currentAdmin, ...response.data.data.access }; setAccess(next); setAdminAccessState(next); }
      } catch { /* Server authorization still checks every request. */ }
    };
    setAccess(currentAdmin); setAdminAccessState(currentAdmin); refresh();
    const timer = setInterval(refresh, 60000); window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); setAdminAccessState(null); };
  }, [currentAdmin]);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingKycCount, setPendingKycCount] = useState(0);
  const [writeDenied, setWriteDenied] = useState(false);
  useEffect(() => {
    const denied = () => setWriteDenied(true);
    window.addEventListener('admin-write-denied', denied);
    return () => window.removeEventListener('admin-write-denied', denied);
  }, []);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshPanel = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  useEffect(() => {
    if (!canAdmin(access, 'dashboard', 'read')) return undefined;
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
  }, [location.pathname, access]);

  const availableNav = visibleAdminNavigation(access).flatMap(group => group.items);

  return (
    <AdminNumberInputContext.Provider value={true}>
    <div className="admin-panel h-screen overflow-hidden bg-background text-foreground flex flex-col md:flex-row font-sans relative">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col p-4 shadow-sm transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/60">
          <Link to="/admin/dashboard" className="flex-1 flex items-center justify-center py-1 group" aria-label="Admin Dashboard">
            <Logo className="h-10 sm:h-11 w-auto max-w-[200px] object-contain mx-auto transition-transform group-hover:scale-105" />
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-muted-foreground hover:text-foreground p-1 cursor-pointer shrink-0 ml-2"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <AdminSidebarNav access={access} pendingKycCount={pendingKycCount} onNavigate={() => setMobileOpen(false)} />

        <div className="pt-4 border-t border-border flex flex-col gap-2">
          <button
            onClick={() => confirmLogout('admin')}
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
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="md:hidden flex items-center">
              <Logo className="h-8 w-auto max-w-[140px] object-contain" />
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span className="text-xs font-semibold text-muted-foreground">System Status: Operational</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={handleRefreshPanel}
              disabled={isRefreshing}
              title="Refresh admin panel"
              aria-label="Refresh entire panel"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/80 text-foreground hover:text-primary transition-all duration-200 shadow-2xs hover:shadow-xs cursor-pointer text-xs font-semibold select-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <Link to="/admin/profile" className="hover:text-primary transition-colors">
              {isSuperAdmin(access) ? 'Super admin' : access?.accessRoleName || 'Employee'}: <strong className="text-foreground font-bold underline decoration-primary/30 underline-offset-4">{currentAdmin?.fullName || currentAdmin?.name || currentAdmin?.email || 'Administrator'}</strong>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-background">
          <Suspense fallback={<RouteFallback />}>
            <ErrorBoundary key={location.pathname} pathname={location.pathname} embedded onBack={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate('/admin/dashboard', { replace: true });
            }}>
              <AdminLocationNotice />
              {canVisitAdmin(access, location.pathname) ? <>
                {access?.isEmployee && !canAdmin(access, sectionForAdminPath(location.pathname), 'write') && <p className="mb-4 rounded-lg bg-primary/5 p-3 text-sm text-primary">Read-only access · your role can view this section. Changes are disabled.</p>}
                {access?.isEmployee && !canAdmin(access, sectionForAdminPath(location.pathname), 'read') ? <div className="rounded-xl border bg-card p-6"><h2 className="font-bold">Write-only access</h2><p className="mt-2 text-sm text-muted-foreground">Your role can submit changes through authorized actions, but cannot browse existing records. Ask your super admin for read access to use this section’s management screens.</p></div> : <Outlet context={{ adminAccess: access }} />}
              </> : location.pathname === '/admin/dashboard' && availableNav.some(item => canVisitAdmin(access, item.path) && item.path !== '/admin/dashboard') ? <Navigate replace to={availableNav.find(item => canVisitAdmin(access, item.path) && item.path !== '/admin/dashboard').path} /> : <div className="rounded-xl border bg-card p-6"><h2 className="text-lg font-bold">This section is outside your role</h2><p className="mt-2 text-sm text-muted-foreground">Choose an available section in the sidebar or ask your super admin to update your access.</p><Link to="/admin/profile" className="mt-4 inline-block font-semibold text-primary">Open my profile</Link></div>}
            </ErrorBoundary>
          </Suspense>
        </main>
      </div>
    </div>
      <Modal isOpen={writeDenied} onClose={() => setWriteDenied(false)} title="Write access required" description="You don't have write access to this section." size="sm"
        footer={<button type="button" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" onClick={() => setWriteDenied(false)}>Got it</button>}>
        <p className="text-sm text-muted-foreground">You can view the sections included in your role. Ask your super admin to grant write access before making changes here.</p>
      </Modal>
    </AdminNumberInputContext.Provider>
  );
};

export default AdminLayout;
