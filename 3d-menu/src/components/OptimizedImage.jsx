import React, { useState, useEffect } from 'react';
import { resolveMediaUrl } from '../lib/mediaStorageService';

/**
 * High-Performance Optimized Image Component.
 * Features:
 * - Native lazy loading (`loading="lazy"`)
 * - Asynchronous image decoding (`decoding="async"`)
 * - Smooth skeleton shimmer placeholder while loading
 * - Fallback error handling (swaps broken images with default food asset)
 * - Automatic CDN URL resolution
 */
export default function OptimizedImage({
  src,
  alt = 'Food Item',
  className = '',
  fallbackSrc = '/Food.gif',
  style = {},
  priority = false, // Set to true for hero dish above the fold
  ...rest
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const resolvedSrc = resolveMediaUrl(hasError ? fallbackSrc : src, fallbackSrc);

  // Reset load state when source changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ ...style }}>
      {/* Shimmer skeleton until image loads */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-neutral-800/40 animate-pulse flex items-center justify-center">
          <span className="w-5 h-5 border-2 border-orange-500/40 border-t-orange-500 rounded-full animate-spin" />
        </div>
      )}

      <img
        src={resolvedSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (!hasError) {
            setHasError(true);
            setIsLoaded(true);
          }
        }}
        className={`w-full h-full object-contain transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...rest}
      />
    </div>
  );
}
