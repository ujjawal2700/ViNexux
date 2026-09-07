import React from 'react';
import { Loader2 } from 'lucide-react';

const variantStyles = {
  primary: 'bg-[#800020] hover:bg-[#66001a] text-white shadow-md shadow-[#800020]/20 border border-[#800020]',
  secondary: 'bg-[#f4e7ea] hover:bg-[#ebd5da] text-[#3d0a0d] border border-[#e5d1d4] shadow-xs',
  outline: 'bg-white hover:bg-[#fdf8f9] text-[#3d0a0d] border border-[#e5d1d4] hover:border-[#800020]',
  ghost: 'bg-transparent hover:bg-[#f4e7ea]/60 text-[#3d0a0d] hover:text-[#800020]',
  danger: 'bg-gradient-to-r from-[#be123c] to-[#d44a63] hover:from-[#a00e32] hover:to-[#be123c] text-white shadow-md shadow-[#be123c]/20 border border-[#be123c]/40',
  success: 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md border border-emerald-700/30',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
};

const iconOnlySizes = {
  sm: 'p-1.5 text-xs rounded-lg',
  md: 'p-2.5 text-sm rounded-xl',
  lg: 'p-3.5 text-base rounded-xl',
};

export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isDisabled = false,
  fullWidth = false,
  leftIcon = null,
  rightIcon = null,
  iconOnly = false,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  const disabled = isDisabled || isLoading;

  const baseStyles = 'inline-flex items-center justify-center font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus-ring';
  const variantClass = variantStyles[variant] || variantStyles.primary;
  const sizeClass = iconOnly ? (iconOnlySizes[size] || iconOnlySizes.md) : (sizeStyles[size] || sizeStyles.md);
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={`${baseStyles} ${variantClass} ${sizeClass} ${widthClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {!iconOnly && children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
