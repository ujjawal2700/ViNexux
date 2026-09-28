import React from 'react';
import useTheme from '../../hooks/useTheme';
import useWebsiteSettings from '../../hooks/useWebsiteSettings';

/**
 * Vi Nexus logo - swaps between the black-ink (light bg) and white-ink
 * (dark bg) variants based on the active theme, so it never disappears
 * against the surface it's sitting on.
 */
const Logo = ({ className = 'w-9 h-auto', alt, forceDark = false }) => {
  const { isDark } = useTheme();
  const { settings } = useWebsiteSettings();
  const cmsLogo = settings.logo?.url;
  const src = cmsLogo || (forceDark || isDark ? '/logo-dark.png' : '/logo.png');
  return <img src={src} alt={alt || settings.websiteName || 'Website logo'} className={className} />;
};

export default Logo;
