import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import authService from '../services/authService';
import cartService from '../services/cartService';
import guestCartService from '../services/guestCartService';
import { setAccessToken, notifySessionExpired } from '../api/axios';
import { getStoredRefreshToken, setStoredRefreshToken, clearStoredRefreshToken, getStoredUser, setStoredUser, clearStoredUser } from '../utils/tokenStorage';
import { ROLES } from '../constants';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // 1. Customer / Dealer session state (guarded by presence of refresh token)
  const [user, setUser] = useState(() => {
    const refresh = getStoredRefreshToken('customer');
    return refresh ? getStoredUser('customer') : null;
  });
  const [accessToken, setAccessTokenState] = useState(null);

  // 2. Admin session state (guarded by presence of refresh token)
  const [adminUser, setAdminUser] = useState(() => {
    const refresh = getStoredRefreshToken('admin');
    return refresh ? getStoredUser('admin') : null;
  });
  const [adminAccessToken, setAdminAccessTokenState] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [sessionConflict, setSessionConflict] = useState(false);
  const [conflictTicket, setConflictTicket] = useState(null);

  // Helper to handle tokens & load user profile (portal: 'admin' | 'customer')
  const handleAuthSuccess = useCallback(async (tokens, portal) => {
    const { accessToken: newAccess, refreshToken: newRefresh, user: authUser } = tokens;

    let u = authUser || null;

    // If user object not provided in tokens payload, fetch via /auth/me
    if (!u && newAccess) {
      try {
        const meResponse = await authService.getMe(newAccess);
        if (meResponse.success && meResponse.data) {
          u = meResponse.data.user || meResponse.data;
        }
      } catch (err) {
        console.error('Failed to fetch user profile after authentication:', err);
      }
    }

    if (u) {
      const isAdmin = u.role === ROLES.ADMIN || portal === 'admin';

      if (isAdmin) {
        if (newAccess) {
          setAccessToken(newAccess, 'admin');
          setAdminAccessTokenState(newAccess);
        }
        if (newRefresh) {
          setStoredRefreshToken(newRefresh, 'admin');
        }
        setAdminUser(u);
        setStoredUser(u, 'admin');

        if (portal !== 'admin') {
          clearStoredRefreshToken('customer');
          clearStoredUser('customer');
          setAccessToken(null, 'customer');
          setUser(null);
          setAccessTokenState(null);
        }
      } else {
        // Normal Customer / Dealer
        if (newAccess) {
          setAccessToken(newAccess, 'customer');
          setAccessTokenState(newAccess);
        }
        if (newRefresh) {
          setStoredRefreshToken(newRefresh, 'customer');
        }
        setUser(u);
        setStoredUser(u, 'customer');

        // Merge the standard-price guest cart into the authenticated cart.
        // The backend recalculates every item using the account's current
        // dealer approval status, so client-stored prices are never trusted.
        const guestItems = guestCartService.getItems();
        if (guestItems.length) {
          try {
            for (const item of guestItems) {
              const productId = item.productId?._id || item.productId;
              if (productId) await cartService.addItem(productId, item.quantity || 1);
            }
            guestCartService.clear();
          } catch (err) {
            console.warn('Guest cart retained because account cart sync failed:', err);
          }
        }
      }
    }
  }, []);

  // Listen for global session expiration events (e.g. forced revocation by admin)
  useEffect(() => {
    const handleSessionExpiredEvent = (e) => {
      const portal = e.detail?.portal;
      if (portal === 'admin') {
        setAdminUser(null);
        setAdminAccessTokenState(null);
        setAccessToken(null, 'admin');
        clearStoredRefreshToken('admin');
        clearStoredUser('admin');
        if (window.location.pathname.startsWith('/admin') && !window.location.pathname.includes('/login')) {
          try {
            sessionStorage.setItem('pending_session_toast', 'Your session has expired. Please login again.');
          } catch (err) {}
          window.location.href = '/admin/login';
        }
      } else {
        setUser(null);
        setAccessTokenState(null);
        setAccessToken(null, 'customer');
        clearStoredRefreshToken('customer');
        clearStoredUser('customer');

        const isCustomerProtectedRoute =
          window.location.pathname.startsWith('/account') ||
          window.location.pathname.startsWith('/dealer') ||
          window.location.pathname.startsWith('/checkout');

        if (isCustomerProtectedRoute) {
          try {
            sessionStorage.setItem('pending_session_toast', 'Your session has expired. Please login again.');
          } catch (err) {}
          window.location.href = '/';
        }
      }
    };

    window.addEventListener('session-expired', handleSessionExpiredEvent);
    return () => window.removeEventListener('session-expired', handleSessionExpiredEvent);
  }, []);

  const isRestoringRef = useRef(false);

  // Restore sessions on initial application load
  useEffect(() => {
    if (isRestoringRef.current) return;
    isRestoringRef.current = true;

    const restoreSession = async () => {
      const storedCustomerRefresh = getStoredRefreshToken('customer');
      const storedAdminRefresh = getStoredRefreshToken('admin');

      const tasks = [];

      // 1. Customer restore task
      if (storedCustomerRefresh) {
        tasks.push(
          (async () => {
            try {
              const response = await authService.refreshToken(storedCustomerRefresh);
              if (response.success && response.data?.accessToken) {
                await handleAuthSuccess(response.data, 'customer');
              } else {
                clearStoredRefreshToken('customer');
                clearStoredUser('customer');
                setAccessToken(null, 'customer');
                setUser(null);
                setAccessTokenState(null);
              }
            } catch (err) {
              console.warn('Customer session restoration failed:', err);
              clearStoredRefreshToken('customer');
              clearStoredUser('customer');
              setAccessToken(null, 'customer');
              setUser(null);
              setAccessTokenState(null);

              const isCustomerProtectedRoute =
                window.location.pathname.startsWith('/account') ||
                window.location.pathname.startsWith('/dealer') ||
                window.location.pathname.startsWith('/checkout');

              if (isCustomerProtectedRoute) {
                try {
                  sessionStorage.setItem('pending_session_toast', 'Your session has expired. Please login again.');
                } catch (e) {}
                window.location.href = '/';
              } else {
                notifySessionExpired('customer');
              }
            }
          })()
        );
      } else {
        clearStoredUser('customer');
      }

      // 2. Admin restore task (runs in parallel!)
      if (storedAdminRefresh) {
        tasks.push(
          (async () => {
            try {
              const response = await authService.refreshToken(storedAdminRefresh);
              if (response.success && response.data?.accessToken) {
                await handleAuthSuccess(response.data, 'admin');
              } else {
                clearStoredRefreshToken('admin');
                clearStoredUser('admin');
                setAccessToken(null, 'admin');
                setAdminUser(null);
                setAdminAccessTokenState(null);
              }
            } catch (err) {
              console.warn('Admin session restoration failed:', err);
              clearStoredRefreshToken('admin');
              clearStoredUser('admin');
              setAccessToken(null, 'admin');
              setAdminUser(null);
              setAdminAccessTokenState(null);

              if (window.location.pathname.startsWith('/admin') && !window.location.pathname.includes('/login')) {
                try {
                  sessionStorage.setItem('pending_session_toast', 'Your session has expired. Please login again.');
                } catch (e) {}
                window.location.href = '/admin/login';
              } else {
                notifySessionExpired('admin');
              }
            }
          })()
        );
      } else {
        clearStoredUser('admin');
      }

      await Promise.allSettled(tasks);
      setIsLoading(false);
    };

    restoreSession();
  }, [handleAuthSuccess]);

  // Register Customer
  const signup = async (signupData) => {
    const response = await authService.signup(signupData);
    if (response.success && response.data?.accessToken) {
      await handleAuthSuccess(response.data, 'customer');
    }
    return response;
  };

  // Google Login / Registration
  const googleLogin = async (googleData) => {
    const response = await authService.googleLogin(googleData);
    if (response.success && response.data?.accessToken) {
      await handleAuthSuccess(response.data, 'customer');
    }
    return response;
  };

  // Send OTP
  const sendOtp = async (identifier, portal, purpose, password) => {
    return await authService.sendOtp(identifier, portal, purpose, password);
  };

  const verifySignupOtp = async (identifier, otpCode) => {
    return await authService.verifySignupOtp(identifier, otpCode);
  };

  const verifyResetOtp = async (identifier, otpCode, portal) => {
    return await authService.verifyResetOtp(identifier, otpCode, portal);
  };

  const resetPassword = async (resetToken, newPassword) => {
    return await authService.resetPassword(resetToken, newPassword);
  };

  // Verify OTP (portal: 'admin' | undefined/customer)
  const verifyOtp = async (identifier, otpCode, portal) => {
    const response = await authService.verifyOtp(identifier, otpCode, portal);

    // Check for session conflict returned by backend
    if (response.data?.sessionConflict || response.sessionConflict) {
      const ticket = response.data?.conflictTicket || response.conflictTicket;
      setSessionConflict(true);
      setConflictTicket(ticket);
      return { sessionConflict: true, conflictTicket: ticket };
    }

    if (response.success && response.data?.accessToken) {
      setSessionConflict(false);
      setConflictTicket(null);
      await handleAuthSuccess(response.data, portal);
    }

    return response;
  };

  // Force login on session conflict
  const forceLogin = async (ticket, portal) => {
    const activeTicket = ticket || conflictTicket;
    if (!activeTicket) {
      throw new Error('Conflict ticket is missing for force login');
    }

    const response = await authService.forceLogin(activeTicket);

    if (response.success && response.data?.accessToken) {
      setSessionConflict(false);
      setConflictTicket(null);
      await handleAuthSuccess(response.data, portal);
    }

    return response;
  };

  // Clear session conflict state
  const clearConflictState = () => {
    setSessionConflict(false);
    setConflictTicket(null);
  };

  // Logout (supports portal: 'admin' vs customer default)
  const logout = async (portal) => {
    try {
      await authService.logout(portal);
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      if (portal === 'admin') {
        setAdminUser(null);
        setAdminAccessTokenState(null);
        setAccessToken(null, 'admin');
        clearStoredRefreshToken('admin');
        clearStoredUser('admin');
      } else {
        setUser(null);
        setAccessTokenState(null);
        setAccessToken(null, 'customer');
        clearStoredRefreshToken('customer');
        clearStoredUser('customer');
      }
      setSessionConflict(false);
      setConflictTicket(null);
    }
  };

  const adminLogout = () => logout('admin');

  // Update Profile
  const updateUserProfile = async (profileData, portal = 'customer') => {
    const isAdminSession = portal === 'admin';
    const requestToken = isAdminSession ? adminAccessToken : accessToken;
    const requestPortal = isAdminSession ? 'admin' : 'customer';
    const response = await authService.updateProfile(profileData, requestToken, requestPortal);
    if (response.success && response.data?.user) {
      const updated = response.data.user;
      const isAdminUpdate = updated.role === ROLES.ADMIN;
      const activeToken = isAdminUpdate ? adminAccessToken : accessToken;
      let freshUser = updated;

      // Read the saved record back through the authenticated API so the UI
      // uses the database result rather than retaining submitted form state.
      if (activeToken) {
        try {
          const refreshed = await authService.getMe(activeToken, isAdminUpdate ? 'admin' : 'customer');
          freshUser = refreshed.data?.user || refreshed.data || updated;
        } catch (err) {
          console.warn('Profile saved, but refreshing the latest profile failed:', err);
        }
      }

      if (isAdminUpdate) {
        setAdminUser((prev) => ({ ...prev, ...freshUser }));
        setStoredUser(freshUser, 'admin');
      } else {
        setUser((prev) => ({ ...prev, ...freshUser }));
        setStoredUser(freshUser, 'customer');
      }
      response.data.user = freshUser;
    }
    return response;
  };

  // Computed authentication flags:
  // isAuthenticated is TRUE ONLY for Customers/Dealers on the storefront.
  // isAdminAuthenticated is TRUE ONLY for Administrators in the Admin panel.
  const isAuthenticated = Boolean(user && (user.role === ROLES.CUSTOMER || user.role === ROLES.DEALER));
  const isAdminAuthenticated = Boolean(adminUser && adminUser.role === ROLES.ADMIN);

  const value = {
    // Customer / Dealer
    user,
    accessToken,
    isAuthenticated,

    // Admin
    adminUser,
    adminAccessToken,
    isAdminAuthenticated,

    isLoading,
    sessionConflict,
    conflictTicket,
    signup,
    verifySignupOtp,
    googleLogin,
    sendOtp,
    verifyOtp,
    verifyResetOtp,
    resetPassword,
    forceLogin,
    logout,
    adminLogout,
    clearConflictState,
    updateUserProfile,
    updateProfile: updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
