import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import AppRoutes from './routes/AppRoutes';
<<<<<<< HEAD
=======
import GlobalRequestLoader from './components/ui/GlobalRequestLoader';
>>>>>>> 934d1a4eab67a41edc8a69992a0070b627ee5747
import { WebsiteSettingsProvider } from './context/WebsiteSettingsProvider';

function App() {
  return (
    <ThemeProvider>
      <WebsiteSettingsProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
<<<<<<< HEAD
=======
            <GlobalRequestLoader />
>>>>>>> 934d1a4eab67a41edc8a69992a0070b627ee5747
          </ToastProvider>
        </AuthProvider>
      </WebsiteSettingsProvider>
    </ThemeProvider>
  );
}

export default App;
