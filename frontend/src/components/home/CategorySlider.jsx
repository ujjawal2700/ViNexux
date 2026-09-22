import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DEFAULT_CATEGORY_TILES = [
  {
    name: 'Desktop',
    slug: 'desktop',
    image: 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Laptop',
    slug: 'laptop',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Storage',
    slug: 'storage',
    image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Display',
    slug: 'display',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Peripherals',
    slug: 'peripherals',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Printers & Scanners',
    slug: 'printers-scanners',
    image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Security',
    slug: 'cctv-cameras',
    image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Networking',
    slug: 'routers-networking',
    image: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Software',
    slug: 'software',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Mobility',
    slug: 'mobility',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Cables',
    slug: 'cables',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Connector & Converter',
    slug: 'connector-converter',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Accessories CCTV & Networking',
    slug: 'accessories-cctv',
    image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Telecom',
    slug: 'telecom',
    image: 'https://images.unsplash.com/photo-1520923642038-b4259aceffd7?auto=format&fit=crop&w=300&q=80',
  },
];

export const CategorySlider = ({ categories = [] }) => {
  const scrollRef = useRef(null);

  // Merge dynamic categories if present with default tiles
  const tiles = categories.length > 0
    ? categories.map((cat, i) => ({
        name: cat.name,
        slug: cat.slug || cat._id,
        id: cat._id,
        image: cat.image || DEFAULT_CATEGORY_TILES[i % DEFAULT_CATEGORY_TILES.length].image,
      }))
    : DEFAULT_CATEGORY_TILES;

  const scrollManual = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="relative w-full px-2 sm:px-4 lg:px-8 max-w-[1920px] mx-auto my-2">
      {/* Left Navigation Arrow */}
      <button
        type="button"
        onClick={() => scrollManual('left')}
        className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center text-gray-700 hover:text-primary hover:border-primary transition-all opacity-90 hover:opacity-100 cursor-pointer"
        aria-label="Scroll categories left"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* Horizontal Category Cards Track (Static, non-moving) */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto scrollbar-none py-4 px-8 sm:px-10"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tiles.map((cat, idx) => (
          <div key={idx} className="relative group shrink-0">
            <Link
              to={cat.id ? `/products?categoryId=${cat.id}` : `/products?search=${encodeURIComponent(cat.name)}`}
              className="flex flex-col items-center justify-between w-24 sm:w-28 md:w-32 h-28 sm:h-32 md:h-36 p-2.5 sm:p-3 bg-white border border-gray-200 rounded-lg transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary hover:shadow-[0_8px_24px_rgba(128,0,32,0.14)] text-center select-none"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center overflow-hidden mb-1">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-gray-800 leading-tight transition-colors duration-300 group-hover:text-primary line-clamp-1">
                {cat.name}
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
        aria-label="Scroll categories right"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  );
};

export default CategorySlider;
