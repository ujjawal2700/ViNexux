import React from 'react';
import SearchInput from '../ui/SearchInput';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { RotateCcw } from 'lucide-react';

const FilterBar = ({
  search,
  onSearchChange,
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
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {onSearchChange && (
          <div className="flex-1 min-w-[240px]">
            <SearchInput
              value={search || ''}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          </div>
        )}

        {/* Custom Filter Dropdowns */}
        {filters.map((filter, idx) => (
          <div key={idx} className="w-full lg:w-48">
            <Select
              value={filter.value || ''}
              onChange={(e) => filter.onChange(e.target.value)}
              options={filter.options}
            />
          </div>
        ))}

        {/* Sort Select */}
        {sortOptions.length > 0 && onSortChange && (
          <div className="w-full lg:w-52 flex items-center gap-2">
            <Select
              value={sortBy || ''}
              onChange={(e) => onSortChange(e.target.value, sortOrder)}
              options={sortOptions}
            />
            <button
              onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              className="px-2.5 py-2 rounded-lg bg-muted border border-border text-xs font-semibold text-foreground hover:bg-[#ebd5da] transition-colors"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
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
