import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { AppShellSkeleton } from '../components/ui/Skeleton';
import { getStoredRefreshToken } from '../utils/tokenStorage';

const ProtectedRoute = ({ loginPath = '/login', portal = null }) => {
  const { isAuthenticated, isAdminAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  const isAdmin = portal === 'admin' || loginPath.includes('/admin');
  const isAuthed = isAdmin ? isAdminAuthenticated : isAuthenticated;
  const hasRefreshToken = Boolean(getStoredRefreshToken(isAdmin ? 'admin' : undefined));

  // If restoring session or if a valid refresh token exists in storage, hold on skeleton instead of prematurely redirecting to login
  if (isLoading || (!isAuthed && hasRefreshToken)) {
    return <AppShellSkeleton />;
  }

  if (!isAuthed) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
