import React from 'react';
import FormField from './FormField';
import { ChevronDown } from 'lucide-react';

export const Select = React.forwardRef(({
  label,
  error,
  helperText,
  required = false,
  isDisabled = false,
  options = [],
  placeholder = 'Select an option...',
  className = '',
  id,
  children,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <FormField label={label} required={required} error={error} helperText={helperText} htmlFor={selectId}>
      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          disabled={isDisabled}
          className={`w-full appearance-none bg-card border ${
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
              : 'border-border focus:border-primary focus:ring-1 focus:ring-primary/20'
          } rounded-xl pl-4 pr-10 py-2.5 text-sm text-foreground placeholder-muted-foreground/70 transition-all focus-ring disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-card text-[#9a6870]">
              {placeholder}
            </option>
          )}
          {options.length > 0
            ? options.map((opt) => (
                <option
                  key={opt.value ?? opt.id}
                  value={opt.value ?? opt.id}
                  disabled={opt.disabled}
                  className="bg-card text-foreground"
                >
                  {opt.label || opt.name || opt.value}
                </option>
              ))
            : children}
        </select>
        <ChevronDown className="absolute right-3.5 w-4 h-4 text-[#9a6870] pointer-events-none shrink-0" />
      </div>
    </FormField>
  );
});

Select.displayName = 'Select';

export default Select;
