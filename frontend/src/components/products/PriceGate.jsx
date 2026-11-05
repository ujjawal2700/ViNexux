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
      className={`inline-flex min-h-9 w-full items-center justify-center whitespace-nowrap rounded-md bg-[#c65d0a] px-2 py-2 text-center text-[10px] font-bold leading-tight text-white transition-colors hover:bg-[#a94c06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c65d0a] focus-visible:ring-offset-2 sm:text-[11px] ${className}`}
    >Login to order</Link>
  );
};

export default function PriceGate({ children, available = true }) {
  if (!usePriceVisibility()) return <LoginToViewPrices />;
  return available ? children : <span className="text-xs text-[var(--store-muted)]">Loading prices…</span>;
}
