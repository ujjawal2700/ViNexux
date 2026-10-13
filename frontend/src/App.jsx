import React from 'react';
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

function App() {
  return (
    <ThemeProvider>
      <WebsiteSettingsProvider>
        <SeasonalThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmationProvider>
            <ScrollToTop />
            <AppRoutes />
            <StorefrontOverlayScope>
              <StorageConsentBanner />
              <PromotionalOfferModal />
            </StorefrontOverlayScope>
            </ConfirmationProvider>
          </ToastProvider>
        </AuthProvider>
        </SeasonalThemeProvider>
      </WebsiteSettingsProvider>
    </ThemeProvider>
  );
}

export default App;
