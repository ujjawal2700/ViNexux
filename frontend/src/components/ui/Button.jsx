import React from 'react';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus-ring',
  {
    variants: {
      variant: {
        primary: 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 border border-primary',
        secondary: 'bg-muted hover:bg-border text-foreground border border-border shadow-xs',
        outline: 'bg-card hover:bg-background text-foreground border border-border hover:border-primary',
        ghost: 'bg-transparent hover:bg-muted/60 text-foreground hover:text-primary',
        danger: 'bg-gradient-to-r from-destructive to-[#d44a63] hover:from-[#a00e32] hover:to-destructive text-white shadow-md shadow-destructive/20 border border-destructive/40',
        success: 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md border border-emerald-700/30',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
        md: 'px-4 py-2 text-sm rounded-xl gap-2',
        lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
      },
      iconOnly: {
        true: '',
        false: '',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    compoundVariants: [
      // Comfortable, click-friendly square hit targets for icon-only buttons
      // (deliberately larger than the old cramped p-1.5/p-2.5 icon buttons)
      { iconOnly: true, size: 'sm', class: 'h-8 w-8 p-0 rounded-lg' },
      { iconOnly: true, size: 'md', class: 'h-10 w-10 p-0 rounded-xl' },
      { iconOnly: true, size: 'lg', class: 'h-12 w-12 p-0 rounded-xl' },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      iconOnly: false,
      fullWidth: false,
    },
  }
);

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

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(buttonVariants({ variant, size, iconOnly, fullWidth }), className)}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
