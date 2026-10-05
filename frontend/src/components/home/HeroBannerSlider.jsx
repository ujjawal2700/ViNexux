import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';



const HeroBannerSlider = ({ slides = [], autoPlayInterval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const autoPlayRef = useRef(null);

  const totalSlides = slides.length;

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Autoplay handler
  useEffect(() => {
    if (isHovered || totalSlides <= 1) return;

    autoPlayRef.current = setInterval(() => {
      goToNext();
    }, autoPlayInterval);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isHovered, totalSlides, autoPlayInterval, goToNext]);

  // Touch Swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const deltaX = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;
    if (Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  if (!totalSlides) return null;

  return (
    <div
      className="relative w-full overflow-hidden select-none bg-gray-100 group z-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-label="Homepage Banners Slider"
    >
      {/* Keep desktop artwork in its wide banner ratio, including TV and zoomed-out viewports. */}
      <div
        className="flex w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-[15/4] transition-transform duration-600 ease-out"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
        }}
      >
        {slides.map((slide, idx) => (
          <div
            key={slide.id || idx}
            className="w-full max-w-full shrink-0 h-full relative overflow-hidden"
          >
            <div className="block w-full h-full relative overflow-hidden select-none pointer-events-none">
              <img
                src={slide.image}
                alt={slide.title || 'Vinexus Banner'}
                className="w-full h-full object-cover object-top"
                loading={idx === 0 ? 'eager' : 'lazy'}
                draggable={false}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Navigation: Circular Arrow Buttons (only shown when there are multiple slides) */}
      {totalSlides > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              goToNext();
            }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/45 hover:bg-black/80 text-white flex items-center justify-center transition-all duration-200 shadow-xl backdrop-blur-xs cursor-pointer hover:scale-105 active:scale-95 border border-white/20 focus:outline-none opacity-0 group-hover:opacity-100"
            aria-label="Next banner"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              goToPrev();
            }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/45 hover:bg-black/80 text-white flex items-center justify-center transition-all duration-200 shadow-xl backdrop-blur-xs cursor-pointer hover:scale-105 active:scale-95 border border-white/20 focus:outline-none opacity-0 group-hover:opacity-100"
            aria-label="Previous banner"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </button>
        </>
      )}
    </div>
  );
};

export default HeroBannerSlider;
