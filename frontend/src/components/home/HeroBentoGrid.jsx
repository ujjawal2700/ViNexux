import React, { useEffect, useState, useId, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { bannerFramingStyle, BENTO_IMAGE_LIMIT, BENTO_SECTION_COUNT, BENTO_TRANSITIONS } from '../../../../shared/bannerGrid';

function BannerTile({ images = [], section, transition = 'fade' }) {
  const filterId = `banner-pixel-${useId().replace(/:/g, '')}`;
  const effect = BENTO_TRANSITIONS.includes(transition) ? transition : 'fade';
  const [{ index, previous }, setSlide] = useState({ index: 0, previous: null });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(media.matches);
    const visibility = () => setHidden(document.hidden);
    media.addEventListener('change', change); document.addEventListener('visibilitychange', visibility);
    return () => { media.removeEventListener('change', change); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  const directional = ['top-to-bottom', 'bottom-to-top', 'left-to-right', 'right-to-left'].includes(effect);
  const nav = useCallback(delta => {
    if (images.length < 2) return;
    setSlide(slide => {
      // Finish the current swipe before starting another, so both tiles stay aligned.
      if (slide.previous !== null) return slide;
      return { index: (slide.index + delta + images.length) % images.length,
        previous: directional && !reducedMotion ? slide.index : null };
    });
  }, [images.length, directional, reducedMotion]);
  useEffect(() => {
    if (images.length < 2 || hovered || focused || hidden || reducedMotion) return;
    const timer = setInterval(() => nav(1), 5000 + section * 700);
    return () => clearInterval(timer);
  }, [images.length, hovered, focused, hidden, reducedMotion, section, nav]);
  useEffect(() => {
    if (previous === null) return;
    // Also release the swipe when animation events are suppressed (hidden tabs
    // or a reduced-motion preference change).
    const timer = setTimeout(() => setSlide(slide => ({ ...slide, previous: null })), reducedMotion ? 0 : 750);
    return () => clearTimeout(timer);
  }, [previous, index, reducedMotion]);
  const current = images[index] || images[0];
  const art = current ? <>
    <svg aria-hidden="true" width="0" height="0" className="absolute"><defs><filter id={filterId} x="0" y="0" width="100%" height="100%"><feFlood x="0" y="0" width="1" height="1" result="sample" /><feComposite in="sample" in2="sample" operator="over" x="0" y="0" width="12" height="12" /><feTile result="grid" /><feComposite in="SourceGraphic" in2="grid" operator="in" /><feMorphology operator="dilate" radius="6" /></filter></defs></svg>
    {images.map((image, i) => <div key={image._id || image.url} className={`bento-banner-slide effect-${effect} ${i === index ? `is-current ${previous !== null ? 'is-entering' : ''}` : i === previous ? 'is-leaving' : ''}`} onAnimationEnd={e => { if (e.target === e.currentTarget && i === index) setSlide(slide => ({ ...slide, previous: null })); }} style={{ '--banner-pixel-filter': `url(#${filterId})` }}><img key={image._id || image.url} src={image.url} alt={image.title || `Featured banner in section ${section + 1}`} aria-hidden={i !== index} loading={i === 0 ? 'eager' : 'lazy'} draggable={false} className={`bento-banner-image ${i === index ? 'is-active' : ''}`} style={bannerFramingStyle(image)} /></div>)}
    {(current.title || current.buttonText) && <div className="bento-banner-caption"><span>{current.title || current.buttonText}</span><ArrowUpRight size={18} /></div>}
  </> : <div className="bento-banner-empty"><span className="text-xs uppercase tracking-[.2em] text-[var(--store-muted)]">ViNexus collections</span><span className="text-xl font-semibold text-[var(--store-text)]">{['Explore our range', 'Discover more', 'New arrivals', 'Find your essentials'][section]}</span><span className="inline-flex items-center gap-2 text-sm text-[var(--store-primary)]">Shop products <ArrowUpRight size={16} /></span></div>;
  const link = current?.link || (!current ? '/products' : '');
  const external = /^https?:\/\//i.test(link);
  const validLink = external || /^\/(?!\/)/.test(link);
  return <div className={`bento-banner-tile bento-banner-tile-${section + 1}`} role="region" aria-roledescription="carousel" aria-label={`Banner section ${section + 1}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}>
    {validLink ? external ? <a href={link} target="_blank" rel="noopener noreferrer" className="bento-banner-content">{art}</a> : <Link to={link} className="bento-banner-content">{art}</Link> : <div className="bento-banner-content">{art}</div>}
    {images.length > 1 && <div className="bento-banner-controls">
      <button type="button" onClick={() => nav(-1)} aria-label={`Previous image in section ${section + 1}`}><ChevronLeft size={16} /></button>
      <button type="button" onClick={() => nav(1)} aria-label={`Next image in section ${section + 1}`}><ChevronRight size={16} /></button>
    </div>}
  </div>;
}
export default function HeroBentoGrid({ grid }) {
  const sections = grid?.configured ? grid.sections : [];
  return <section className="hero-bento-grid storefront-container" aria-label="Featured collections">
    {Array.from({ length: BENTO_SECTION_COUNT }, (_, section) => { const images = (sections?.[section]?.images || []).slice(0, BENTO_IMAGE_LIMIT); return <BannerTile key={`${section}:${images.map(i => `${i._id}:${i.url}`).join('|')}`} section={section} images={images} transition={sections?.[section]?.transition || 'fade'} />; })}
  </section>;
}
