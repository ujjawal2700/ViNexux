import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isAdminAppPath, pwaConfig } from '../../../../shared/pwa.js';

export default function PwaSupport() {
  const { pathname } = useLocation();
  const admin = isAdminAppPath(pathname);
  useLayoutEffect(() => {
    const app = pwaConfig(pathname);
    document.querySelector('link[rel="manifest"]')?.setAttribute('href', app.manifest);
    for (const name of ['application-name', 'apple-mobile-web-app-title']) document.querySelector(`meta[name="${name}"]`)?.setAttribute('content', app.name);
  }, [pathname]);
  useEffect(() => {
    if (!admin || !window.isSecureContext || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/', updateViaCache: 'none' })
      .catch(error => console.warn('Admin app offline support could not start:', error.message));
  }, [admin]);
  return null;
}
