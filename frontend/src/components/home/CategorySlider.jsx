import { Image } from '../ui/Image';
import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const CategorySlider = ({ categories = [] }) => {
  const scrollRef = useRef(null);

  // Strictly filter to Header/Root categories (no parentId)
  const headerCategories = (categories || []).filter((c) => !c.parentId);
  const tiles = headerCategories.map((category) => ({
    name: category.name, slug: category.slug, id: category._id, image: category.image,
  }));

  const scrollManual = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!tiles.length) return null;
  return (
    <div className="relative w-full px-3 sm:px-6 lg:px-8 2xl:px-12 my-2">
      {/* Left Navigation Arrow */}
      <button
        type="button"
        onClick={() => scrollManual('left')}
        className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center text-gray-700 hover:text-[#800020] hover:border-[#800020] transition-all opacity-90 hover:opacity-100 cursor-pointer"
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
              to={`/${cat.slug}`}
              className="flex flex-col items-center justify-between w-24 sm:w-28 md:w-32 h-28 sm:h-32 md:h-36 p-2.5 sm:p-3 bg-white border border-gray-200 rounded-lg transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[#800020] hover:shadow-[0_8px_24px_rgba(128,0,32,0.14)] text-center select-none"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center overflow-hidden mb-1">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-gray-800 leading-tight transition-colors duration-300 group-hover:text-[#800020] line-clamp-1">
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
