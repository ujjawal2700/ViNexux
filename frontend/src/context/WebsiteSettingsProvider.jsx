import React, { useCallback, useEffect, useMemo, useState } from 'react';
import contentService from '../services/contentService';
import { WebsiteSettingsContext } from './websiteSettingsStore';

const defaultSettings = {
  websiteName: 'Vi Nexus',
  metaTitle: 'Vi Nexus | B2B CCTV & Security Equipment Distributor',
  metaDescription: 'Vi Nexus is a leading B2B distributor of CCTV cameras, networking gear, and security accessories in India.',
  favicon: { url: '/favicon.jpeg', publicId: '' },
  logo: { url: '/logo.png', publicId: '' },
  ogImage: { url: '/favicon.jpeg', publicId: '' },
};

const setMeta = (selector, attribute, value) => {
  const element = document.head.querySelector(selector);
  if (element && value) element.setAttribute(attribute, value);
};

const applyDocumentMetadata = (settings) => {
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

  const socialImage = settings.ogImage?.url || defaultSettings.ogImage.url;
  const absoluteSocialImage = new URL(socialImage, window.location.origin).href;
  setMeta('meta[property="og:image"]', 'content', absoluteSocialImage);
  setMeta('meta[name="twitter:image"]', 'content', absoluteSocialImage);
};

export const WebsiteSettingsProvider = ({ children }) => {
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
    applyDocumentMetadata(settings);
  }, [settings]);

  const value = useMemo(() => ({ settings, loading, refreshSettings }), [settings, loading, refreshSettings]);
  return <WebsiteSettingsContext.Provider value={value}>{children}</WebsiteSettingsContext.Provider>;
};

export default WebsiteSettingsProvider;
