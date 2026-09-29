import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import AppRoutes from './routes/AppRoutes';
import { WebsiteSettingsProvider } from './context/WebsiteSettingsProvider';
import StorageConsentBanner from './components/ui/StorageConsentBanner';

function App() {
  return (
    <ThemeProvider>
      <WebsiteSettingsProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
            <StorageConsentBanner />
          </ToastProvider>
        </AuthProvider>
      </WebsiteSettingsProvider>
    </ThemeProvider>
  );
}

export default App;
