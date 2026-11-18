import React from 'react';
import SearchInput from '../ui/SearchInput';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { RotateCcw } from 'lucide-react';

const FilterBar = ({
  search,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Search records...',
  filters = [],
  sortOptions = [],
  sortBy,
  sortOrder,
  onSortChange,
  onReset,
  children,
}) => {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:flex-wrap items-stretch lg:items-center gap-3">
        {onSearchChange && (
          <div className="min-w-0 flex-1 lg:min-w-[240px]">
            <SearchInput
              value={search || ''}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && onSearchSubmit) {
                  e.preventDefault();
                  onSearchSubmit();
                }
              }}
            />
          </div>
        )}

        {/* Custom Filter Dropdowns */}
        {filters.map((filter, idx) => (
          <div key={idx} className="min-w-0 w-full lg:w-48">
            <Select
              value={filter.value || ''}
              onChange={(e) => filter.onChange(e.target.value)}
              options={filter.options}
            />
          </div>
        ))}

        {/* Sort Select */}
        {sortOptions.length > 0 && onSortChange && (
          <div className="min-w-0 w-full lg:w-48">
            <Select
              value={sortBy || ''}
              onChange={(e) => onSortChange(e.target.value, sortOrder)}
              options={sortOptions}
            />
            
          </div>
        )}

        {children}

        {onReset && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="text-xs shrink-0 self-end lg:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
