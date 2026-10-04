import React from 'react';

// Shown while a lazily loaded route chunk downloads.
export const RouteFallback = () => (
  <div role="status" aria-label="Loading page" className="flex w-full flex-1 items-center justify-center py-24">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#800020]/20 border-t-[#800020]" />
  </div>
);

export default RouteFallback;
