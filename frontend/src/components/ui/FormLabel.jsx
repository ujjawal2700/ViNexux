import React from 'react';

export const FormLabel = ({ children, required = false, htmlFor, className = '' }) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-xs font-semibold uppercase tracking-wider text-foreground mb-1.5 ${className}`}
    >
      {children}
      {required && <span className="text-destructive ml-1 font-bold">*</span>}
    </label>
  );
};

export default FormLabel;
