import React from 'react';
import { AlertCircle } from 'lucide-react';

export const FormError = ({ error, className = '' }) => {
  if (!error) return null;

  return (
    <p className={`flex items-center gap-1.5 text-xs text-rose-400 font-medium mt-1.5 ${className}`}>
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span>{typeof error === 'string' ? error : error.message}</span>
    </p>
  );
};

export default FormError;
