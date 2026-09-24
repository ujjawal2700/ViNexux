import React from 'react';
import Button from './Button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems,
  pageSize,
  onPageChange,
  showItemCount = true,
  className = '',
}) => {
  if (totalPages <= 1 && !totalItems) return null;

  const handlePrev = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  const handleFirst = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(1);
    }
  };

  const handleLast = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(totalPages);
    }
  };

  // Generate page numbers
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  const startItem = pageSize ? (currentPage - 1) * pageSize + 1 : null;
  const endItem = pageSize && totalItems ? Math.min(currentPage * pageSize, totalItems) : null;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 py-3 px-2 w-full ${className}`}>
      {/* Information text */}
      <div className="text-xs text-gray-500 font-medium">
        {totalItems !== undefined && startItem !== null && endItem !== null ? (
          <span>
            Showing <strong className="text-gray-900 font-semibold">{totalItems === 0 ? 0 : startItem}–{endItem}</strong> of{' '}
            <strong className="text-gray-900 font-semibold">{totalItems}</strong> items
            {totalPages > 1 && (
              <span className="text-gray-400 ml-1.5">
                (Page <strong className="text-gray-800">{currentPage}</strong> of <strong className="text-gray-800">{totalPages}</strong>)
              </span>
            )}
          </span>
        ) : (
          <span>
            Page <strong className="text-gray-900 font-semibold">{currentPage}</strong> of{' '}
            <strong className="text-gray-900 font-semibold">{totalPages}</strong>
          </span>
        )}
      </div>

      {/* Page Navigation Controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
          {totalPages > 4 && (
            <button
              type="button"
              onClick={handleFirst}
              disabled={currentPage <= 1}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-[#800020] disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs cursor-pointer"
              title="First Page"
              aria-label="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handlePrev}
            disabled={currentPage <= 1}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-[#800020] disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs cursor-pointer"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {pages.map((p, idx) =>
            p === '...' ? (
              <span key={`dots-${idx}`} className="px-1.5 text-xs text-gray-400 font-semibold select-none">
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange && onPageChange(p)}
                className={`min-w-7 h-7 sm:min-w-8 sm:h-8 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  currentPage === p
                    ? 'bg-[#800020] text-white shadow-xs font-bold border border-[#800020]'
                    : 'bg-white border border-gray-200 text-gray-700 hover:text-[#800020] hover:bg-[#fff9fa] hover:border-[#800020]/30'
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-[#800020] disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs cursor-pointer"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {totalPages > 4 && (
            <button
              type="button"
              onClick={handleLast}
              disabled={currentPage >= totalPages}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-[#800020] disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs cursor-pointer"
              title="Last Page"
              aria-label="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Pagination;
