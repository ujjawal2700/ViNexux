import React from 'react';

export const Card = ({
  children,
  className = '',
  hoverable = false,
  glow = false,
  ...props
}) => {
  const base = glow
    ? 'bg-white rounded-2xl p-6 relative overflow-hidden border border-[#e5d1d4] shadow-md shadow-[#800020]/5'
    : 'bg-white rounded-2xl p-6 relative overflow-hidden border border-[#e5d1d4] shadow-xs';
  const hoverClass = hoverable
    ? 'hover:border-[#800020]/40 hover:shadow-xl hover:shadow-[#800020]/5 transition-all duration-300'
    : '';

  return (
    <div className={`${base} ${hoverClass} ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div className={`mb-4 pb-3 border-b border-[#e5d1d4] flex items-center justify-between ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-base font-bold text-[#3d0a0d] tracking-tight ${className}`}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '' }) => (
  <p className={`text-xs text-[#7c5c5f] mt-0.5 leading-relaxed ${className}`}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-6 pt-4 border-t border-[#e5d1d4] flex items-center justify-between gap-4 ${className}`}>
    {children}
  </div>
);

export default Card;
