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
          'w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-left outline-none transition-all font-semibold flex items-center justify-between gap-2 h-[42px] hover:border-[#800020] disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer shadow-2xs',
          isOpen && 'border-[#800020] ring-2 ring-[#800020]/20',
          value ? 'text-gray-900' : 'text-gray-400',
          className
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className={cn('w-4 h-4 text-[#800020] shrink-0 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-[#800020]/25 rounded-2xl shadow-xl overflow-hidden p-1.5">
          <div className="relative p-2 border-b border-gray-100 bg-[#fdfbfb] rounded-t-xl mb-1">
            <Search className="w-3.5 h-3.5 text-[#800020] absolute left-4.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-white border border-gray-200 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-gray-400 text-center font-medium">{emptyMessage}</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer select-none',
                    option === value
                      ? 'bg-[#800020] text-white font-bold shadow-xs'
                      : 'text-gray-800 hover:bg-[#800020]/10 hover:text-[#800020]'
                  )}
                >
                  <span className="truncate">{option}</span>
                  {option === value && <Check className="w-4 h-4 text-white shrink-0 ml-2" />}
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
