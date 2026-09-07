import React from 'react';
import Spinner from './Spinner';

export const LoadingState = ({ message = 'Loading content...', className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center space-y-3 ${className}`}>
      <Spinner size="lg" />
      <p className="text-xs font-semibold tracking-wide text-[#7c5c5f]">{message}</p>
    </div>
  );
};

export default LoadingState;
