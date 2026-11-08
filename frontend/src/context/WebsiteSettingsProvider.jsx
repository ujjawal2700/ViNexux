import { storefrontStartup } from '../utils/storefrontStartup';
import { routeMetadata, SITE_TITLE, SITE_DESCRIPTION } from '../../../shared/seo.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import contentService from '../services/contentService';
import { WebsiteSettingsContext } from './websiteSettingsStore';

const defaultSettings = {
  websiteName: 'Vinexus',
  metaTitle: SITE_TITLE,
  metaDescription: SITE_DESCRIPTION,
  favicon: { url: '/favicon-32x32.png', publicId: '' },
  logo: { url: '/logo.png', publicId: '' },
  ogImage: { url: '/social-preview.png', publicId: '' },
  promoPopupIntervalMinutes: 15,
  promoPopupEnabled: true,
  maintenanceEnabled: false,
};

const setMeta = (selector, attribute, value) => {
  if (!value) return;
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
    const match = selector.match(/\[(name|property|rel)="([^"]+)"\]/);
    if (match) element.setAttribute(match[1], match[2]);
    document.head.appendChild(element);
  }
  element.setAttribute(attribute, value);
};

const applyDocumentMetadata = (settings, pathname = '/') => {
  const savedFavicon = settings.favicon?.url || defaultSettings.favicon.url;
  const bundledFavicon = ['/favicon.jpeg', '/favicon-32x32.png'].includes(savedFavicon);
  const faviconUrl = bundledFavicon ? '/favicon-32x32.png' : savedFavicon;
  document.head.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach((link) => {
    link.removeAttribute('type');
    link.setAttribute('href', bundledFavicon && link.rel === 'apple-touch-icon' ? '/apple-touch-icon.png' : faviconUrl);
  });

  // A page hook owns its route-specific metadata, including late CMS refreshes.
  if (document.head.dataset.pageSeoPath === pathname) return;
  const meta = routeMetadata({ pathname, settings });
  document.title = meta.title;
  for (const name of ['title', 'description', 'robots']) setMeta(`meta[name="${name}"]`, 'content', meta[name]);
  document.head.querySelectorAll('meta[name="googlebot"], meta[name="bingbot"]').forEach(element => element.remove());
  for (const name of ['title', 'description', 'url', 'image']) {
    setMeta(`meta[property="og:${name}"]`, 'content', meta[name]);
    setMeta(`meta[name="twitter:${name}"]`, 'content', meta[name]);
  }
  setMeta('meta[property="og:image:alt"]', 'content', meta.heading);
  setMeta('meta[name="twitter:image:alt"]', 'content', meta.heading);
  setMeta('meta[name="keywords"]', 'content', 'ViNexus, networking, CCTV, IT hardware');
  setMeta('meta[property="og:type"]', 'content', meta.type);
  setMeta('meta[property="og:site_name"]', 'content', meta.siteName);
  setMeta('link[rel="canonical"]', 'href', meta.url);
};

export const WebsiteSettingsProvider = ({ children }) => {
  const location = useLocation();
  const [settings, setSettings] = useState(() => ({ ...defaultSettings, ...storefrontStartup?.settings }));
  const [loading, setLoading] = useState(!storefrontStartup);

  const refreshSettings = useCallback(async () => {
    try {
      const response = await contentService.getWebsiteSettings({ skipGlobalLoader: true });
      const saved = response?.data?.settings || response?.settings || response?.data || response;
      if (saved) setSettings((current) => ({ ...current, ...saved }));
      return saved;
    } catch (error) {
      console.warn('Unable to load website settings; using bundled defaults.', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Server HTML already checked maintenance; polling still picks up changes.
    if (!storefrontStartup) refreshSettings();
    const timer = window.setInterval(refreshSettings, 15000);
    const onMaintenance = event => setSettings(current => ({ ...current, maintenanceEnabled: true, maintenanceMessage: event.detail }));
    window.addEventListener('site-maintenance', onMaintenance);
    return () => { window.clearInterval(timer); window.removeEventListener('site-maintenance', onMaintenance); };
  }, [refreshSettings]);

  useEffect(() => {
    applyDocumentMetadata(settings, location.pathname);
  }, [settings, location.pathname]);

  const value = useMemo(() => ({ settings, loading, refreshSettings }), [settings, loading, refreshSettings]);
  return <WebsiteSettingsContext.Provider value={value}>{children}</WebsiteSettingsContext.Provider>;
};

export default WebsiteSettingsProvider;
