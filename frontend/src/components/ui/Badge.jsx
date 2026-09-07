import React from 'react';

const statusStyles = {
  // Enquiry Statuses
  new: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  contacted: 'bg-blue-50 text-blue-800 border-blue-200',
  'in-progress': 'bg-amber-50 text-amber-800 border-amber-200',
  closed: 'bg-[#f4e7ea] text-[#7c5c5f] border-[#e5d1d4]',
  spam: 'bg-rose-50 text-rose-800 border-rose-200',

  // KYC & Dealer Statuses
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200',
  active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  inactive: 'bg-[#f4e7ea] text-[#7c5c5f] border-[#e5d1d4]',

  // Product Stock Statuses
  'in-stock': 'bg-teal-50 text-teal-800 border-teal-200',
  'out-of-stock': 'bg-rose-50 text-rose-800 border-rose-200',
  'on-request': 'bg-purple-50 text-purple-800 border-purple-200',
};

const variantStyles = {
  primary: 'bg-[#f4e7ea] text-[#800020] border-[#e5d1d4]',
  secondary: 'bg-[#f4e7ea] text-[#3d0a0d] border-[#e5d1d4]',
  outline: 'bg-transparent text-[#7c5c5f] border-[#e5d1d4]',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-rose-50 text-rose-800 border-rose-200',
  info: 'bg-cyan-50 text-cyan-800 border-cyan-200',
};

export const Badge = ({
  children,
  variant = 'secondary',
  className = '',
  icon = null,
}) => {
  const style = variantStyles[variant] || variantStyles.secondary;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase border ${style} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export const StatusBadge = ({ status = 'pending', className = '' }) => {
  const normalized = String(status).toLowerCase().replace(/\s+/g, '-');
  const style = statusStyles[normalized] || 'bg-[#f4e7ea] text-[#3d0a0d] border-[#e5d1d4]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase border ${style} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  );
};

export default Badge;
