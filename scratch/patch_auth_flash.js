import fs from 'fs';
import path from 'path';

const frontendDir = 'c:/Rays software/MERN Workspace/Vinexus/frontend';

// 1. Update AuthContext.jsx
const authContextPath = path.join(frontendDir, 'src/context/AuthContext.jsx');
let authContext = fs.readFileSync(authContextPath, 'utf8').replace(/\r\n/g, '\n');

// Update imports in AuthContext
authContext = authContext.replace(
  "import React, { createContext, useState, useEffect, useCallback } from 'react';",
  "import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';"
);
authContext = authContext.replace(
  "import { getStoredRefreshToken, setStoredRefreshToken, clearStoredRefreshToken } from '../utils/tokenStorage';",
  "import { getStoredRefreshToken, setStoredRefreshToken, clearStoredRefreshToken, getStoredUser, setStoredUser, clearStoredUser } from '../utils/tokenStorage';"
);

// Synchronously initialize user and adminUser from localStorage
authContext = authContext.replace(
  "const [user, setUser] = useState(null);",
  "const [user, setUser] = useState(() => getStoredUser('customer'));"
);
authContext = authContext.replace(
  "const [adminUser, setAdminUser] = useState(null);",
  "const [adminUser, setAdminUser] = useState(() => getStoredUser('admin'));"
);

// Update handleAuthSuccess to persist user and clear stored users when needed
const oldHandleAuthSuccessPart = `      if (isAdmin) {
        if (newAccess) {
          setAccessToken(newAccess, 'admin');
          setAdminAccessTokenState(newAccess);
        }
        if (newRefresh) {
          setStoredRefreshToken(newRefresh, 'admin');
        }
        setAdminUser(u);

        if (portal !== 'admin') {
          clearStoredRefreshToken('customer');
          setAccessToken(null, 'customer');
          setUser(null);
          setAccessTokenState(null);
        }
      } else {
        // Normal Customer / Dealer
        if (newAccess) {
          setAccessToken(newAccess, 'customer');
          setAccessTokenState(newAccess);
        }
        if (newRefresh) {
          setStoredRefreshToken(newRefresh, 'customer');
        }
        setUser(u);`;

const newHandleAuthSuccessPart = `      if (isAdmin) {
        if (newAccess) {
          setAccessToken(newAccess, 'admin');
          setAdminAccessTokenState(newAccess);
        }
        if (newRefresh) {
          setStoredRefreshToken(newRefresh, 'admin');
        }
        setAdminUser(u);
        setStoredUser(u, 'admin');

        if (portal !== 'admin') {
          clearStoredRefreshToken('customer');
          clearStoredUser('customer');
          setAccessToken(null, 'customer');
          setUser(null);
          setAccessTokenState(null);
        }
      } else {
        // Normal Customer / Dealer
        if (newAccess) {
          setAccessToken(newAccess, 'customer');
          setAccessTokenState(newAccess);
        }
        if (newRefresh) {
          setStoredRefreshToken(newRefresh, 'customer');
        }
        setUser(u);
        setStoredUser(u, 'customer');`;

authContext = authContext.replace(oldHandleAuthSuccessPart, newHandleAuthSuccessPart);

// Update handleSessionExpiredEvent to clear stored users
authContext = authContext.replace(
  "clearStoredRefreshToken('admin');",
  "clearStoredRefreshToken('admin');\n        clearStoredUser('admin');"
);
authContext = authContext.replace(
  "clearStoredRefreshToken('customer');",
  "clearStoredRefreshToken('customer');\n        clearStoredUser('customer');"
);

// Update restoreSession with concurrency lock and parallel restoration
const oldRestoreSessionBlock = `  // Restore sessions on initial application load
  useEffect(() => {
    const restoreSession = async () => {
      const storedCustomerRefresh = getStoredRefreshToken('customer');
      const storedAdminRefresh = getStoredRefreshToken('admin');

      // 1. Restore Customer / Dealer session if present
      if (storedCustomerRefresh) {
        try {
          const response = await authService.refreshToken(storedCustomerRefresh);
          if (response.success && response.data?.accessToken) {
            await handleAuthSuccess(response.data, 'customer');
          } else {
            clearStoredRefreshToken('customer');
            setAccessToken(null, 'customer');
          }
        } catch (err) {
          console.warn('Customer session restoration failed:', err);
          clearStoredRefreshToken('customer');
          setAccessToken(null, 'customer');
          setUser(null);
          setAccessTokenState(null);
          try {
            sessionStorage.setItem('pending_session_toast', 'Your session has expired. Please login again.');
          } catch (e) {}
          window.dispatchEvent(
            new CustomEvent('session-expired', {
              detail: { portal: 'customer', message: 'Your session has expired. Please login again.' },
            })
          );
          if (window.location.pathname.startsWith('/account') || window.location.pathname.startsWith('/customer') || window.location.pathname.startsWith('/dealer')) {
            window.location.href = '/';
          }
        }
      }

      // 2. Restore Admin session if present
      if (storedAdminRefresh) {
        try {
          const response = await authService.refreshToken(storedAdminRefresh);
          if (response.success && response.data?.accessToken) {
            await handleAuthSuccess(response.data, 'admin');
          } else {
            clearStoredRefreshToken('admin');
            setAccessToken(null, 'admin');
          }
        } catch (err) {
          console.warn('Admin session restoration failed:', err);
          clearStoredRefreshToken('admin');
          setAccessToken(null, 'admin');
        }
      }

      setIsLoading(false);
    };

    restoreSession();
  }, [handleAuthSuccess]);`;

