import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { ROLES } from '../constants';

const PublicRoute = ({ restricted = false }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated && restricted) {
    switch (user?.role) {
      case ROLES.ADMIN:
        return <Navigate to="/admin/dashboard" replace />;
      case ROLES.DEALER:
        return <Navigate to="/dealer/dashboard" replace />;
      case ROLES.CUSTOMER:
      default:
        return <Navigate to="/customer/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default PublicRoute;
