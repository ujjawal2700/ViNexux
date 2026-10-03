import React from 'react';
import useTheme from '../../hooks/useTheme';
import useWebsiteSettings from '../../hooks/useWebsiteSettings';

/**
 * Dynamic Website Logo - Displays CMS uploaded logo with proper aspect ratio,
 * or falls back to themed bundle assets.
 */
const Logo = ({ className = 'h-10 w-auto max-w-[220px] object-contain', alt, forceDark = false }) => {
  const { isDark } = useTheme();
  const { settings } = useWebsiteSettings();
  const cmsLogo = settings.logo?.url;
  const fallbackSrc = forceDark || isDark ? '/logo-dark.png' : '/logo.png';
  const src = cmsLogo || fallbackSrc;

  return (
    <img
      src={src}
      alt={alt || settings.websiteName || 'Website logo'}
      className={className}
      onError={(e) => {
        if (e.currentTarget.src !== fallbackSrc) {
          e.currentTarget.src = fallbackSrc;
        }
      }}
    />
  );
};

export default Logo;
