import { privatePath } from '../../../shared/seo.js';
import { getStorageChoices } from './storageConsent';
export const GOOGLE_MEASUREMENT_ID = 'G-L1LPWYW2V6';
let configured = false, guardsInstalled = false;
const permitted = pathname => !privatePath(pathname) && !['/theme-preview', '/ui-preview', '/not-found'].includes(pathname);
const safeLocation = url => { const parsed = new URL(url, window.location.origin); return `${parsed.origin}${parsed.pathname}`; };
const updatePrivacy = (url = window.location.href) => {
  const parsed = new URL(url, window.location.origin);
  const safeQuery = [...parsed.searchParams.keys()].every(key => key.startsWith('utm_') || ['gclid', 'fbclid'].includes(key));
  const allowed = getStorageChoices()?.analytics === true && permitted(parsed.pathname) && safeQuery;
  window[`ga-disable-${GOOGLE_MEASUREMENT_ID}`] = !allowed;
  window.gtag?.('set', 'page_location', safeLocation(url));
  return allowed;
};
export const syncGoogleAnalytics = () => {
  window.dataLayer ||= [];
  window.gtag ||= function () { window.dataLayer.push(arguments); };
  if (!guardsInstalled) {
    guardsInstalled = true;
    // Run before Google's History API observer so private routes and query
    // strings (OTP/reset/search tokens) are not sent to Analytics.
    for (const method of ['pushState', 'replaceState']) {
      const original = window.history[method];
      window.history[method] = function (state, unused, url) {
        if (url != null) updatePrivacy(url);
        return original.apply(this, arguments);
      };
    }
    window.addEventListener('popstate', () => updatePrivacy());
  }
  const allowed = updatePrivacy();
  window.gtag('consent', 'update', { analytics_storage: allowed ? 'granted' : 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  if (!allowed) {
    for (const cookie of getStorageChoices()?.analytics === true ? [] : document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) continue;
      document.cookie = `${name}=; Max-Age=0; path=/`;
      const host = window.location.hostname;
      for (const domain of [host, `.${host}`, ...(host.split('.').length > 2 ? [`.${host.split('.').slice(1).join('.')}`] : [])]) document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
    }
    return;
  }
  if (configured) return;
  configured = true;
  window.gtag('js', new Date());
  // Enhanced measurement owns SPA history page views; no duplicate manual events.
  window.gtag('config', GOOGLE_MEASUREMENT_ID, { page_location: safeLocation(window.location.href),
    page_referrer: document.referrer && permitted(new URL(document.referrer).pathname) ? safeLocation(document.referrer) : '',
    allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement('script');
  script.id = 'google-analytics'; script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_MEASUREMENT_ID}`;
  document.head.appendChild(script);
};
