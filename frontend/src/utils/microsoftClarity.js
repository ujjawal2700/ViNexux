import { privatePath } from '../../../shared/seo.js';
import { getStorageChoices } from './storageConsent';
export const CLARITY_PROJECT_ID = 'z9lnjg4lha';
let initialized = false, stopped = false, pending = null, guards = false, currentUrl, committedLocation = '';
const routeKey = url => { const parsed = new URL(url, window.location.origin); return parsed.pathname + parsed.search + parsed.hash; };
export function commitMicrosoftClarityLocation(path) {
  committedLocation = path; return syncMicrosoftClarity();
}
const allowed = url => {
  const location = new URL(url || window.location.href, window.location.origin);
  return getStorageChoices()?.analytics === true && !privatePath(location.pathname)
    && !['/theme-preview', '/ui-preview', '/not-found'].includes(location.pathname) && !location.hash
    && [...location.searchParams.keys()].every(key => key.startsWith('utm_') || ['gclid', 'fbclid'].includes(key));
};
const clearCookies = () => {
  const host = window.location.hostname;
  for (const name of ['_clck', '_clsk']) for (const domain of ['', host, `.${host}`, ...(host.split('.').length > 2 ? [`.${host.split('.').slice(1).join('.')}`] : [])]) {
    document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
  }
};
export function syncMicrosoftClarity(url = window.location.href) {
  currentUrl = typeof url === 'string' ? url : window.location.href;
  if (!guards) {
    guards = true;
    for (const method of ['pushState', 'replaceState']) {
      const original = window.history[method];
      window.history[method] = function (state, unused, nextUrl) {
        // Stop before React replaces the public DOM with private content.
        if (nextUrl != null) {
          const next = new URL(nextUrl, window.location.href).href;
          if (!allowed(next)) syncMicrosoftClarity(next);
        }
        return original.apply(this, arguments);
      };
    }
    window.addEventListener('popstate', () => {
      // A rapid Back can return before a lazy private route ever commits.
      // Resume only if the public DOM already corresponds to this URL; otherwise
      // the route component resumes after its public render has committed.
      if (!allowed(window.location.href) || committedLocation === routeKey(window.location.href)) syncMicrosoftClarity();
    });
  }
  if (!allowed(currentUrl)) {
    if (initialized && !stopped) {
      window.clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
      window.clarity?.('stop'); stopped = true;
    }
    if (getStorageChoices()?.analytics !== true) clearCookies();
    return Promise.resolve();
  }
  if (initialized) {
    if (stopped) {
      window.clarity?.('start');
      window.clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
      stopped = false;
    }
    return Promise.resolve();
  }
  if (pending) return pending;
  pending = import('@microsoft/clarity').then(({ default: Clarity }) => {
    // Recheck after import; consent or route may have changed while loading.
    if (!allowed(currentUrl)) return;
    Clarity.init(CLARITY_PROJECT_ID);
    Clarity.consentV2({ ad_Storage: 'denied', analytics_Storage: 'granted' });
    initialized = true; stopped = false;
  }).catch(() => { /* Tracking must never block shopping or sign-in. */ }).finally(() => { pending = null; });
  return pending;
}
