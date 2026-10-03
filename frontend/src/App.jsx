import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import AppRoutes from './routes/AppRoutes';
import { WebsiteSettingsProvider } from './context/WebsiteSettingsProvider';
import StorageConsentBanner from './components/ui/StorageConsentBanner';
import ScrollToTop from './components/ui/ScrollToTop';
import PromotionalOfferModal from './components/ui/PromotionalOfferModal';

function App() {
  return (
    <ThemeProvider>
      <WebsiteSettingsProvider>
        <AuthProvider>
          <ToastProvider>
            <ScrollToTop />
            <AppRoutes />
            <StorageConsentBanner />
            <PromotionalOfferModal />
          </ToastProvider>
        </AuthProvider>
      </WebsiteSettingsProvider>
    </ThemeProvider>
  );
}

export default App;
