import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { canViewStorefrontPrices } from '../../../../shared/storefrontPricing';

export const usePriceVisibility = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  return Boolean(isAuthenticated && !isLoading && canViewStorefrontPrices(user));
};

export const LoginToViewPrices = ({ className = '' }) => {
  const location = useLocation();
  return (
    <Link
      to="/login"
      state={{ from: { pathname: `${location.pathname}${location.search}` } }}
      onClick={event => event.stopPropagation()}
      className={`inline-flex items-center justify-center rounded-md border border-[var(--store-primary)] px-2.5 py-2 text-xs font-semibold text-[var(--store-primary)] hover:bg-[var(--store-background)] ${className}`}
    >Login to view the prices</Link>
  );
};

export default function PriceGate({ children, available = true }) {
  if (!usePriceVisibility()) return <LoginToViewPrices />;
  return available ? children : <span className="text-xs text-[var(--store-muted)]">Loading prices…</span>;
}
