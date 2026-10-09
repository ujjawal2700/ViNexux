import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { bannerFramingStyle, BENTO_IMAGE_LIMIT, BENTO_SECTION_COUNT } from '../../../../shared/bannerGrid';

function BannerTile({ images = [], section }) {
  const [index, setIndex] = useState(0);
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
  useEffect(() => {
    if (images.length < 2 || hovered || focused || hidden || reducedMotion) return;
    const timer = setInterval(() => setIndex(i => (i + 1) % images.length), 5000 + section * 700);
    return () => clearInterval(timer);
  }, [images.length, hovered, focused, hidden, reducedMotion, section]);
  const current = images[index] || images[0];
  const nav = delta => setIndex(i => (i + delta + images.length) % images.length);
  const art = current ? <>
    {images.map((image, i) => <img key={image._id || image.url} src={image.url} alt={image.title || `Featured banner in section ${section + 1}`} aria-hidden={i !== index} loading={i === 0 ? 'eager' : 'lazy'} draggable={false} className={`bento-banner-image ${i === index ? 'is-active' : ''}`} style={bannerFramingStyle(image)} />)}
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
    {Array.from({ length: BENTO_SECTION_COUNT }, (_, section) => { const images = (sections?.[section]?.images || []).slice(0, BENTO_IMAGE_LIMIT); return <BannerTile key={`${section}:${images.map(i => `${i._id}:${i.url}`).join('|')}`} section={section} images={images} />; })}
  </section>;
}
