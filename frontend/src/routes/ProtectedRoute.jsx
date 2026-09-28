import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { AppShellSkeleton } from '../components/ui/Skeleton';

const ProtectedRoute = ({ loginPath = '/login', portal = null }) => {
  const { isAuthenticated, isAdminAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  const isAuthed = portal === 'admin' || loginPath.includes('/admin') ? isAdminAuthenticated : isAuthenticated;

  if (isLoading) {
    return <AppShellSkeleton />;
  }

  if (!isAuthed) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
