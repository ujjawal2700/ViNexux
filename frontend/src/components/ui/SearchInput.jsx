import React from 'react';
import Input from './Input';
import { Search, X } from 'lucide-react';

export const SearchInput = React.forwardRef(({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search...',
  ...props
}, ref) => {
  const handleClear = (e) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  const ClearButton = value ? (
    <button
      type="button"
      onClick={handleClear}
      className="text-[#9a6870] hover:text-foreground focus:outline-none pointer-events-auto p-1 rounded transition-colors"
      title="Clear search"
    >
      <X className="w-4 h-4" />
    </button>
  ) : null;

  return (
    <Input
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      leftIcon={<Search className="w-4 h-4 text-[#9a6870]" />}
      rightIcon={ClearButton}
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;
