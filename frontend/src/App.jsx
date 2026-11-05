import PwaSupport from './components/ui/PwaSupport';
import GoogleAnalytics from './components/ui/GoogleAnalytics';
import React from 'react';
import { useLocation } from 'react-router-dom';
import useWebsiteSettings from './hooks/useWebsiteSettings';
import PushNotificationBridge from './components/ui/PushNotificationBridge';
import CustomerPushPrompt from './components/ui/CustomerPushPrompt';
import { SeasonalThemeProvider, StorefrontOverlayScope } from './context/SeasonalThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmationProvider } from './context/ConfirmationContext';
import { ThemeProvider } from './context/ThemeContext';
import AppRoutes from './routes/AppRoutes';
import { WebsiteSettingsProvider } from './context/WebsiteSettingsProvider';
import StorageConsentBanner from './components/ui/StorageConsentBanner';
import ScrollToTop from './components/ui/ScrollToTop';
import PromotionalOfferModal from './components/ui/PromotionalOfferModal';

function MaintenanceGate({ children }) {
  const { settings, loading } = useWebsiteSettings();
  const { pathname } = useLocation();
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return children;
  if (loading) return <main className="min-h-screen grid place-items-center" role="status">Loading…</main>;
  if (!settings.maintenanceEnabled) return children;
  return <main className="min-h-screen flex items-center justify-center bg-background px-6 text-foreground">
    <div className="max-w-lg text-center space-y-5">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">{settings.websiteName}</p>
      <h1 className="text-3xl font-bold">We're under maintenance</h1>
      <p className="whitespace-pre-wrap leading-7 text-muted-foreground">{settings.maintenanceMessage || 'Our website is under maintenance. Please check back soon.'}</p>
    </div>
  </main>;
}

function App() {
  return (
    <ThemeProvider>
      <PwaSupport />
      <WebsiteSettingsProvider>
        <MaintenanceGate>
        <SeasonalThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmationProvider>
            <PushNotificationBridge />
            <CustomerPushPrompt />
            <ScrollToTop />
            <GoogleAnalytics />
            <AppRoutes />
            <StorefrontOverlayScope>
              <StorageConsentBanner />
              <PromotionalOfferModal />
            </StorefrontOverlayScope>
            </ConfirmationProvider>
          </ToastProvider>
        </AuthProvider>
        </SeasonalThemeProvider>
        </MaintenanceGate>
      </WebsiteSettingsProvider>
    </ThemeProvider>
  );
}

export default App;
