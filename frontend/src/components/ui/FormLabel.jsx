import React from 'react';

export const FormLabel = ({ children, required = false, htmlFor, className = '' }) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-xs font-semibold uppercase tracking-wider text-[#3d0a0d] mb-1.5 ${className}`}
    >
      {children}
      {required && <span className="text-[#be123c] ml-1 font-bold">*</span>}
    </label>
  );
};

export default FormLabel;
