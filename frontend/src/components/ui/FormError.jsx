import React from 'react';
import { AlertCircle } from 'lucide-react';

export const FormError = ({ error, message, className = '' }) => {
  const err = error || message;
  if (!err) return null;

  return (
    <div className={`flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl font-medium ${className}`}>
      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
      <span>{typeof err === 'string' ? err : err.message}</span>
    </div>
  );
};

export default FormError;
