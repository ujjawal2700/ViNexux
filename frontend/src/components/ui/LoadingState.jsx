import React from 'react';
import { LoadingPill } from './GlobalRequestLoader';

export const LoadingState = ({ message = 'Loading content...', className = '' }) => {
  return (
    <div className={`flex items-center justify-center p-12 text-center ${className}`}>
      <LoadingPill message={message} />
    </div>
  );
};

export default LoadingState;
