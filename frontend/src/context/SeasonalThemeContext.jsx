import React, { useEffect, useState, useCallback, useRef } from 'react';
import { themeService } from '../services/themeService';
import { themeVariables, themeStyles, themeStyleAttributes } from '../../../shared/seasonalThemes';
import { useLocation } from 'react-router-dom';
import { SeasonalThemeContext as Context, defaultSeasonalTheme as fallback } from './seasonalThemeStore';
import { useSeasonalTheme } from '../hooks/useSeasonalTheme';
import { StorefrontScopeContext } from './seasonalThemeStore';
export function SeasonalThemeProvider({ children }) {
  const isPreview = useRef(false);
  const [theme, setTheme] = useState(fallback);
  const refresh = useCallback(async () => {
    if (isPreview.current) return;
    try { const data = await themeService.public(); if (!isPreview.current) setTheme(data.theme || fallback); }
    catch { if (!isPreview.current) setTheme(fallback); }
  }, []);
  useEffect(() => {
    refresh();
    const onVisible = () => { if (!document.hidden) refresh(); };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    const poll = window.setInterval(onVisible, 60000);
    return () => { clearInterval(poll); window.removeEventListener('focus', onVisible); document.removeEventListener('visibilitychange', onVisible); };
  }, [refresh]);
  useEffect(() => {
    if (!theme.nextChangeAt) return;
    const timeout = setTimeout(refresh, Math.max(100, Math.min(2147483647, +new Date(theme.nextChangeAt) - Date.now() + 100)));
    return () => clearTimeout(timeout);
  }, [theme.nextChangeAt, refresh]);
  useEffect(() => {
    if (window.parent === window || window.location.pathname !== '/theme-preview') return;
    const receive = event => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== 'vinexus-theme-preview') return;
      const config = event.data.config;
      if (!config?.colors || !Object.values(config.colors).every(v => /^#[0-9a-f]{6}$/i.test(v))) return;
      isPreview.current = true;
      setTheme({ id: 'preview', name: 'Draft preview', config, previewBanners: event.data.banners || [], nextChangeAt: null });
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'vinexus-theme-preview-ready' }, window.location.origin);
    const blockInteraction = event => { if (event.type === 'submit' || event.target.closest('a, button')) { event.preventDefault(); event.stopPropagation(); } };
    document.addEventListener('click', blockInteraction, true);
    document.addEventListener('submit', blockInteraction, true);
    return () => { window.removeEventListener('message', receive); document.removeEventListener('click', blockInteraction, true); document.removeEventListener('submit', blockInteraction, true); };
  }, []);
  return <Context.Provider value={{ theme, refresh }}>{children}</Context.Provider>;
}
export function ThemeDecorations({ config, placement }) {
  const styles = themeStyles(config);
  if (styles.decorationPlacement === 'off' || (styles.decorationPlacement !== 'both' && styles.decorationPlacement !== placement)) return null;
  const asset = config.assets?.[placement];
  if (asset?.url) return <div aria-hidden="true" className={`theme-decoration theme-decoration-asset theme-decoration-${placement}`}><img src={asset.url} alt="" /></div>;
  if (config.decoration === 'none') return null;
  return <div aria-hidden="true" className={`theme-decoration theme-decoration-${placement} theme-decoration-${config.decoration} ${config.motion ? 'theme-motion' : ''}`}>
    {Array.from({ length: styles.decorationCount }, (_, i) => <span key={i}>{config.decoration === 'diyas' ? <svg width="25" height="24" viewBox="0 0 32 30" fill="none"><path d="M16 2c-8 9-3 14 0 14s8-5 0-14Z" fill="currentColor" /><path d="M3 18h26c-2 12-24 12-26 0Z" fill="currentColor" /><path d="M4 18c8 4 16 4 24 0" stroke="var(--store-primary)" strokeWidth="2" /></svg> : config.decoration === 'lanterns' ? <svg width="24" height="28" viewBox="0 0 24 28" fill="none"><path d="M12 0v4M12 24v4" stroke="currentColor" strokeWidth="2" /><rect x="3" y="5" width="18" height="18" rx="7" fill="currentColor" /><path d="M8 6v16M16 6v16" stroke="var(--store-primary)" /></svg> : config.decoration === 'flowers' ? '✿' : config.decoration === 'snowflakes' ? '❄' : config.decoration === 'garland' ? '❁' : config.decoration === 'stars' ? '✦' : '●'}</span>)}
  </div>;
}
export function StorefrontOverlayScope({ children }) {
  const { theme } = useSeasonalTheme();
  const { pathname } = useLocation();
  if (pathname === '/theme-preview') return null;
  if (pathname.startsWith('/admin')) return <>{children}</>;
  return <StorefrontScopeContext.Provider value={true}><div className="storefront-theme" style={themeVariables(theme.config)} {...themeStyleAttributes(theme.config)}>{children}</div></StorefrontScopeContext.Provider>;
}
