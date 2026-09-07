import React, { useRef, useState, useEffect } from 'react';
import FormField from './FormField';

export const OTPInput = ({
  length = 6,
  value = '',
  onChange,
  onComplete,
  label = 'Verification Code (6 Digits)',
  error,
  helperText,
  isDisabled = false,
  className = '',
}) => {
  const [digits, setDigits] = useState(() => {
    const arr = Array(length).fill('');
    for (let i = 0; i < Math.min(value.length, length); i++) {
      arr[i] = value[i];
    }
    return arr;
  });

  const inputRefs = useRef([]);

  useEffect(() => {
    const arr = Array(length).fill('');
    for (let i = 0; i < Math.min(value.length, length); i++) {
      arr[i] = value[i];
    }
    setDigits(arr);
  }, [value, length]);

  const handleChange = (e, index) => {
    const val = e.target.value;
    const lastChar = val.substring(val.length - 1);

    if (val && !/^\d+$/.test(lastChar)) return;

    const newDigits = [...digits];
    newDigits[index] = lastChar;
    setDigits(newDigits);

    const combined = newDigits.join('');
    if (onChange) onChange(combined);

    if (lastChar && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (combined.length === length && !newDigits.includes('') && onComplete) {
      onComplete(combined);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, length);
    if (!pastedData) return;

    const newDigits = Array(length).fill('');
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setDigits(newDigits);

    const combined = newDigits.join('');
    if (onChange) onChange(combined);

    const targetIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[targetIndex]?.focus();

    if (combined.length === length && onComplete) {
      onComplete(combined);
    }
  };

  return (
    <FormField label={label} error={error} helperText={helperText}>
      <div className={`flex items-center justify-between gap-2 max-w-sm mx-auto ${className}`}>
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digits[index] || ''}
            disabled={isDisabled}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            className={`w-11 h-12 text-center text-xl font-mono font-bold bg-white border ${
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                : 'border-[#e5d1d4] focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20'
            } rounded-xl text-[#3d0a0d] placeholder-[#9a6870] transition-all focus-ring disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        ))}
      </div>
    </FormField>
  );
};

export default OTPInput;
