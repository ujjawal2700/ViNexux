import React, { createContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import { setAccessToken } from '../api/axios';
import { getStoredRefreshToken, setStoredRefreshToken, clearStoredRefreshToken } from '../utils/tokenStorage';
import { ROLES } from '../constants';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // 1. Customer / Dealer session state
  const [user, setUser] = useState(null);
  const [accessToken, setAccessTokenState] = useState(null);

  // 2. Admin session state
  const [adminUser, setAdminUser] = useState(null);
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

        if (portal !== 'admin') {
          clearStoredRefreshToken('customer');
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
      }
    }
  }, []);

  // Restore sessions on initial application load
  useEffect(() => {
    const restoreSession = async () => {
      const storedCustomerRefresh = getStoredRefreshToken('customer');
      const storedAdminRefresh = getStoredRefreshToken('admin');

      // 1. Restore Customer / Dealer session if present
      if (storedCustomerRefresh) {
        try {
          const response = await authService.refreshToken(storedCustomerRefresh);
          if (response.success && response.data?.accessToken) {
            await handleAuthSuccess(response.data, 'customer');
          } else {
            clearStoredRefreshToken('customer');
            setAccessToken(null, 'customer');
          }
        } catch (err) {
          console.warn('Customer session restoration failed:', err);
          clearStoredRefreshToken('customer');
          setAccessToken(null, 'customer');
        }
      }

      // 2. Restore Admin session if present
      if (storedAdminRefresh) {
        try {
          const response = await authService.refreshToken(storedAdminRefresh);
          if (response.success && response.data?.accessToken) {
            await handleAuthSuccess(response.data, 'admin');
          } else {
            clearStoredRefreshToken('admin');
            setAccessToken(null, 'admin');
          }
        } catch (err) {
          console.warn('Admin session restoration failed:', err);
          clearStoredRefreshToken('admin');
          setAccessToken(null, 'admin');
        }
      }

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

  const verifyResetOtp = async (identifier, otpCode) => {
    return await authService.verifyResetOtp(identifier, otpCode);
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
      await authService.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      if (portal === 'admin') {
        setAdminUser(null);
        setAdminAccessTokenState(null);
        setAccessToken(null, 'admin');
        clearStoredRefreshToken('admin');
      } else {
        setUser(null);
        setAccessTokenState(null);
        setAccessToken(null, 'customer');
        clearStoredRefreshToken('customer');
      }
      setSessionConflict(false);
      setConflictTicket(null);
    }
  };

  const adminLogout = () => logout('admin');

  // Update Profile
  const updateUserProfile = async (profileData) => {
    const response = await authService.updateProfile(profileData);
    if (response.success && response.data?.user) {
      const updated = response.data.user;
      if (updated.role === ROLES.ADMIN) {
        setAdminUser((prev) => ({ ...prev, ...updated }));
      } else {
        setUser((prev) => ({ ...prev, ...updated }));
      }
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
