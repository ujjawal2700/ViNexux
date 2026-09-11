import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import Skeleton from './Skeleton';

export const Image = ({
  src,
  alt = '',
  className = '',
  aspectRatio = 'aspect-auto',
  objectFit = 'object-cover',
  fallbackSrc = null,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className={`relative overflow-hidden rounded-xl bg-muted ${aspectRatio} ${className}`}>
      {isLoading && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}

      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-[#9a6870] p-4 text-center">
          <ImageOff className="w-6 h-6 mb-1 opacity-60" />
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">No Preview Available</span>
        </div>
      ) : (
        <img
          src={src || fallbackSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full ${objectFit} transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          {...props}
        />
      )}
    </div>
  );
};

export default Image;
