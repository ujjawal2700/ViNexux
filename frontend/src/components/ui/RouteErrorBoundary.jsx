import { useEffect } from 'react';
import { isRouteErrorResponse, useLocation, useRouteError } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';

// Router failures can happen outside every application provider. Keep this screen independent.
export default function RouteErrorBoundary() {
  const error = useRouteError();
  const { pathname } = useLocation();
  const message = error instanceof Error ? error.message : isRouteErrorResponse(error)
    ? `This page could not be opened (${error.status}).` : 'An unexpected application error occurred.';
  useEffect(() => { console.error('Application route failed', { page: pathname, message }); }, [pathname, message]);
  return <ErrorBoundary error={error instanceof Error ? error : new Error(message)} pathname={pathname} />;
}
