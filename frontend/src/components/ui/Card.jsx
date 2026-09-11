import React from 'react';

export const Card = ({
  children,
  className = '',
  hoverable = false,
  glow = false,
  ...props
}) => {
  const base = glow
    ? 'bg-card rounded-2xl p-6 relative overflow-hidden border border-border shadow-md shadow-primary/5'
    : 'bg-card rounded-2xl p-6 relative overflow-hidden border border-border shadow-xs';
  const hoverClass = hoverable
    ? 'hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300'
    : '';

  return (
    <div className={`${base} ${hoverClass} ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div className={`mb-4 pb-3 border-b border-border flex items-center justify-between ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-base font-bold text-foreground tracking-tight ${className}`}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '' }) => (
  <p className={`text-xs text-muted-foreground mt-0.5 leading-relaxed ${className}`}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-6 pt-4 border-t border-border flex items-center justify-between gap-4 ${className}`}>
    {children}
  </div>
);

export default Card;
