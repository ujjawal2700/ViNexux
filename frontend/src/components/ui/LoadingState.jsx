import React from 'react';
<<<<<<< HEAD
import { SkeletonCard } from './Skeleton';
=======
import { LoadingPill } from './GlobalRequestLoader';
>>>>>>> 934d1a4eab67a41edc8a69992a0070b627ee5747

export const LoadingState = ({ message = 'Loading content', className = '' }) => {
  return (
<<<<<<< HEAD
    <div role="status" aria-label={message} className={className}>
      <SkeletonCard />
=======
    <div className={`flex items-center justify-center p-12 text-center ${className}`}>
      <LoadingPill message={message} />
>>>>>>> 934d1a4eab67a41edc8a69992a0070b627ee5747
    </div>
  );
};

export default LoadingState;
