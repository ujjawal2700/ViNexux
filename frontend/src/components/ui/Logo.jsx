import React from 'react';
import useTheme from '../../hooks/useTheme';

/**
 * Vi Nexus logo - swaps between the black-ink (light bg) and white-ink
 * (dark bg) variants based on the active theme, so it never disappears
 * against the surface it's sitting on.
 */
const Logo = ({ className = 'w-9 h-auto', alt = 'Vi Nexus', forceDark = false }) => {
  const { isDark } = useTheme();
  const src = forceDark || isDark ? '/logo-dark.png' : '/logo.png';
  return <img src={src} alt={alt} className={className} />;
};

export default Logo;
