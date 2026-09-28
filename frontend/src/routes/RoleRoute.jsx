import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { AppShellSkeleton } from '../components/ui/Skeleton';

const RoleRoute = ({ allowedRoles = [], portal = null }) => {
  const { user, adminUser, isLoading } = useAuth();

  if (isLoading) {
    return <AppShellSkeleton />;
  }

  const currentUser = portal === 'admin' || allowedRoles.includes('admin') ? adminUser : user;

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
