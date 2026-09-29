import React from 'react';
import { SkeletonCard } from './Skeleton';

export const LoadingState = ({ message = 'Loading content', className = '' }) => {
  return (
    <div role="status" aria-label={message} className={className}>
      <SkeletonCard />
    </div>
  );
};

export default LoadingState;
