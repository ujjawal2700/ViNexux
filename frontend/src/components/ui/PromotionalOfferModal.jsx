import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import contentService from '../../services/contentService';
import useWebsiteSettings from '../../hooks/useWebsiteSettings';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

/**
 * PromotionalOfferModal - Displays center-screen popup of promotional offer banners
 * on homepage visit and repeats every N minutes (configurable in Admin).
 */
const PromotionalOfferModal = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useWebsiteSettings();

  const [banners, setBanners] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const timerRef = useRef(null);
  const autoSlideRef = useRef(null);

  const isEnabled = settings.promoPopupEnabled !== false;
  const intervalMinutes = Math.max(1, Number(settings.promoPopupIntervalMinutes) || 15);
  const intervalMs = intervalMinutes * 60 * 1000;

  // 1. Fetch active promotional banners
  useEffect(() => {
    let cancelled = false;
    const loadBanners = async () => {
      try {
        const res = await contentService.getPromotionalBanners();
        const list = res.data?.promotionalBanners || res.promotionalBanners || [];
        const activeWithImages = list.filter((b) => b.isActive !== false && b.image?.url);
        if (!cancelled) {
          setBanners(activeWithImages);
        }
      } catch (err) {
        console.warn('Failed to load promotional banners for popup:', err);
      }
    };
    loadBanners();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Open modal helper
  const triggerPopup = useCallback(() => {
    if (!isEnabled || banners.length === 0) return;
    setIsOpen(true);
    setCurrentIndex(0);
    sessionStorage.setItem('vinexus_last_promo_popup', String(Date.now()));
  }, [isEnabled, banners.length]);

  // Open modal on demand when user clicks "Offers" in header
  const openModalManually = useCallback(async () => {
    if (banners.length > 0) {
      setIsOpen(true);
      setCurrentIndex(0);
      return;
    }
    try {
      const res = await contentService.getPromotionalBanners();
      const list = res.data?.promotionalBanners || res.promotionalBanners || [];
      const activeWithImages = list.filter((b) => b.isActive !== false && b.image?.url);
      if (activeWithImages.length > 0) {
        setBanners(activeWithImages);
        setIsOpen(true);
        setCurrentIndex(0);
      }
    } catch (err) {
      console.warn('Failed to load promotional banners on manual open:', err);
    }
  }, [banners]);

  useEffect(() => {
    window.addEventListener('open-promotional-offers', openModalManually);
    return () => window.removeEventListener('open-promotional-offers', openModalManually);
  }, [openModalManually]);

  // 3. Initial homepage visit trigger and recurrence timer
  useEffect(() => {
    if (location.pathname !== '/' || !isEnabled || banners.length === 0) {
      return;
    }

    const lastShownStr = sessionStorage.getItem('vinexus_last_promo_popup');
    const now = Date.now();

    if (!lastShownStr) {
      // First visit to homepage in this session: open after brief 700ms delay
      const initialTimer = setTimeout(() => {
        triggerPopup();
      }, 700);
      return () => clearTimeout(initialTimer);
    } else {
      const elapsed = now - Number(lastShownStr);
      if (elapsed >= intervalMs) {
        // Interval already passed, show immediately
        triggerPopup();
      } else {
        // Wait for remaining time
        const remaining = intervalMs - elapsed;
        const recurringTimer = setTimeout(() => {
          if (location.pathname === '/') {
            triggerPopup();
          }
        }, remaining);
        return () => clearTimeout(recurringTimer);
      }
    }
  }, [location.pathname, isEnabled, banners.length, intervalMs, triggerPopup]);

  // 4. Set interval for recurring display while remaining on homepage
  useEffect(() => {
    if (location.pathname !== '/' || !isEnabled || banners.length === 0) {
      return;
    }

    const intervalTimer = setInterval(() => {
      if (location.pathname === '/') {
        triggerPopup();
      }
    }, intervalMs);

    return () => clearInterval(intervalTimer);
  }, [location.pathname, isEnabled, banners.length, intervalMs, triggerPopup]);

  // 5. Lock scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // 6. Handle banner sliding
  const handlePrev = useCallback((e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  }, [banners.length]);

  const handleNext = useCallback((e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
  }, [banners.length]);

  // Auto-slide between multiple banners every 4.5 seconds if not hovered
  useEffect(() => {
    if (!isOpen || banners.length <= 1 || isHovered) return;
    autoSlideRef.current = setInterval(() => {
      handleNext();
    }, 4500);
    return () => clearInterval(autoSlideRef.current);
  }, [isOpen, banners.length, isHovered, handleNext]);

  // Close modal
  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('vinexus_last_promo_popup', String(Date.now()));
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || banners.length === 0) return null;

  const currentBanner = banners[currentIndex] || banners[0];

  const handleBannerClick = () => {
    if (currentBanner.link) {
      handleClose();
      if (currentBanner.link.startsWith('http')) {
        window.open(currentBanner.link, '_blank', 'noopener,noreferrer');
      } else {
        navigate(currentBanner.link);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 select-none"
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative w-full max-w-[760px] md:max-w-[850px] lg:max-w-[920px] rounded-2xl bg-white shadow-[0_25px_70px_rgba(0,0,0,0.45)] overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Offer Counter Pill */}
        {banners.length > 1 && (
          <div className="absolute top-3.5 left-3.5 z-30 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-bold backdrop-blur-xs flex items-center gap-1 shadow-md">
            <span>Offer {currentIndex + 1} of {banners.length}</span>
          </div>
        )}

        {/* Top-Right Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 hover:bg-black/85 text-white transition-all cursor-pointer shadow-md backdrop-blur-xs hover:scale-110 active:scale-95"
          aria-label="Close offer banner"
          title="Close"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Banner Media Container */}
        <div
          onClick={handleBannerClick}
          className={`relative w-full overflow-hidden bg-gray-50 flex items-center justify-center ${
            currentBanner.link ? 'cursor-pointer group' : ''
          }`}
        >
          <img
            src={currentBanner.image.url}
            alt={currentBanner.title || 'Promotional Offer'}
            className="w-full h-auto max-h-[80vh] object-contain sm:object-cover transition-transform duration-300 group-hover:scale-[1.01]"
          />

          {/* Transparent Slide Buttons for Multiple Banners */}
          {banners.length > 1 && (
            <>
              {/* Left Slide Button */}
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 text-white transition-all cursor-pointer backdrop-blur-xs shadow-lg active:scale-90"
                aria-label="Previous offer banner"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
              </button>

              {/* Right Slide Button (Explicitly requested by user) */}
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 text-white transition-all cursor-pointer backdrop-blur-xs shadow-lg active:scale-90"
                aria-label="Next offer banner"
              >
                <ChevronRight className="w-6 h-6 stroke-[2.5]" />
              </button>

              {/* Dots Indicator */}
              <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-xs">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(idx);
                    }}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      currentIndex === idx ? 'w-6 bg-white shadow-xs' : 'w-2 bg-white/50 hover:bg-white/80'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromotionalOfferModal;
