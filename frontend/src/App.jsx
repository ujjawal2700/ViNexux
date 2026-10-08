import React from 'react';
import { SeasonalThemeProvider, StorefrontOverlayScope } from './context/SeasonalThemeContext';
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
        <SeasonalThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ScrollToTop />
            <AppRoutes />
            <StorefrontOverlayScope>
              <StorageConsentBanner />
              <PromotionalOfferModal />
            </StorefrontOverlayScope>
          </ToastProvider>
        </AuthProvider>
        </SeasonalThemeProvider>
      </WebsiteSettingsProvider>
    </ThemeProvider>
  );
}

export default App;
