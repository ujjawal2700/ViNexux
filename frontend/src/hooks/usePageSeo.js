import useWebsiteSettings from './useWebsiteSettings';
import { SITE_ORIGIN, routeMetadata } from '../../../shared/seo.js';
import { useEffect } from 'react';

/**
 * Custom SEO hook to dynamically update document title, meta tags, and structured JSON-LD data
 */
export const usePageSeo = ({
  title,
  description,
  keywords,
  canonical,
  image,
  imageAlt,
  type = 'website',
  jsonLd,
  robots,
}) => {
  const { settings } = useWebsiteSettings();
  const resolvedImage = type === 'product' ? image : image || settings.ogImage?.url || '/social-preview.png';
  useEffect(() => {
    const pathname = window.location.pathname;
    document.head.dataset.pageSeoPath = pathname;

    // Helper to safely set meta attributes
    const setMeta = (selector, attribute, value) => {
      if (!value) return;
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        if (selector.startsWith('meta[name="')) {
          const name = selector.match(/name="([^"]+)"/)?.[1];
          if (name) el.setAttribute('name', name);
        } else if (selector.startsWith('meta[property="')) {
          const prop = selector.match(/property="([^"]+)"/)?.[1];
          if (prop) el.setAttribute('property', prop);
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attribute, value);
    };

    // Update title
    if (title) {
      document.title = title;
      setMeta('meta[name="title"]', 'content', title);
      setMeta('meta[property="og:title"]', 'content', title);
      setMeta('meta[name="twitter:title"]', 'content', title);
    }

    // Update description
    if (description) {
      setMeta('meta[name="description"]', 'content', description);
      setMeta('meta[property="og:description"]', 'content', description);
      setMeta('meta[name="twitter:description"]', 'content', description);
    }

    // Update keywords
    setMeta('meta[name="keywords"]', 'content', keywords || 'ViNexus, networking, CCTV, IT hardware');

    // Update canonical link
    const pageUrl = canonical || new URL(window.location.pathname, SITE_ORIGIN).href;
    setMeta('meta[name="robots"]', 'content', robots || routeMetadata({ pathname }).robots);
    document.head.querySelectorAll('meta[name="googlebot"], meta[name="bingbot"]').forEach(element => element.remove());
    let canonicalLink = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', pageUrl);
    setMeta('meta[property="og:url"]', 'content', pageUrl);
    setMeta('meta[name="twitter:url"]', 'content', pageUrl);

    // Remove generic image assumptions on product pages, including products without an image.
    if (type === 'product') {
      document.head.querySelectorAll('meta[property^="og:image:"], meta[name="twitter:image:alt"]').forEach(element => element.remove());
      if (!image) document.head.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(element => element.remove());
    }
    // Update social image
    if (resolvedImage) {
      const absoluteImage = resolvedImage.startsWith('http')
        ? resolvedImage
        : new URL(resolvedImage, SITE_ORIGIN).href;
      setMeta('meta[property="og:image"]', 'content', absoluteImage);
      setMeta('meta[name="twitter:image"]', 'content', absoluteImage);
      setMeta('meta[property="og:image:alt"]', 'content', imageAlt || title);
      setMeta('meta[name="twitter:image:alt"]', 'content', imageAlt || title);
    }

    // Update OpenGraph Type
    setMeta('meta[property="og:type"]', 'content', type);

    // Inject / update page-specific JSON-LD structured data
    let scriptEl = document.getElementById('page-structured-data');
    if (jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'page-structured-data';
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      // Clean up script on unmount
      const existingScript = document.getElementById('page-structured-data');
      if (existingScript) existingScript.remove();
      if (document.head.dataset.pageSeoPath === pathname) delete document.head.dataset.pageSeoPath;
    };
  }, [title, description, keywords, canonical, image, resolvedImage, imageAlt, type, jsonLd, robots]);
};

export default usePageSeo;
