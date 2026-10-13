import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { AppShellSkeleton } from '../components/ui/Skeleton';
import { getStoredRefreshToken } from '../utils/tokenStorage';

const PublicRoute = ({ restricted = false, portal = null }) => {
  const { isAuthenticated, isAdminAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const requestedPath = typeof location.state?.from === 'string' ? location.state.from : location.state?.from?.pathname;
  const returnPath = requestedPath?.startsWith('/') && !requestedPath.startsWith('//') &&
    !/^\/(?:admin|login|register|verify-otp)(?:\/|$)/.test(requestedPath) ? requestedPath : '/';

  const isAdmin = portal === 'admin';
  const hasRefreshToken = Boolean(getStoredRefreshToken(isAdmin ? 'admin' : undefined));

  // If loading or if we have a refresh token waiting to be verified, do not flash login screen
  if (isLoading || (restricted && hasRefreshToken && !(isAdmin ? isAdminAuthenticated : isAuthenticated))) {
    return <AppShellSkeleton />;
  }

  if (restricted) {
    if (isAdmin) {
      if (isAdminAuthenticated) {
        return <Navigate to="/admin/dashboard" replace />;
      }
    } else {
      if (isAuthenticated) {
        return <Navigate to={returnPath} replace />;
      }
    }
  }

  return <Outlet />;
};

export default PublicRoute;
