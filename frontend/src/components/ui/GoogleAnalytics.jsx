import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { syncGoogleAnalytics } from '../../utils/googleAnalytics';
export default function GoogleAnalytics() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    syncGoogleAnalytics();
    window.addEventListener('storage-choices-updated', syncGoogleAnalytics);
    return () => window.removeEventListener('storage-choices-updated', syncGoogleAnalytics);
  }, []);
  useEffect(() => { syncGoogleAnalytics(); }, [pathname, search]);
  return null;
}
