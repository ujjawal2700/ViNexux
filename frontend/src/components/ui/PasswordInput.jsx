import React, { useState } from 'react';
import Input from './Input';
import { Eye, EyeOff } from 'lucide-react';

export const PasswordInput = React.forwardRef(({
  label = 'Password',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const EyeButton = (
    <button
      type="button"
      onClick={toggleVisibility}
      className="text-[#9a6870] hover:text-foreground focus:outline-none pointer-events-auto p-1 rounded transition-colors"
      title={showPassword ? 'Hide password' : 'Show password'}
      tabIndex={-1}
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <Input
      ref={ref}
      label={label}
      type={showPassword ? 'text' : 'password'}
      rightIcon={EyeButton}
      {...props}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
