import React from 'react';

export const Skeleton = ({ className = '', height = '', width = '' }) => {
  return (
    <div
      className={`bg-[#f4e7ea] rounded-lg animate-pulse ${height} ${width} ${className}`}
    />
  );
};

export const SkeletonCard = ({ className = '' }) => (
  <div className={`p-6 rounded-2xl bg-white border border-[#e5d1d4] space-y-4 ${className}`}>
    <Skeleton className="h-5 w-1/3" />
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-24 w-full" />
    <div className="flex items-center justify-between pt-2">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4, className = '' }) => (
  <div className={`w-full overflow-hidden rounded-2xl border border-[#e5d1d4] bg-white p-4 space-y-4 ${className}`}>
    <div className="flex gap-4 pb-2 border-b border-[#e5d1d4]">
      {Array.from({ length: cols }).map((_, c) => (
        <Skeleton key={c} className="h-4 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4 items-center">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-5 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export default Skeleton;
