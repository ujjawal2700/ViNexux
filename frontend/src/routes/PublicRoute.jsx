import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { ROLES } from '../constants';

const PublicRoute = ({ restricted = false, portal = null }) => {
  const { isAuthenticated, isAdminAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
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
