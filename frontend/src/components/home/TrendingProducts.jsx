import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { buildProductPath } from '../../utils/categoryUrls';
import Image from '../ui/Image';
import '../../styles/trending-products.css';

export default function TrendingProducts({ products = [] }) {
  const track = useRef(null);
  const group = useRef(null);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const slides = useMemo(() => {
    if (products.length < 2) return products;
    const result = [...products];
    while (result.length < 6) result.push(...products);
    return result;
  }, [products]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      if (media.matches && track.current) track.current.scrollTo({ left: track.current.scrollLeft, behavior: 'instant' });
      setReducedMotion(media.matches);
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el || products.length < 2 || paused || reducedMotion) return;
    let frame, previous;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const step = time => {
      if (media.matches) return;
      if (!document.hidden && previous !== undefined) {
        el.scrollLeft += Math.min(time - previous, 50) * 0.035;
        const width = group.current?.offsetWidth;
        if (width && el.scrollLeft >= width) el.scrollLeft -= width;
      }
      previous = time;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [products.length, slides, paused, reducedMotion]);

  const navigate = direction => {
    const el = track.current, width = group.current?.offsetWidth;
    if (!el || !width) return;
    if (direction < 0 && el.scrollLeft < 1) el.scrollLeft = width;
    if (direction > 0 && el.scrollLeft >= width) el.scrollLeft -= width;
    el.scrollBy({ left: direction * (el.querySelector('a')?.offsetWidth + 20 || 320), behavior: reducedMotion ? 'instant' : 'smooth' });
  };

  if (!products.length) return null;
  return <section className="storefront-container px-3 sm:px-6 lg:px-8 2xl:px-12 space-y-4" aria-label="Trending products">
    <div className="flex items-center justify-between gap-4">
      <div><p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[.18em] text-[var(--store-primary)]">In the spotlight</p>
        <h2 className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-[var(--store-text)]">Trending Products</h2></div>
      <Link to="/trending" className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[var(--store-primary)]">View all <ArrowUpRight size={16} /></Link>
    </div>
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false); }}
      onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)} onTouchCancel={() => setPaused(false)}>
      <div ref={track} className="trending-track scrollbar-none" tabIndex={0} aria-label="Trending products, scroll horizontally">
        {(products.length > 1 ? [0, 1] : [0]).map(copy => <div key={copy} ref={copy === 0 ? group : undefined} className="trending-group" aria-hidden={copy === 1 ? true : undefined} inert={copy === 1 ? true : undefined}>
          {slides.map((product, index) => <Link key={`${product._id}-${index}`} to={buildProductPath(product)} className="trending-card group">
            <div className="trending-artwork">
              <span className="trending-brand">{product.brandId?.name || 'ViNexus'}</span>
              <Image src={product.images?.[0]?.url || product.image} alt={product.name} className="h-full w-full !bg-transparent" objectFit="object-contain" imgClassName="p-7 pt-10 transition-transform duration-300 group-hover:scale-105" />
            </div>
            <div className="trending-caption"><span className="line-clamp-2 font-semibold">{product.name}</span><ArrowUpRight size={18} className="shrink-0" /></div>
          </Link>)}
        </div>)}
      </div>
      {products.length > 1 && <>
        <button type="button" className="trending-arrow -left-2 sm:-left-4" onClick={() => navigate(-1)} aria-label="Previous trending products"><ChevronLeft size={22} /></button>
        <button type="button" className="trending-arrow -right-2 sm:-right-4" onClick={() => navigate(1)} aria-label="Next trending products"><ChevronRight size={22} /></button>
      </>}
    </div>
  </section>;
}
