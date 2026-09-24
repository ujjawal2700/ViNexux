import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const RoleRoute = ({ allowedRoles = [], portal = null }) => {
  const { user, adminUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentUser = portal === 'admin' || allowedRoles.includes('admin') ? adminUser : user;

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
