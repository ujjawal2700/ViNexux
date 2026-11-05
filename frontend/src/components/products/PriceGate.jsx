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
      className={`inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-[#c65d0a] px-3 py-2.5 text-center text-[11px] font-bold leading-tight text-white transition-colors hover:bg-[#a94c06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c65d0a] focus-visible:ring-offset-2 sm:text-xs ${className}`}
    >Login to view the prices</Link>
  );
};

export default function PriceGate({ children, available = true }) {
  if (!usePriceVisibility()) return <LoginToViewPrices />;
  return available ? children : <span className="text-xs text-[var(--store-muted)]">Loading prices…</span>;
}