const newRestoreSessionBlock = `  const isRestoringRef = useRef(false);

  // Restore sessions on initial application load
  useEffect(() => {
    if (isRestoringRef.current) return;
    isRestoringRef.current = true;

    const restoreSession = async () => {
      const storedCustomerRefresh = getStoredRefreshToken('customer');
      const storedAdminRefresh = getStoredRefreshToken('admin');

      const tasks = [];

      // 1. Customer restore task
      if (storedCustomerRefresh) {
        tasks.push(
          (async () => {
            try {
              const response = await authService.refreshToken(storedCustomerRefresh);
              if (response.success && response.data?.accessToken) {
                await handleAuthSuccess(response.data, 'customer');
              } else {
                clearStoredRefreshToken('customer');
                clearStoredUser('customer');
                setAccessToken(null, 'customer');
                setUser(null);
              }
            } catch (err) {
              console.warn('Customer session restoration failed:', err);
              clearStoredRefreshToken('customer');
              clearStoredUser('customer');
              setAccessToken(null, 'customer');
              setUser(null);
              setAccessTokenState(null);
              try {
                sessionStorage.setItem('pending_session_toast', 'Your session has expired. Please login again.');
              } catch (e) {}
              window.dispatchEvent(
                new CustomEvent('session-expired', {
                  detail: { portal: 'customer', message: 'Your session has expired. Please login again.' },
                })
              );
              if (window.location.pathname.startsWith('/account') || window.location.pathname.startsWith('/customer') || window.location.pathname.startsWith('/dealer')) {
                window.location.href = '/';
              }
            }
          })()
        );
      }

      // 2. Admin restore task (runs in parallel!)
      if (storedAdminRefresh) {
        tasks.push(
          (async () => {
            try {
              const response = await authService.refreshToken(storedAdminRefresh);
              if (response.success && response.data?.accessToken) {
                await handleAuthSuccess(response.data, 'admin');
              } else {
                clearStoredRefreshToken('admin');
                clearStoredUser('admin');
                setAccessToken(null, 'admin');
                setAdminUser(null);
              }
            } catch (err) {
              console.warn('Admin session restoration failed:', err);
              clearStoredRefreshToken('admin');
              clearStoredUser('admin');
              setAccessToken(null, 'admin');
              setAdminUser(null);
            }
          })()
        );
      }

      await Promise.allSettled(tasks);
      setIsLoading(false);
    };

    restoreSession();
  }, [handleAuthSuccess]);`;

authContext = authContext.replace(oldRestoreSessionBlock, newRestoreSessionBlock);

// In logout: clearStoredUser
authContext = authContext.replace(
  "clearStoredRefreshToken('admin');\n      } else {",
  "clearStoredRefreshToken('admin');\n        clearStoredUser('admin');\n      } else {"
);
authContext = authContext.replace(
  "clearStoredRefreshToken('customer');\n      }",
  "clearStoredRefreshToken('customer');\n        clearStoredUser('customer');\n      }"
);

// In updateUserProfile: setStoredUser
authContext = authContext.replace(
  "setAdminUser((prev) => ({ ...prev, ...freshUser }));",
  "setAdminUser((prev) => ({ ...prev, ...freshUser }));\n        setStoredUser(freshUser, 'admin');"
);
authContext = authContext.replace(
  "setUser((prev) => ({ ...prev, ...freshUser }));",
  "setUser((prev) => ({ ...prev, ...freshUser }));\n        setStoredUser(freshUser, 'customer');"
);

fs.writeFileSync(authContextPath, authContext, 'utf8');
console.log('✓ Successfully updated AuthContext.jsx');

// 2. Update ProtectedRoute.jsx
const protectedRoutePath = path.join(frontendDir, 'src/routes/ProtectedRoute.jsx');
const protectedRouteContent = `import React from 'react';
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
`;
fs.writeFileSync(protectedRoutePath, protectedRouteContent, 'utf8');
console.log('✓ Successfully updated ProtectedRoute.jsx');

// 3. Update PublicRoute.jsx
const publicRoutePath = path.join(frontendDir, 'src/routes/PublicRoute.jsx');
const publicRouteContent = `import React from 'react';
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
`;
fs.writeFileSync(publicRoutePath, publicRouteContent, 'utf8');
console.log('✓ Successfully updated PublicRoute.jsx');
