import React from 'react';
import {
  Monitor,
  Laptop,
  HardDrive,
  Tv,
  Keyboard,
  Printer,
  ShieldCheck,
  Video,
  Network,
  Wifi,
  Code2,
  Smartphone,
  Cable,
  Plug,
  Sliders,
  PhoneCall,
  Camera,
  Layers,
  Radio,
  Server,
} from 'lucide-react';

/**
 * Returns tailored icon component and vibrant color classes for all 14 parent & sub categories
 */
export const getCategoryIconMeta = (categoryName = '') => {
  const name = String(categoryName).toLowerCase().trim();

  // 1. Desktop
  if (name.includes('desktop') || name.includes('all-in-one') || name.includes('workstation') || name.includes('pc tower')) {
    return {
      Icon: Monitor,
      bgColor: 'bg-blue-500/15 dark:bg-blue-500/25',
      borderColor: 'border-blue-500/30 dark:border-blue-500/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
      badgeBg: 'bg-blue-500 text-white',
    };
  }

  // 2. Laptop
  if (name.includes('laptop') || name.includes('notebook') || name.includes('ultrabook') || name.includes('macbook')) {
    return {
      Icon: Laptop,
      bgColor: 'bg-cyan-500/15 dark:bg-cyan-500/25',
      borderColor: 'border-cyan-500/30 dark:border-cyan-500/40',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      badgeBg: 'bg-cyan-500 text-white',
    };
  }

  // 3. Storage
  if (name.includes('storage') || name.includes('ssd') || name.includes('hdd') || name.includes('hard drive') || name.includes('nvme')) {
    return {
      Icon: HardDrive,
      bgColor: 'bg-emerald-500/15 dark:bg-emerald-500/25',
      borderColor: 'border-emerald-500/30 dark:border-emerald-500/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-500 text-white',
    };
  }

  // 4. Display
  if (name.includes('display') || name.includes('monitor') || name.includes('screen') || name.includes('projector') || name.includes('led display')) {
    return {
      Icon: Tv,
      bgColor: 'bg-purple-500/15 dark:bg-purple-500/25',
      borderColor: 'border-purple-500/30 dark:border-purple-500/40',
      iconColor: 'text-purple-600 dark:text-purple-400',
      badgeBg: 'bg-purple-500 text-white',
    };
  }

  // 5. Peripherals
  if (name.includes('peripheral') || name.includes('keyboard') || name.includes('mouse') || name.includes('headset') || name.includes('webcam')) {
    return {
      Icon: Keyboard,
      bgColor: 'bg-amber-500/15 dark:bg-amber-500/25',
      borderColor: 'border-amber-500/30 dark:border-amber-500/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-500 text-white',
    };
  }

  // 6. Printers & Scanners
  if (name.includes('printer') || name.includes('scanner') || name.includes('barcode') || name.includes('pos printer')) {
    return {
      Icon: Printer,
      bgColor: 'bg-orange-500/15 dark:bg-orange-500/25',
      borderColor: 'border-orange-500/30 dark:border-orange-500/40',
      iconColor: 'text-orange-600 dark:text-orange-400',
      badgeBg: 'bg-orange-500 text-white',
    };
  }

  // 7. Security (CCTV, Surveillance, Cameras, Biometrics)
  if (
    name.includes('security') ||
    name.includes('cctv') ||
    name.includes('surveillance') ||
    name.includes('dahua') ||
    name.includes('hikvision') ||
    name.includes('cp plus') ||
    name.includes('dome') ||
    name.includes('bullet') ||
    name.includes('camera')
  ) {
    return {
      Icon: ShieldCheck,
      bgColor: 'bg-rose-500/15 dark:bg-rose-500/25',
      borderColor: 'border-rose-500/30 dark:border-rose-500/40',
      iconColor: 'text-rose-600 dark:text-rose-400',
      badgeBg: 'bg-rose-500 text-white',
    };
  }

  // 8. Networking (Routers, Switches, Access Points, Firewalls)
  if (
    name.includes('networking') ||
    name.includes('router') ||
    name.includes('switch') ||
    name.includes('poe') ||
    name.includes('wifi') ||
    name.includes('wi-fi') ||
    name.includes('access point') ||
    name.includes('ethernet')
  ) {
    return {
      Icon: Network,
      bgColor: 'bg-indigo-500/15 dark:bg-indigo-500/25',
      borderColor: 'border-indigo-500/30 dark:border-indigo-500/40',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      badgeBg: 'bg-indigo-500 text-white',
    };
  }

  // 9. Software
  if (name.includes('software') || name.includes('antivirus') || name.includes('os') || name.includes('windows') || name.includes('license')) {
    return {
      Icon: Code2,
      bgColor: 'bg-teal-500/15 dark:bg-teal-500/25',
      borderColor: 'border-teal-500/30 dark:border-teal-500/40',
      iconColor: 'text-teal-600 dark:text-teal-400',
      badgeBg: 'bg-teal-500 text-white',
    };
  }

  // 10. Mobility
  if (name.includes('mobility') || name.includes('mobile') || name.includes('phone') || name.includes('tablet') || name.includes('cellular')) {
    return {
      Icon: Smartphone,
      bgColor: 'bg-sky-500/15 dark:bg-sky-500/25',
      borderColor: 'border-sky-500/30 dark:border-sky-500/40',
      iconColor: 'text-sky-600 dark:text-sky-400',
      badgeBg: 'bg-sky-500 text-white',
    };
  }

  // 11. Cables
  if (name.includes('cable') || name.includes('hdmi') || name.includes('cat6') || name.includes('patch cord') || name.includes('fiber')) {
    return {
      Icon: Cable,
      bgColor: 'bg-yellow-500/15 dark:bg-yellow-500/25',
      borderColor: 'border-yellow-500/30 dark:border-yellow-500/40',
      iconColor: 'text-yellow-600 dark:text-yellow-500',
      badgeBg: 'bg-yellow-500 text-white',
    };
  }

  // 12. Connector & Converter
  if (name.includes('connector') || name.includes('converter') || name.includes('adapter') || name.includes('splitter')) {
    return {
      Icon: Plug,
      bgColor: 'bg-violet-500/15 dark:bg-violet-500/25',
      borderColor: 'border-violet-500/30 dark:border-violet-500/40',
      iconColor: 'text-violet-600 dark:text-violet-400',
      badgeBg: 'bg-violet-500 text-white',
    };
  }

  // 13. Accessories CCTV & Networking
  if (name.includes('accessories') || name.includes('bracket') || name.includes('rack') || name.includes('enclosure') || name.includes('power supply')) {
    return {
      Icon: Sliders,
      bgColor: 'bg-pink-500/15 dark:bg-pink-500/25',
      borderColor: 'border-pink-500/30 dark:border-pink-500/40',
      iconColor: 'text-pink-600 dark:text-pink-400',
      badgeBg: 'bg-pink-500 text-white',
    };
  }

  // 14. Telecom
  if (name.includes('telecom') || name.includes('intercom') || name.includes('voip') || name.includes('epabx') || name.includes('telephone')) {
    return {
      Icon: PhoneCall,
      bgColor: 'bg-rose-600/15 dark:bg-rose-600/25',
      borderColor: 'border-rose-600/30 dark:border-rose-600/40',
      iconColor: 'text-rose-700 dark:text-rose-400',
      badgeBg: 'bg-rose-600 text-white',
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

  const name = String(categoryName).toLowerCase().trim();

  // Desktop
  if (name.includes('desktop') || name.includes('all-in-one') || name.includes('workstation')) {
    return 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=600&auto=format&fit=crop&q=80';
  }

  // Laptop
  if (name.includes('laptop') || name.includes('notebook')) {
    return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80';
  }

  // Storage
  if (name.includes('storage') || name.includes('ssd') || name.includes('hdd')) {
    return 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&auto=format&fit=crop&q=80';
  }

  // Display
  if (name.includes('display') || name.includes('monitor')) {
    return 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80';
  }

  // Peripherals
  if (name.includes('peripheral') || name.includes('keyboard') || name.includes('mouse')) {
    return 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80';
  }

  // Printers & Scanners
  if (name.includes('printer') || name.includes('scanner')) {
    return 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600&auto=format&fit=crop&q=80';
  }

  // Security / CCTV
  if (name.includes('security') || name.includes('cctv') || name.includes('camera') || name.includes('surveillance')) {
    return 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&auto=format&fit=crop&q=80';
  }

  // Networking
  if (name.includes('networking') || name.includes('router') || name.includes('switch')) {
    return 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80';
  }

  // Software
  if (name.includes('software')) {
    return 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80';
  }

  // Mobility
  if (name.includes('mobility') || name.includes('mobile')) {
    return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80';
  }

  // Cables
  if (name.includes('cable') || name.includes('hdmi')) {
    return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';
  }

  // Connector & Converter
  if (name.includes('connector') || name.includes('converter') || name.includes('adapter')) {
    return 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80';
  }

  // Accessories CCTV & Networking
  if (name.includes('accessories')) {
    return 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80';
  }

  // Telecom
  if (name.includes('telecom') || name.includes('telephone') || name.includes('intercom')) {
    return 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=600&auto=format&fit=crop&q=80';
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
