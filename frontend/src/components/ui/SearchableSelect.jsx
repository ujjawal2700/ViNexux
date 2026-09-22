import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * SearchableSelect - a single-value dropdown with an in-panel search box to
 * filter long option lists (e.g. India's states/cities). Native <select>
 * doesn't support a visible search field, hence this.
 */
export const SearchableSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No matches found.',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Focus the search box as soon as the panel opens
      const id = requestAnimationFrame(() => searchInputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setQuery('');
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    } else if (e.key === 'Enter' && filteredOptions.length > 0) {
      e.preventDefault();
      handleSelect(filteredOptions[0]);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'w-full bg-white border border-gray-300 rounded px-3.5 py-2.5 text-xs sm:text-sm text-left outline-none transition-all font-medium flex items-center justify-between gap-2 h-[42px] disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer',
          isOpen && 'border-primary ring-1 ring-primary',
          value ? 'text-gray-900' : 'text-gray-400',
          className
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className={cn('w-4 h-4 text-gray-500 shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          <div className="relative p-2 border-b border-gray-100 bg-gray-50">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-4.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-white border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded pl-8 pr-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-gray-400 text-center">{emptyMessage}</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'w-full text-left px-3.5 py-2 text-xs sm:text-sm font-medium flex items-center justify-between gap-2 transition-colors hover:bg-gray-50 cursor-pointer',
                    option === value ? 'text-primary font-bold bg-primary/5' : 'text-gray-700'
                  )}
                >
                  <span className="truncate">{option}</span>
                  {option === value && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
