import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Inline Icons (Zero external dependencies)
const ChevronLeftIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

export function CoverflowCarousel({
  items = [],
  products = [],
  sectionLabel = "FEATURED SURVEILLANCE & SECURITY HARDWARE",
  autoplay = true,
  autoplayDelay = 4500,
  className = "",
  onCtaClick,
}) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef(0);

  // Map products array to carousel items format if provided
  const formattedItems = React.useMemo(() => {
    if (products && products.length > 0) {
      return products.map((prod) => {
        const catName = typeof prod.categoryId === 'object' ? prod.categoryId?.name : 'SECURITY';
        const priceStr = prod.standardPrice ? `₹${prod.standardPrice.toLocaleString('en-IN')}` : '';
        const primaryImg = prod.images?.[0]?.url || prod.image || 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&auto=format&fit=crop&q=80';
        
        return {
          id: prod._id,
          tag: `#${catName.toUpperCase()}`,
          titleLine1: prod.name,
          titleLine2: priceStr ? `– MSRP ${priceStr}` : `SKU: ${prod.sku || 'VNX'}`,
          desc: prod.description || 'Industrial grade surveillance camera & hardware solution.',
          img: primaryImg,
          ctaText: 'EXPLORE PRODUCT',
          ctaUrl: `/products/${prod._id}`,
          rawProduct: prod,
        };
      });
    }
    return items;
  }, [products, items]);

  const total = formattedItems.length;

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = (idx) => {
    setCurrentIndex(idx % total);
  };

  useEffect(() => {
    if (!autoplay || isHovered || total <= 1) return;
    const interval = setInterval(nextSlide, autoplayDelay);
    return () => clearInterval(interval);
  }, [autoplay, autoplayDelay, isHovered, nextSlide, total]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 45) {
      if (diff < 0) nextSlide();
      else prevSlide();
    }
  };

  if (!formattedItems || formattedItems.length === 0) return null;

  const currentItem = formattedItems[currentIndex];

  return (
    <section
      className={`relative w-full min-h-[640px] flex items-center justify-center overflow-hidden py-8 select-none rounded-3xl border border-[#e5d1d4] shadow-xl ${className}`}
      style={{
        backgroundColor: "#fdf8f9",
        color: "#3d0a0d",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Ambient Blur Image */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {currentItem?.img && (
          <img
            src={currentItem.img}
            alt="ambient background"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.9) blur(40px) opacity(0.25)",
              transform: "scale(1.2)",
              transition: "opacity 1000ms ease, filter 1000ms ease",
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at center, rgba(253,248,249,0.3) 0%, rgba(253,248,249,0.95) 100%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-6xl mx-auto px-4 z-10 flex flex-col items-center">
        {/* Eyebrow Header */}
        {sectionLabel && (
          <div className="flex items-center gap-3 mb-6">
            <span style={{ width: "40px", height: "1px", background: "linear-gradient(90deg, transparent, #800020)" }} />
            <h3
              style={{
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#800020",
                margin: 0,
              }}
            >
              {sectionLabel}
            </h3>
            <span style={{ width: "40px", height: "1px", background: "linear-gradient(90deg, #800020, transparent)" }} />
          </div>
        )}

        {/* 3D Coverflow Stage */}
        <div
          className="relative w-full h-[460px] flex justify-center items-center mb-6"
          style={{ perspective: "1400px" }}
        >
          {formattedItems.map((item, idx) => {
            const offset = (idx - currentIndex + total) % total;

            let transform = "translateX(0px) scale(0.4) rotateY(0deg)";
            let opacity = 0;
            let zIndex = 0;
            let filter = "brightness(0.85) blur(1px)";
            let isCenter = false;

            if (offset === 0) {
              isCenter = true;
              transform = "translateX(0px) scale(1) rotateY(0deg)";
              opacity = 1;
              zIndex = 30;
              filter = "brightness(1)";
            } else if (offset === 1) {
              transform = "translateX(270px) scale(0.83) rotateY(-22deg)";
              opacity = 0.75;
              zIndex = 20;
              filter = "brightness(0.9)";
            } else if (offset === 2) {
              transform = "translateX(480px) scale(0.66) rotateY(-35deg)";
              opacity = 0.45;
              zIndex = 10;
              filter = "brightness(0.8) blur(1px)";
            } else if (offset === total - 1) {
              transform = "translateX(-270px) scale(0.83) rotateY(22deg)";
              opacity = 0.75;
              zIndex = 20;
              filter = "brightness(0.9)";
            } else if (offset === total - 2) {
              transform = "translateX(-480px) scale(0.66) rotateY(38deg)";
              opacity = 0.45;
              zIndex = 10;
              filter = "brightness(0.8) blur(1px)";
            }

            return (
              <div
                key={item.id || idx}
                onClick={() => !isCenter && goToSlide(idx)}
                style={{
                  position: "absolute",
                  width: "310px",
                  height: "440px",
                  borderRadius: "20px",
                  overflow: "hidden",
                  backgroundColor: "#ffffff",
                  border: isCenter ? "2px solid #800020" : "1px solid #e5d1d4",
                  transform,
                  opacity,
                  zIndex,
                  filter,
                  transformOrigin: "center center",
                  transition: "all 750ms cubic-bezier(0.25, 1, 0.5, 1)",
                  boxShadow: isCenter
                    ? "0 25px 50px rgba(0,0,0,0.9), 0 0 35px rgba(220,38,38,0.3)"
                    : "0 15px 30px rgba(0,0,0,0.5)",
                  cursor: isCenter ? "default" : "pointer",
                }}
              >
                {/* Photo */}
                <img
                  src={item.img}
                  alt={item.titleLine1}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />

                {/* Dark Vignette Overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(9,13,22,0.4) 0%, rgba(9,13,22,0.1) 25%, rgba(9,13,22,0.75) 60%, rgba(9,13,22,0.98) 100%)",
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                />

                {/* Content Overlay */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    padding: "18px 16px 20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    textAlign: "center",
                    zIndex: 20,
                    opacity: isCenter ? 1 : 0,
                    transform: isCenter ? "translateY(0px)" : "translateY(16px)",
                    transition: "opacity 450ms ease, transform 450ms ease",
                    pointerEvents: isCenter ? "auto" : "none",
                  }}
                >
                  {/* Tag */}
                  <div style={{ textAlign: "right", width: "100%" }}>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: "#ef4444",
                        backgroundColor: "rgba(15, 23, 42, 0.75)",
                        backdropFilter: "blur(8px)",
                        padding: "3px 10px",
                        borderRadius: "8px",
                        border: "1px solid rgba(220, 38, 38, 0.3)",
                      }}
                    >
                      {item.tag}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "3px",
                      marginTop: "auto",
                      paddingBottom: "4px",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "1.35rem",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        color: "#ffffff",
                        margin: 0,
                        lineHeight: 1.15,
                        textShadow: "0 3px 12px rgba(0,0,0,0.95)",
                      }}
                    >
                      {item.titleLine1}
                    </h2>

                    {item.titleLine2 && (
                      <span
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          color: "#f8fafc",
                          lineHeight: 1.2,
                          textShadow: "0 3px 10px rgba(0,0,0,0.9)",
                        }}
                      >
                        {item.titleLine2}
                      </span>
                    )}

                    <div
                      style={{
                        width: "36px",
                        height: "2px",
                        backgroundColor: "#dc2626",
                        borderRadius: "2px",
                        margin: "6px auto 4px",
                        boxShadow: "0 0 10px rgba(220,38,38,0.8)",
                      }}
                    />

                    {item.desc && (
                      <p
                        style={{
                          fontSize: "0.78rem",
                          color: "rgba(226, 232, 240, 0.9)",
                          maxWidth: "270px",
                          margin: "0 0 10px",
                          lineHeight: 1.3,
                          textShadow: "0 2px 8px rgba(0,0,0,0.9)",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {item.desc}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onCtaClick) {
                          onCtaClick(item);
                        } else if (item.ctaUrl) {
                          navigate(item.ctaUrl);
                        }
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 20px",
                        borderRadius: "9999px",
                        background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                        color: "#ffffff",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        border: "none",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.5), 0 0 20px rgba(220,38,38,0.4)",
                        cursor: "pointer",
                        transition: "transform 200ms ease, box-shadow 200ms ease",
                      }}
                    >
                      <span>{item.ctaText || "VIEW DETAILS"}</span>
                      <ArrowRightIcon />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          aria-label="Previous slide"
          style={{
            position: "absolute",
            left: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor: "rgba(15,23,42,0.8)",
            border: "1px solid rgba(220,38,38,0.4)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(10px)",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            zIndex: 40,
            transition: "all 200ms ease",
          }}
        >
          <ChevronLeftIcon />
        </button>

        <button
          onClick={nextSlide}
          aria-label="Next slide"
          style={{
            position: "absolute",
            right: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor: "rgba(15,23,42,0.8)",
            border: "1px solid rgba(220,38,38,0.4)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(10px)",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            zIndex: 40,
            transition: "all 200ms ease",
          }}
        >
          <ChevronRightIcon />
        </button>

        {/* Pagination Dots */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", zIndex: 30 }}>
          {formattedItems.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              style={{
                height: "8px",
                width: idx === currentIndex ? "28px" : "8px",
                borderRadius: "9999px",
                backgroundColor: idx === currentIndex ? "#dc2626" : "rgba(255,255,255,0.25)",
                border: "none",
                cursor: "pointer",
                boxShadow: idx === currentIndex ? "0 0 12px rgba(220,38,38,0.8)" : "none",
                transition: "all 300ms ease",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export const Component = CoverflowCarousel;
export default CoverflowCarousel;
