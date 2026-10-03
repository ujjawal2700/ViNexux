import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Image } from '../ui/Image';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const CategorySlider = ({ categories = [] }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Strictly filter to Header/Root categories (no parentId)
  const headerCategories = (categories || []).filter((c) => !c.parentId);
  const tiles = headerCategories.map((category) => ({
    name: category.name,
    slug: category.slug,
    id: category._id,
    image: category.image,
  }));

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }
  }, []);

  const scrollManual = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 350);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, tiles.length]);

  if (!tiles.length) return null;

  return (
    <div className="relative storefront-container px-3 sm:px-6 lg:px-8 2xl:px-12 my-3 sm:my-5 overflow-hidden min-w-0 max-w-full group/slider">
      {/* Left Navigation Arrow */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollManual('left')}
          className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center text-gray-700 hover:text-primary hover:border-primary transition-all opacity-95 hover:opacity-100 cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Scroll categories left"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
        </button>
      )}

      {/* Single-row Sliding Categories Track (Slides right to left) */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex items-center gap-2.5 sm:gap-3.5 overflow-x-auto scrollbar-none py-2 sm:py-3 px-1 sm:px-6 min-w-0 max-w-full"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tiles.map((cat, idx) => (
          <Link
            key={cat.id || idx}
            to={`/${cat.slug}`}
            className="flex flex-col items-center justify-between p-2.5 sm:p-3 bg-white border border-gray-200 rounded-lg sm:rounded-xl hover:border-[#800020] hover:shadow-md transition-all duration-200 text-center select-none group shrink-0 w-[110px] sm:w-[130px] md:w-[145px] h-[120px] sm:h-[135px] md:h-[150px]"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center overflow-hidden mb-1 sm:mb-1.5 shrink-0">
              <Image
                src={cat.image}
                alt={cat.name}
                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <span className="w-full text-center text-[11px] sm:text-xs md:text-sm font-bold text-[#800020] group-hover:text-[#66001a] leading-tight line-clamp-1 transition-colors">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>

      {/* Right Navigation Arrow */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollManual('right')}
          className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center text-gray-700 hover:text-primary hover:border-primary transition-all opacity-95 hover:opacity-100 cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Scroll categories right"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
};

export default CategorySlider;
