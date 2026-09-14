import React, { createContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import { setAccessToken } from '../api/axios';
import { getStoredRefreshToken, setStoredRefreshToken, clearStoredRefreshToken } from '../utils/tokenStorage';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessTokenState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionConflict, setSessionConflict] = useState(false);
  const [conflictTicket, setConflictTicket] = useState(null);

  // Helper to handle tokens & load user profile
  const handleAuthSuccess = useCallback(async (tokens) => {
    const { accessToken: newAccess, refreshToken: newRefresh } = tokens;

    if (newAccess) {
      setAccessToken(newAccess);
      setAccessTokenState(newAccess);
    }

    if (newRefresh) {
      setStoredRefreshToken(newRefresh);
    }

    // Fetch user details
    try {
      const meResponse = await authService.getMe();
      if (meResponse.success && meResponse.data) {
        setUser(meResponse.data.user || meResponse.data);
      }
    } catch (err) {
      console.error('Failed to fetch user profile after authentication:', err);
    }
  }, []);

  // Restore session on initial application load
  useEffect(() => {
    const restoreSession = async () => {
      const storedRefresh = getStoredRefreshToken();

      if (!storedRefresh) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await authService.refreshToken(storedRefresh);
        if (response.success && response.data?.accessToken) {
          await handleAuthSuccess(response.data);
        } else {
          clearStoredRefreshToken();
          setAccessToken(null);
        }
      } catch (err) {
        console.warn('Session restoration failed:', err);
        clearStoredRefreshToken();
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [handleAuthSuccess]);

  // Register Customer
  const signup = async (signupData) => {
    const response = await authService.signup(signupData);
    if (response.success && response.data?.accessToken) {
      await handleAuthSuccess(response.data);
    }
    return response;
  };

  // Google Login / Registration
  const googleLogin = async (googleData) => {
    const response = await authService.googleLogin(googleData);
    if (response.success && response.data?.accessToken) {
      await handleAuthSuccess(response.data);
    }
    return response;
  };

  // Send OTP. Pass portal='admin' from the dedicated admin login page, or
  // purpose='signup' for pre-account contact verification during registration.
  const sendOtp = async (identifier, portal, purpose) => {
    return await authService.sendOtp(identifier, portal, purpose);
  };

  // Verifies a pre-account "signup" OTP (see authService.verifySignupOtp) -
  // does not create a session; the signup() call right after does that.
  const verifySignupOtp = async (identifier, otpCode) => {
    return await authService.verifySignupOtp(identifier, otpCode);
  };

  // Verify OTP
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
      await handleAuthSuccess(response.data);
    }

    return response;
  };

  // Force login on session conflict
  const forceLogin = async (ticket) => {
    const activeTicket = ticket || conflictTicket;
    if (!activeTicket) {
      throw new Error('Conflict ticket is missing for force login');
    }

    const response = await authService.forceLogin(activeTicket);

    if (response.success && response.data?.accessToken) {
      setSessionConflict(false);
      setConflictTicket(null);
      await handleAuthSuccess(response.data);
    }

    return response;
  };

  // Clear session conflict state
  const clearConflictState = () => {
    setSessionConflict(false);
    setConflictTicket(null);
  };

  // Centralized logout
  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setUser(null);
      setAccessTokenState(null);
      setAccessToken(null);
      clearStoredRefreshToken();
      setSessionConflict(false);
      setConflictTicket(null);
    }
  };

  // Update Profile
  const updateUserProfile = async (profileData) => {
    const response = await authService.updateProfile(profileData);
    if (response.success && response.data?.user) {
      setUser((prevUser) => ({
        ...prevUser,
        ...response.data.user,
      }));
    }
    return response;
  };

  const value = {
    user,
    accessToken,
    isAuthenticated: Boolean(user && accessToken),
    isLoading,
    sessionConflict,
    conflictTicket,
    signup,
    verifySignupOtp,
    googleLogin,
    sendOtp,
    verifyOtp,
    forceLogin,
    logout,
    updateProfile: updateUserProfile,
    clearConflictState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
