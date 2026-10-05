import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import contentService from '../services/contentService';
import { WebsiteSettingsContext } from './websiteSettingsStore';

const defaultSettings = {
  websiteName: 'Vinexus',
  metaTitle: "Vinexus | India's #1 Networking Products, Enterprise Switches, CCTV & IT Hardware Distributor",
  metaDescription: 'Buy high-performance networking products, managed PoE switches, WiFi 6 routers, patch panels, Cat6 cables, server racks, CCTV cameras & IT hardware at wholesale dealer prices in India on Vinexus.',
  favicon: { url: '/favicon.jpeg', publicId: '' },
  logo: { url: '/logo.png', publicId: '' },
  ogImage: { url: '/social-preview.png', publicId: '' },
  promoPopupIntervalMinutes: 15,
  promoPopupEnabled: true,
};

const setMeta = (selector, attribute, value) => {
  const element = document.head.querySelector(selector);
  if (element && value) element.setAttribute(attribute, value);
};

const applyDocumentMetadata = (settings, pathname = '/') => {
  document.title = settings.metaTitle || settings.websiteName;
  setMeta('meta[name="title"]', 'content', settings.metaTitle);
  setMeta('meta[name="description"]', 'content', settings.metaDescription);
  setMeta('meta[name="author"]', 'content', settings.websiteName);
  setMeta('meta[property="og:site_name"]', 'content', settings.websiteName);
  setMeta('meta[property="og:title"]', 'content', settings.metaTitle);
  setMeta('meta[property="og:description"]', 'content', settings.metaDescription);
  setMeta('meta[name="twitter:title"]', 'content', settings.metaTitle);
  setMeta('meta[name="twitter:description"]', 'content', settings.metaDescription);

  const faviconUrl = settings.favicon?.url || defaultSettings.favicon.url;
  document.head.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach((link) => {
    link.removeAttribute('type');
    link.setAttribute('href', faviconUrl);
  });

  const savedSocialImage = settings.ogImage?.url;
  const socialImage = !savedSocialImage || savedSocialImage === '/favicon.jpeg'
    ? defaultSettings.ogImage.url
    : savedSocialImage;
  const absoluteSocialImage = new URL(socialImage, window.location.origin).href;
  setMeta('meta[property="og:image"]', 'content', absoluteSocialImage);
  setMeta('meta[name="twitter:image"]', 'content', absoluteSocialImage);
  const currentUrl = new URL(pathname, window.location.origin).href;
  setMeta('meta[property="og:url"]', 'content', currentUrl);
  setMeta('meta[name="twitter:url"]', 'content', currentUrl);
  setMeta('link[rel="canonical"]', 'href', currentUrl);
};

export const WebsiteSettingsProvider = ({ children }) => {
  const location = useLocation();
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

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
    refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    applyDocumentMetadata(settings, location.pathname);
  }, [settings, location.pathname]);

  const value = useMemo(() => ({ settings, loading, refreshSettings }), [settings, loading, refreshSettings]);
  return <WebsiteSettingsContext.Provider value={value}>{children}</WebsiteSettingsContext.Provider>;
};

export default WebsiteSettingsProvider;
