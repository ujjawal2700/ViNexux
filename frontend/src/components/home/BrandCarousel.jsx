import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const BRAND_LIST = [
  { name: "dahua", logoText: "dahua", color: "#d9232d" },
  { name: "HIKVISION", logoText: "HIKVISION", color: "#d32f2f" },
  { name: "CP PLUS", logoText: "CP PLUS", color: "#c62828" },
  { name: "CISCO", logoText: "CISCO", color: "#005073" },
  { name: "tp-link", logoText: "tp-link", color: "#19b1aa" },
  { name: "Canon", logoText: "Canon", color: "#cc0000" },
  { name: "Nikon", logoText: "Nikon", color: "#ffdc00" },
  { name: "SONY", logoText: "SONY", color: "#000000" },
  { name: "Western Digital", logoText: "Western Digital", color: "#005ca9" },
  { name: "SEAGATE", logoText: "SEAGATE", color: "#68bc45" },
  { name: "D-Link", logoText: "D-Link", color: "#0099cc" },
  { name: "UBIQUITI", logoText: "UBIQUITI", color: "#0055ff" },
  { name: "NETGEAR", logoText: "NETGEAR", color: "#333333" },
  { name: "DIGITEK", logoText: "DIGITEK", color: "#ff6600" },
  { name: "BOSCH", logoText: "BOSCH", color: "#d9232d" },
  { name: "CASIO", logoText: "CASIO", color: "#00509d" },
  { name: "HONEYWELL", logoText: "HONEYWELL", color: "#ea2227" },
  { name: "Panasonic", logoText: "Panasonic", color: "#004098" },
  { name: "Trueview", logoText: "Trueview", color: "#e11d48" },
  { name: "CORSAIR", logoText: "CORSAIR", color: "#facc15" },
  { name: "ASUS", logoText: "ASUS", color: "#00539b" },
  { name: "DELL", logoText: "DELL", color: "#007db8" },
  { name: "HP", logoText: "HP", color: "#0096d6" },
  { name: "SAMSUNG", logoText: "SAMSUNG", color: "#034ea2" },
  { name: "SanDisk", logoText: "SanDisk", color: "#e31837" },
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

  // Double list for seamless looping
  const displayBrands = [...BRAND_LIST, ...BRAND_LIST];

  return (
    <div
      className="relative w-full px-2 sm:px-4 lg:px-8 max-w-[1920px] mx-auto my-3"
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

      {/* Brands Track (Auto-scrolls continuously from right to left) */}
      <div
        ref={scrollRef}
        className="flex items-center gap-3 sm:gap-4 overflow-x-auto scrollbar-none py-4 px-8 sm:px-10"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayBrands.map((brand, index) => (
          <div key={index} className="relative group shrink-0">
            <Link
              to={`/products?search=${encodeURIComponent(brand.name)}`}
              className="flex items-center justify-center w-26 sm:w-30 md:w-36 h-12 sm:h-14 p-2 bg-white border border-gray-200 rounded-lg transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary hover:shadow-[0_8px_24px_rgba(128,0,32,0.14)] select-none"
            >
              <span
                className="text-xs sm:text-sm font-black tracking-tight text-center truncate transition-transform duration-300 group-hover:scale-105"
                style={{ color: brand.color || '#333' }}
              >
                {brand.logoText}
              </span>
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
