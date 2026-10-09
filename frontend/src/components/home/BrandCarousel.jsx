import useCatalogBrands from '../../hooks/useCatalogBrands';
import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildBrandUrl } from '../../utils/categoryUrls';
import { BrandCarouselSkeleton } from '../ui/Skeleton';

/**
 * Authentic brand logo renderer with custom SVG icons, typographic styling,
 * and exact color palettes matching Mega Jaipur reference design.
 */
const BrandLogo = ({ brand }) => {
  const { name } = brand;
  if (brand.logo?.url) return <img loading="lazy" decoding="async" src={brand.logo.url} alt={name} className="max-h-full max-w-full object-contain" />;

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



export const BrandCarousel = () => {
  const { brands, loading, error, reload } = useCatalogBrands();
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  // Deduplicate brands so each brand appears exactly once in the base set
  const uniqueBrands = React.useMemo(() => {
    const seen = new Set();
    return brands.filter((brand) => {
      const key = (brand.name || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [brands]);

  // Create an infinite loop track by repeating uniqueBrands so there are enough items
  // to comfortably exceed any screen width (> 2500px), split into two identical halves.
  const displayBrands = React.useMemo(() => {
    if (!uniqueBrands.length) return [];
    let base = [...uniqueBrands];
    while (base.length < 12) {
      base = [...base, ...uniqueBrands];
    }
    // Duplicate the base set to form two identical halves for a seamless loop
    return [...base, ...base];
  }, [uniqueBrands]);

  // Smooth continuous right-to-left marquee auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !displayBrands.length) return;

    let animId;

    const step = () => {
      if (!isPaused && el) {
        // Increment scroll position (items move from right to left)
        el.scrollLeft += 0.75;

        // When we have scrolled past exactly half the track, wrap back seamlessly
        const halfScroll = el.scrollWidth / 2;
        if (el.scrollLeft >= halfScroll) {
          el.scrollLeft -= halfScroll;
        }
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isPaused, displayBrands]);

  const scrollManual = (direction) => {
    const el = scrollRef.current;
    if (el) {
      const scrollAmount = 300;
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(() => {
        if (!el) return;
        const halfScroll = el.scrollWidth / 2;
        if (el.scrollLeft >= halfScroll) {
          el.scrollLeft -= halfScroll;
        } else if (el.scrollLeft <= 0) {
          el.scrollLeft += halfScroll;
        }
      }, 350);
    }
  };

  if (loading) return <BrandCarouselSkeleton />;
  if (error) return <button className="px-6 py-3" onClick={reload}>{error} Retry</button>;
  if (!uniqueBrands.length) return null;

  return (
    <div
      className="relative storefront-container px-3 sm:px-6 lg:px-8 2xl:px-12 my-3 overflow-hidden min-w-0 max-w-full group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Left Navigation Arrow */}
      <button
        type="button"
        onClick={() => scrollManual('left')}
        className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[var(--store-surface)] border border-[var(--store-border)] shadow-md flex items-center justify-center text-[var(--store-muted)] hover:text-primary hover:border-primary transition-all opacity-85 hover:opacity-100 cursor-pointer"
        aria-label="Scroll brands left"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* Brands Track (Clean SQUARE shape cards) */}
      <div
        ref={scrollRef}
        className="brand-carousel-track flex items-center overflow-x-auto scrollbar-none py-3 sm:py-4 min-w-0 max-w-full"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayBrands.map((brand, index) => (
          <div key={`${brand._id || brand.slug || brand.name}-${index}`} className="brand-carousel-item relative group/brand shrink-0">
            <Link
              to={buildBrandUrl(brand.name)}
              className="flex flex-col items-center justify-center w-full aspect-square p-3 bg-[var(--store-surface)] border border-[var(--store-border)] rounded-lg transition-all duration-200 ease-out hover:border-[var(--store-primary)] hover:shadow-md select-none relative"
            >
              {/* Brand Logo Display */}
              <div className="flex items-center justify-center w-full h-full p-1 transition-transform duration-200 group-hover/brand:scale-105">
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
        className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[var(--store-surface)] border border-[var(--store-border)] shadow-md flex items-center justify-center text-[var(--store-muted)] hover:text-primary hover:border-primary transition-all opacity-85 hover:opacity-100 cursor-pointer"
        aria-label="Scroll brands right"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  );
};

export default BrandCarousel;
