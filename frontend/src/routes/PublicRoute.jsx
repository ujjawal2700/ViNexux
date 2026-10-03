import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { AppShellSkeleton } from '../components/ui/Skeleton';
import { getStoredRefreshToken } from '../utils/tokenStorage';

const PublicRoute = ({ restricted = false, portal = null }) => {
  const { isAuthenticated, isAdminAuthenticated, isLoading } = useAuth();

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
        return <Navigate to="/" replace />;
      }
    }
  }

  return <Outlet />;
};

export default PublicRoute;
