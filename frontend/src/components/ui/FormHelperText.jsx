import React from 'react';

export const FormHelperText = ({ children, className = '' }) => {
  if (!children) return null;

  return (
    <p className={`text-[11px] text-[#9a6870] mt-1 ${className}`}>
      {children}
    </p>
  );
};

export default FormHelperText;
