import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getPushToken, onForegroundPush } from '../lib/firebase';
import pushService from '../services/pushService';
import useAuth from './useAuth';
export const usePushNotifications = () => {
  const { user, adminUser, isLoading } = useAuth();
  const { pathname } = useLocation();
  const portal = pathname.startsWith('/admin') ? 'admin' : 'customer';
  const account = portal === 'admin' ? adminUser : user;
  const accountId = account?._id || account?.id;
  useEffect(() => {
    if (!accountId || isLoading) return undefined;
    let cancelled = false;
    getPushToken().then(token => { if (token && !cancelled) return pushService.registerToken(token, portal); }).catch(() => {});
    const unsubscribe = onForegroundPush(message => {
      if (message.data?.expiresAt && Number(message.data.expiresAt) < Date.now()) return;
      window.dispatchEvent(new CustomEvent('vinexus-push', { detail: message }));
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [accountId, portal, isLoading]);
};
export default usePushNotifications;
