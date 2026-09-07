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

  // Send OTP
  const sendOtp = async (identifier) => {
    return await authService.sendOtp(identifier);
  };

  // Verify OTP
  const verifyOtp = async (identifier, otpCode) => {
    const response = await authService.verifyOtp(identifier, otpCode);

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

  const value = {
    user,
    accessToken,
    isAuthenticated: Boolean(user && accessToken),
    isLoading,
    sessionConflict,
    conflictTicket,
    sendOtp,
    verifyOtp,
    forceLogin,
    logout,
    clearConflictState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
