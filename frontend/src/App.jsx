import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import AppRoutes from './routes/AppRoutes';
import { WebsiteSettingsProvider } from './context/WebsiteSettingsProvider';

function App() {
  return (
    <ThemeProvider>
      <WebsiteSettingsProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </WebsiteSettingsProvider>
    </ThemeProvider>
  );
}

export default App;
