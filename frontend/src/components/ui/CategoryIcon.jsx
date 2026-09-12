import React from 'react';
import {
  Camera,
  Video,
  Wifi,
  Radio,
  Cpu,
  Server,
  Film,
  Aperture,
  Navigation,
  ShieldCheck,
  HardDrive,
  Network,
  Layers,
  Disc,
  Eye,
  Signal,
} from 'lucide-react';

/**
 * Returns tailored icon component and vibrant color classes for category names
 */
export const getCategoryIconMeta = (categoryName = '') => {
  const name = String(categoryName).toLowerCase();

  // 1. CCTV & Security Cameras (Dahua, Hikvision, Surveillance)
  if (
    name.includes('cctv') ||
    name.includes('surveillance') ||
    name.includes('security') ||
    name.includes('dahua') ||
    name.includes('hikvision') ||
    name.includes('dome') ||
    name.includes('bullet') ||
    name.includes('cp plus')
  ) {
    return {
      Icon: Video,
      bgColor: 'bg-rose-500/15 dark:bg-rose-500/25',
      borderColor: 'border-rose-500/30 dark:border-rose-500/40',
      iconColor: 'text-rose-600 dark:text-rose-400',
      badgeBg: 'bg-rose-500 text-white',
    };
  }

  // 2. Wi-Fi Routers & Wireless Networking
  if (
    name.includes('router') ||
    name.includes('wifi') ||
    name.includes('wi-fi') ||
    name.includes('wireless') ||
    name.includes('access point')
  ) {
    return {
      Icon: Wifi,
      bgColor: 'bg-indigo-500/15 dark:bg-indigo-500/25',
      borderColor: 'border-indigo-500/30 dark:border-indigo-500/40',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      badgeBg: 'bg-indigo-500 text-white',
    };
  }

  // 3. Switches, Modems & Enterprise Hardware
  if (
    name.includes('switch') ||
    name.includes('modem') ||
    name.includes('poe') ||
    name.includes('network') ||
    name.includes('server') ||
    name.includes('hardware')
  ) {
    return {
      Icon: Server,
      bgColor: 'bg-emerald-500/15 dark:bg-emerald-500/25',
      borderColor: 'border-emerald-500/30 dark:border-emerald-500/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-500 text-white',
    };
  }

  // 4. Video & Photo Shooting Cameras (DSLR, Canon, Nikon, Cinema)
  if (
    name.includes('dslr') ||
    name.includes('canon') ||
    name.includes('nikon') ||
    name.includes('sony') ||
    name.includes('shooting') ||
    name.includes('mirrorless') ||
    name.includes('photo') ||
    name.includes('film') ||
    name.includes('lens')
  ) {
    return {
      Icon: Camera,
      bgColor: 'bg-amber-500/15 dark:bg-amber-500/25',
      borderColor: 'border-amber-500/30 dark:border-amber-500/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-500 text-white',
    };
  }

  // 5. Drones & Aerial Hardware
  if (name.includes('drone') || name.includes('quadcopter') || name.includes('aerial')) {
    return {
      Icon: Navigation,
      bgColor: 'bg-purple-500/15 dark:bg-purple-500/25',
      borderColor: 'border-purple-500/30 dark:border-purple-500/40',
      iconColor: 'text-purple-600 dark:text-purple-400',
      badgeBg: 'bg-purple-500 text-white',
    };
  }

  // Fallback Default
  return {
    Icon: Layers,
    bgColor: 'bg-primary/15 dark:bg-primary/25',
    borderColor: 'border-primary/30 dark:border-primary/40',
    iconColor: 'text-primary dark:text-primary-foreground',
    badgeBg: 'bg-primary text-white',
  };
};

/**
 * Returns tailored product image fallback for category cards
 */
export const getCategoryProductImage = (categoryName = '', databaseImage = '') => {
  if (databaseImage && typeof databaseImage === 'string' && databaseImage.startsWith('http')) {
    return databaseImage;
  }

  const name = String(categoryName).toLowerCase();

  // 1. CCTV Cameras & Security Systems
  if (
    name.includes('cctv') ||
    name.includes('surveillance') ||
    name.includes('security') ||
    name.includes('dahua') ||
    name.includes('hikvision') ||
    name.includes('cp plus') ||
    name.includes('dome') ||
    name.includes('bullet')
  ) {
    return 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&auto=format&fit=crop&q=80';
  }

  // 2. Wi-Fi Routers & Wireless Networking
  if (
    name.includes('router') ||
    name.includes('wifi') ||
    name.includes('wi-fi') ||
    name.includes('wireless') ||
    name.includes('access point')
  ) {
    return 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80';
  }

  // 3. Switches, Modems & Enterprise Hardware
  if (
    name.includes('switch') ||
    name.includes('modem') ||
    name.includes('poe') ||
    name.includes('network') ||
    name.includes('server') ||
    name.includes('hardware')
  ) {
    return 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80';
  }

  // 4. Video & Photo Shooting Cameras (DSLR, Canon, Nikon, Sony)
  if (
    name.includes('dslr') ||
    name.includes('canon') ||
    name.includes('nikon') ||
    name.includes('sony') ||
    name.includes('shooting') ||
    name.includes('mirrorless') ||
    name.includes('photo') ||
    name.includes('film') ||
    name.includes('camera')
  ) {
    return 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80';
  }

  // 5. Drones & Aerial Hardware
  if (name.includes('drone') || name.includes('quadcopter') || name.includes('aerial')) {
    return 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=600&auto=format&fit=crop&q=80';
  }

  // Fallback default image
  return 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&auto=format&fit=crop&q=80';
};

export const CategoryIcon = ({
  name = '',
  className = 'w-6 h-6',
  containerClassName = 'w-12 h-12',
}) => {
  const { Icon, bgColor, borderColor, iconColor } = getCategoryIconMeta(name);

  return (
    <div
      className={`${containerClassName} rounded-2xl ${bgColor} border ${borderColor} flex items-center justify-center ${iconColor} transition-all duration-300 group-hover:scale-110 shadow-xs shrink-0`}
    >
      <Icon className={className} />
    </div>
  );
};

export default CategoryIcon;
