import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildBrandUrl } from '../../utils/categoryUrls';

/**
 * Authentic brand logo renderer with custom SVG icons, typographic styling,
 * and exact color palettes matching Mega Jaipur reference design.
 */
const BrandLogo = ({ brand }) => {
  const { name } = brand;

  switch (name) {
    case 'XPG':
      return (
        <span className="text-xl sm:text-2xl font-black italic tracking-tighter text-[#ed1c24] font-sans">
          XPG
        </span>
      );

    case 'ZEBRONICS':
      return (
        <div className="flex items-center gap-1">
          {/* Zebronics iconic zebra-dots mark */}
          <div className="flex flex-col gap-0.5 shrink-0">
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#111]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#111]" />
            </div>
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#111]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#111]" />
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-black tracking-widest text-[#111] uppercase font-sans">
            ZEBRONICS
          </span>
        </div>
      );

    case 'ZOTAC':
      return (
        <div className="flex items-center text-sm sm:text-base font-black tracking-wider text-[#222]">
          <span>Z</span>
          <span className="text-[#ff6200]">O</span>
          <span>TAC</span>
        </div>
      );

    case 'PRAMA':
      return (
        <div className="flex items-center gap-0.5">
          <span className="text-sm sm:text-base font-black tracking-tight text-[#005baa]">
            PRAMA
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a00] -mt-2" />
        </div>
      );

    case 'AARVEX':
      return (
        <div className="flex items-center gap-1">
          <div className="flex flex-col gap-0.5">
            <span className="w-3 h-0.5 bg-[#4a5568]" />
            <span className="w-2 h-0.5 bg-[#4a5568]" />
            <span className="w-1 h-0.5 bg-[#4a5568]" />
          </div>
          <span className="text-xs sm:text-sm font-extrabold tracking-widest text-[#2d3748]">
            AARVEX
          </span>
        </div>
      );

    case 'acer':
      return (
        <span className="text-xl sm:text-2xl font-bold tracking-tighter text-[#83b81a] lowercase font-sans">
          acer
        </span>
      );

    case 'ADATA':
      return (
        <div className="flex items-center gap-1">
          {/* Hummingbird silhouette */}
          <svg className="w-4 h-4 text-[#ed1c24] shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          <span className="text-xs sm:text-sm font-black tracking-widest text-[#0054a6]">
            ADATA
          </span>
        </div>
      );

    case 'AOYi':
      return (
        <span className="text-base sm:text-lg font-black tracking-wider text-[#0083ca] font-sans">
          ΛCYi
        </span>
      );

    case 'Alite':
      return (
        <div className="flex items-center gap-0.5">
          <span className="text-base sm:text-lg font-black text-[#c52026]">▲</span>
          <span className="text-xs sm:text-sm font-black text-[#1a1a1a]">lite</span>
        </div>
      );

    case 'amazon':
      return (
        <div className="flex flex-col items-center leading-none">
          <span className="text-sm sm:text-base font-black tracking-tight text-[#111] lowercase font-sans">
            amazon
          </span>
          <span className="w-8 h-1 bg-[#ff9900] rounded-full -mt-0.5 transform -rotate-2" />
        </div>
      );

    case 'HP':
      return (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0096d6] flex items-center justify-center shadow-2xs">
          <span className="text-white text-base sm:text-lg font-black italic tracking-tighter transform -rotate-12">
            hp
          </span>
        </div>
      );

    case 'DELL':
      return (
        <div className="flex items-center text-sm sm:text-base font-black tracking-widest text-[#007db8] font-sans">
          <span>D</span>
          <span className="transform -rotate-12 inline-block">E</span>
          <span>LL</span>
        </div>
      );

    case 'ASUS':
      return (
        <div className="flex flex-col items-center">
          <span className="text-xs sm:text-sm font-black tracking-widest text-[#00539b] font-sans border-y border-[#00539b] px-1 py-0.5">
            ASUS
          </span>
        </div>
      );

    case 'LENOVO':
      return (
        <div className="bg-[#e2231a] px-2 py-0.5 rounded shadow-2xs">
          <span className="text-white text-[11px] sm:text-xs font-bold tracking-tight uppercase">
            Lenovo
          </span>
        </div>
      );

    case 'MSI':
      return (
        <span className="text-base sm:text-lg font-black tracking-tighter text-[#ed1c24] font-sans">
          msi
        </span>
      );

    case 'SAMSUNG':
      return (
        <span className="text-xs sm:text-sm font-black tracking-widest text-[#034ea2] font-sans uppercase">
          SAMSUNG
        </span>
      );

    case 'HIKVISION':
      return (
        <span className="text-xs sm:text-sm font-black tracking-wider text-[#d32f2f] uppercase">
          HIKVISION
        </span>
      );

    case 'CP PLUS':
      return (
        <span className="text-xs sm:text-sm font-black tracking-wide text-[#c62828] uppercase">
          CP PLUS
        </span>
      );

    case 'DAHUA':
      return (
        <span className="text-xs sm:text-sm font-black tracking-wider text-[#d9232d] lowercase">
          dahua
        </span>
      );

    case 'Western Digital':
      return (
        <div className="flex items-center gap-1 border border-[#005ca9] px-1.5 py-0.5 rounded">
          <span className="text-xs sm:text-sm font-black text-[#005ca9]">WD</span>
        </div>
      );

    case 'SEAGATE':
      return (
        <span className="text-xs sm:text-sm font-black tracking-wider text-[#68bc45]">
          SEAGATE
        </span>
      );

    case 'D-Link':
      return (
        <span className="text-xs sm:text-sm font-black tracking-wider text-[#0099cc]">
          D-Link
        </span>
      );

    case 'tp-link':
      return (
        <span className="text-xs sm:text-sm font-black tracking-wider text-[#19b1aa] lowercase">
          tp-link
        </span>
      );

    case 'Logitech':
      return (
        <span className="text-xs sm:text-sm font-black tracking-wide text-[#00b8fc] lowercase">
          logitech
        </span>
      );

    case 'Canon':
      return (
        <span className="text-sm sm:text-base font-black tracking-wide text-[#cc0000]">
          Canon
        </span>
      );

    case 'SONY':
      return (
        <span className="text-xs sm:text-sm font-black tracking-widest text-[#000000] uppercase font-serif">
          SONY
        </span>
      );

    case 'SanDisk':
      return (
        <span className="text-xs sm:text-sm font-black tracking-wide text-[#e31837]">
          SanDisk
        </span>
      );

    case 'CISCO':
      return (
        <span className="text-xs sm:text-sm font-black tracking-widest text-[#005073]">
          CISCO
        </span>
      );

    default:
      return (
        <span
          className="text-xs sm:text-sm font-black tracking-tight text-center truncate"
          style={{ color: brand.color || '#333' }}
        >
          {brand.logoText || brand.name}
        </span>
      );
  }
};

