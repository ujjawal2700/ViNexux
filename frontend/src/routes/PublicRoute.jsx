import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { AppShellSkeleton } from '../components/ui/Skeleton';

const PublicRoute = ({ restricted = false, portal = null }) => {
  const { isAuthenticated, isAdminAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AppShellSkeleton />;
  }

  if (restricted) {
    if (portal === 'admin') {
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
