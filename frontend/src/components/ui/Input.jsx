import React from 'react';
import FormField from './FormField';

export const Input = React.forwardRef(({
  label,
  error,
  helperText,
  required = false,
  isDisabled = false,
  leftIcon = null,
  rightIcon = null,
  className = '',
  id,
  type = 'text',
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <FormField label={label} required={required} error={error} helperText={helperText} htmlFor={inputId}>
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3.5 text-[#9a6870] pointer-events-none shrink-0">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={isDisabled}
          className={`w-full bg-card border ${
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
              : 'border-border focus:border-primary focus:ring-1 focus:ring-primary/20'
          } rounded-xl py-2.5 text-sm text-foreground placeholder-muted-foreground/70 transition-all focus-ring disabled:opacity-50 disabled:cursor-not-allowed ${
            leftIcon ? 'pl-10' : 'pl-4'
          } ${rightIcon ? 'pr-10' : 'pr-4'} ${className}`}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3.5 text-[#9a6870] pointer-events-none shrink-0">
            {rightIcon}
          </span>
        )}
      </div>
    </FormField>
  );
});

Input.displayName = 'Input';

export default Input;
