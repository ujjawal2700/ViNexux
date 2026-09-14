import { useEffect } from 'react';
import { getPushToken, onForegroundPush } from '../lib/firebase';
import pushService from '../services/pushService';
import useToast from './useToast';
import useAuth from './useAuth';

/**
 * Registers the current device for push notifications (once authenticated)
 * and shows foreground push messages as toasts. Safe no-op if Firebase
 * isn't configured yet, if the browser denies/doesn't support notifications,
 * or if the request otherwise fails - push is an enhancement, never a
 * blocker for using the app.
 */
export const usePushNotifications = () => {
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let cancelled = false;

    (async () => {
      const token = await getPushToken();
      if (token && !cancelled) {
        try {
          await pushService.registerToken(token);
        } catch (err) {
          console.warn('[Push] Failed to register token with backend:', err.message);
        }
      }
    })();

    const unsubscribe = onForegroundPush(({ title, body }) => {
      if (title || body) {
        toast.info(`${title || 'Notification'}${body ? ` — ${body}` : ''}`, 6000);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
};

export default usePushNotifications;
