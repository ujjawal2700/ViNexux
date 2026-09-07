import React from 'react';
import FormField from './FormField';

export const Textarea = React.forwardRef(({
  label,
  error,
  helperText,
  required = false,
  isDisabled = false,
  rows = 4,
  className = '',
  id,
  ...props
}, ref) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <FormField label={label} required={required} error={error} helperText={helperText} htmlFor={textareaId}>
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        disabled={isDisabled}
        className={`w-full bg-white border ${
          error
            ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
            : 'border-[#e5d1d4] focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20'
        } rounded-xl px-4 py-2.5 text-sm text-[#3d0a0d] placeholder-[#9a6870] transition-all focus-ring disabled:opacity-50 disabled:cursor-not-allowed resize-y ${className}`}
        {...props}
      />
    </FormField>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
