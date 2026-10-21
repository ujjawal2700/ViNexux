import React from 'react';
import FormLabel from './FormLabel';
import FormError from './FormError';
import FormHelperText from './FormHelperText';

export const FormField = ({
  label,
  id,
  required = false,
  error,
  helperText,
  children,
  htmlFor,
  className = '',
}) => {
  return (
    <div id={id} className={`space-y-1 ${className}`}>
      {label && <FormLabel htmlFor={htmlFor} required={required}>{label}</FormLabel>}
      {children}
      {error ? <FormError error={error} /> : <FormHelperText>{helperText}</FormHelperText>}
    </div>
  );
};

export default FormField;
