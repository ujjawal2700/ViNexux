import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const ProtectedRoute = ({ loginPath = '/login', portal = null }) => {
  const { isAuthenticated, isAdminAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  const isAuthed = portal === 'admin' || loginPath.includes('/admin') ? isAdminAuthenticated : isAuthenticated;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm font-medium tracking-wide">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
