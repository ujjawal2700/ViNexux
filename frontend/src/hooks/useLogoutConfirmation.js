import { useRef } from 'react';
import useAuth from './useAuth';
import useConfirm from './useConfirm';

export default function useLogoutConfirmation() {
  const { logout } = useAuth();
  const confirm = useConfirm();
  const pending = useRef(false);

  return async (portal = 'customer') => {
    if (pending.current) return false;
    pending.current = true;
    try {
      const confirmed = await confirm({
        title: portal === 'admin' ? 'Sign out of the admin panel?' : 'Log out of your account?',
        message: portal === 'admin'
          ? 'You will need to sign in again to access the admin panel.'
          : 'You will need to sign in again to access your account.',
        confirmText: 'Yes, log out',
        cancelText: 'Stay logged in',
      });
      if (!confirmed) return false;
      await logout(portal);
      return true;
    } finally {
      pending.current = false;
    }
  };
}
