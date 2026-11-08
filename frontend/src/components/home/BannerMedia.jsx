import { bannerImage } from '../../utils/responsiveImage';
import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { bannerFramingStyle } from '../../../../shared/bannerGrid';
import { isBannerVideo, suitableBannerConnection } from '../../../../shared/bannerMedia';

export default function BannerMedia({ asset, active, shown = active, first = false, section = 0 }) {
  const video = useRef(null), frame = useRef(null), waiting = useRef(null);
  const [visible, setVisible] = useState(false), [ready, setReady] = useState(false), [manual, setManual] = useState(false), [failed, setFailed] = useState(false), [playing, setPlaying] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const isVideo = isBannerVideo(asset);
  useEffect(() => {
    if (!isVideo) return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= .35), { threshold: [0, .35] });
    observer.observe(frame.current); return () => observer.disconnect();
  }, [isVideo]);
  useEffect(() => {
    if (!isVideo) return undefined;
    const connection = navigator.connection, media = matchMedia('(prefers-reduced-motion: reduce)'); let timer;
    const check = () => {
      clearTimeout(timer); setReady(false);
      if (suitableBannerConnection(connection, navigator.onLine) && !media.matches) timer = setTimeout(() => {
        if (suitableBannerConnection(connection, navigator.onLine)) { setFailed(false); setReady(true); }
      }, 3000);
    };
    const visibility = () => setHidden(document.hidden);
    const motion = () => { setReduced(media.matches); check(); };
    const loaded = () => check();
    if (document.readyState === 'complete') check(); else window.addEventListener('load', loaded, { once: true });
    connection?.addEventListener('change', check); window.addEventListener('online', check); window.addEventListener('offline', check);
    document.addEventListener('visibilitychange', visibility); media.addEventListener('change', motion);
    return () => { clearTimeout(timer); window.removeEventListener('load', loaded); connection?.removeEventListener('change', check); window.removeEventListener('online', check); window.removeEventListener('offline', check); document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', motion); };
  }, [isVideo]);
  const load = isVideo && active && visible && !hidden && !failed && (manual || ready && !reduced);
  useEffect(() => {
    const element = video.current;
    if (!element) return undefined;
    if (load) element.play().catch(error => { if (error.name === 'AbortError') return; setFailed(true); setPlaying(false); });
    else { element.pause(); element.removeAttribute('src'); element.load(); }
    return () => { clearTimeout(waiting.current); element.pause(); };
  }, [load]);
  const style = bannerFramingStyle(asset);
  if (!isVideo) return <img {...bannerImage(first || shown ? asset : null, section)} width={1600} height={900} fetchPriority={first ? 'high' : 'low'} decoding="async" alt={asset.title || 'Featured collection'} aria-hidden={!active} loading={first ? 'eager' : 'lazy'} draggable={false} className={`bento-banner-image ${active ? 'is-active' : ''}`} style={style} />;
  return <div ref={frame} className="absolute inset-0" data-testid="banner-video-frame">
    <img {...bannerImage(first || shown ? asset : null, section)} width={1280} height={720} fetchPriority={first ? 'high' : 'low'} decoding="async" alt={asset.title || 'Promotional video thumbnail'} loading={first ? 'eager' : 'lazy'} className={`bento-banner-image ${playing ? 'opacity-0' : ''}`} style={style} />
    <video ref={video} src={load ? asset.url : undefined} preload="none" muted playsInline loop aria-hidden="true" className={`bento-banner-image ${playing ? 'opacity-100' : 'opacity-0'}`} style={style}
      onEmptied={() => setPlaying(false)} onPlaying={() => { clearTimeout(waiting.current); setPlaying(true); }} onCanPlay={() => clearTimeout(waiting.current)} onError={() => { if (load) { setFailed(true); setPlaying(false); } }} onWaiting={() => { clearTimeout(waiting.current); waiting.current = setTimeout(() => { setFailed(true); setPlaying(false); }, 2500); }} onStalled={() => { setFailed(true); setPlaying(false); }} />
    {active && !playing && <button type="button" aria-label={failed ? 'Retry banner video' : 'Play banner video'} className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-full bg-black/70 px-3 py-2 text-xs font-bold text-white" onClick={event => { event.preventDefault(); event.stopPropagation(); setFailed(false); setManual(true); }}><Play size={14} />{failed ? 'Retry video' : 'Play video'}</button>}
  </div>;
}
