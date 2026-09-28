import React from 'react';

export const Skeleton = ({ className = '', height = '', width = '', style }) => {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={`skeleton-shimmer bg-muted rounded-lg ${height} ${width} ${className}`}
    />
  );
};

export const SkeletonCard = ({ className = '' }) => (
  <div className={`p-6 rounded-2xl bg-card border border-border space-y-4 ${className}`}>
    <Skeleton className="h-5 w-1/3" />
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-24 w-full" />
    <div className="flex items-center justify-between pt-2">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  </div>
);

export const ProductCardSkeleton = ({ className = '' }) => (
  <div className={`overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs ${className}`}>
    <Skeleton className="aspect-[4/3] w-full rounded-none" />
    <div className="space-y-2.5 p-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex gap-1.5"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-20" /></div>
      <div className="flex items-center justify-between"><Skeleton className="h-6 w-24" /><Skeleton className="h-5 w-16" /></div>
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 border-t border-gray-100 pt-3"><Skeleton className="h-9 w-20" /><Skeleton className="h-9 flex-1" /></div>
    </div>
  </div>
);

export const FilterSidebarSkeleton = ({ className = '' }) => (
  <div className={`space-y-5 ${className}`} role="status" aria-label="Loading filters">
    <div className="flex items-center justify-between"><Skeleton className="h-5 w-20" /><Skeleton className="h-4 w-16" /></div>
    {[2, 4, 4, 3].map((rows, section) => (
      <div key={section} className="space-y-3 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-4 rounded-full" /></div>
        {Array.from({ length: rows }).map((_, row) => <div key={row} className="flex items-center gap-2"><Skeleton className="h-4 w-4" /><Skeleton className="h-4 flex-1" /></div>)}
      </div>
    ))}
  </div>
);

export const BrandCarouselSkeleton = ({ count = 10, className = '' }) => (
  <div className={`flex gap-3 overflow-hidden px-8 py-4 ${className}`} role="status" aria-label="Loading brands">
    {Array.from({ length: count }).map((_, index) => <Skeleton key={index} className="h-24 w-24 shrink-0 rounded-lg border border-gray-200" />)}
  </div>
);

export const BrandGridSkeleton = ({ count = 24, className = '' }) => (
  <div className={`w-full min-h-screen bg-gray-50/70 px-4 py-8 ${className}`} role="status" aria-label="Loading brand directory">
    <Skeleton className="mx-auto mb-8 h-12 max-w-xl" />
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9">
      {Array.from({ length: count }).map((_, index) => <Skeleton key={index} className="aspect-square w-full rounded-xl border border-gray-200" />)}
    </div>
  </div>
);

export const AppShellSkeleton = ({ className = '' }) => (
  <div className={`min-h-[70vh] bg-background ${className}`} role="status" aria-label="Loading application">
    <div className="mx-auto max-w-[1600px] space-y-6 p-6">
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-56 w-full" /><Skeleton className="h-40 w-full" /></div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:col-span-9 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />)}</div>
      </div>
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4, columns, className = '' }) => {
  const columnCount = columns || cols;
  return (
  <div className={`w-full overflow-hidden rounded-2xl border border-border bg-card p-4 space-y-4 ${className}`}>
    <div className="flex gap-4 pb-2 border-b border-border">
      {Array.from({ length: columnCount }).map((_, c) => (
        <Skeleton key={c} className="h-4 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4 items-center">
        {Array.from({ length: columnCount }).map((_, c) => (
          <Skeleton key={c} className="h-5 flex-1" />
        ))}
      </div>
    ))}
  </div>
  );
};

export default Skeleton;