const BRAND_LIST = [
  { name: 'XPG', logoText: 'XPG', color: '#ed1c24' },
  { name: 'ZEBRONICS', logoText: 'ZEBRONICS', color: '#1a1a1a' },
  { name: 'ZOTAC', logoText: 'ZOTAC', color: '#ff6200' },
  { name: 'PRAMA', logoText: 'PRAMA', color: '#005baa' },
  { name: 'AARVEX', logoText: 'AARVEX', color: '#2d3748' },
  { name: 'acer', logoText: 'acer', color: '#83b81a' },
  { name: 'ADATA', logoText: 'ADATA', color: '#0054a6' },
  { name: 'AOYi', logoText: 'AOYi', color: '#0083ca' },
  { name: 'Alite', logoText: 'Alite', color: '#c52026' },
  { name: 'amazon', logoText: 'amazon', color: '#ff9900' },
  { name: 'HP', logoText: 'HP', color: '#0096d6' },
  { name: 'DELL', logoText: 'DELL', color: '#007db8' },
  { name: 'ASUS', logoText: 'ASUS', color: '#00539b' },
  { name: 'LENOVO', logoText: 'Lenovo', color: '#e2231a' },
  { name: 'MSI', logoText: 'msi', color: '#ed1c24' },
  { name: 'SAMSUNG', logoText: 'SAMSUNG', color: '#034ea2' },
  { name: 'HIKVISION', logoText: 'HIKVISION', color: '#d32f2f' },
  { name: 'CP PLUS', logoText: 'CP PLUS', color: '#c62828' },
  { name: 'DAHUA', logoText: 'dahua', color: '#d9232d' },
  { name: 'Western Digital', logoText: 'WD', color: '#005ca9' },
  { name: 'SEAGATE', logoText: 'SEAGATE', color: '#68bc45' },
  { name: 'D-Link', logoText: 'D-Link', color: '#0099cc' },
  { name: 'tp-link', logoText: 'tp-link', color: '#19b1aa' },
  { name: 'Logitech', logoText: 'logitech', color: '#00b8fc' },
  { name: 'Canon', logoText: 'Canon', color: '#cc0000' },
  { name: 'SONY', logoText: 'SONY', color: '#000000' },
  { name: 'SanDisk', logoText: 'SanDisk', color: '#e31837' },
  { name: 'CISCO', logoText: 'CISCO', color: '#005073' },
];

export const BrandCarousel = () => {
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-scroll continuously from right to left
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animId;
    const step = () => {
      if (!isPaused && el) {
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) {
          el.scrollLeft = 0;
        } else {
          el.scrollLeft += 1;
        }
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isPaused]);

  const scrollManual = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Double list for seamless continuous looping
  const displayBrands = [...BRAND_LIST, ...BRAND_LIST];

  return (
    <div
      className="relative w-full px-3 sm:px-6 lg:px-8 2xl:px-12 my-3"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Left Navigation Arrow */}
      <button
        type="button"
        onClick={() => scrollManual('left')}
        className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center text-gray-700 hover:text-primary hover:border-primary transition-all opacity-90 hover:opacity-100 cursor-pointer"
        aria-label="Scroll brands left"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* Brands Track (Clean SQUARE shape cards) */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2.5 sm:gap-3.5 overflow-x-auto scrollbar-none py-4 px-8 sm:px-10"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayBrands.map((brand, index) => (
          <div key={index} className="relative group shrink-0">
            <Link
              to={buildBrandUrl(brand.name)}
              className="flex flex-col items-center justify-center w-[84px] h-[84px] sm:w-[98px] sm:h-[98px] md:w-[110px] md:h-[110px] aspect-square p-2 bg-white border border-gray-200 rounded-lg transition-all duration-200 ease-out hover:border-[#800020] hover:shadow-md select-none relative group"
            >
              {/* Brand Logo Display */}
              <div className="flex items-center justify-center w-full h-full p-1 transition-transform duration-200 group-hover:scale-105">
                <BrandLogo brand={brand} />
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Right Navigation Arrow */}
      <button
        type="button"
        onClick={() => scrollManual('right')}
        className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center text-gray-700 hover:text-primary hover:border-primary transition-all opacity-90 hover:opacity-100 cursor-pointer"
        aria-label="Scroll brands right"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  );
};

export default BrandCarousel;
