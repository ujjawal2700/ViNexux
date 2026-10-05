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
  type = 'website',
  jsonLd,
}) => {
  useEffect(() => {
    const originalTitle = document.title;

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
    if (keywords) {
      setMeta('meta[name="keywords"]', 'content', keywords);
    }

    // Update canonical link
    const pageUrl = canonical || (typeof window !== 'undefined' ? window.location.href : 'https://vinexus.in/');
    let canonicalLink = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', pageUrl);
    setMeta('meta[property="og:url"]', 'content', pageUrl);
    setMeta('meta[name="twitter:url"]', 'content', pageUrl);

    // Update social image
    if (image) {
      const absoluteImage = image.startsWith('http')
        ? image
        : new URL(image, window.location.origin).href;
      setMeta('meta[property="og:image"]', 'content', absoluteImage);
      setMeta('meta[name="twitter:image"]', 'content', absoluteImage);
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
      document.title = originalTitle;
    };
  }, [title, description, keywords, canonical, image, type, jsonLd]);
};

export default usePageSeo;
