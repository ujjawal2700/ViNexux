import { allowsPreferences } from './storageConsent.js';
const VIEW_KEY = 'vinexus_recently_viewed';
const SEARCH_KEY = 'vinexus_recent_searches';
let views = [], searches = [];
const read = (key, fallback) => {
  if (!allowsPreferences()) return fallback;
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return fallback; }
};
const write = (key, value) => {
  if (allowsPreferences()) try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Browser storage can be unavailable. */ }
};
const idOf = value => typeof value === 'string' ? value : value?._id;
export const getRecentViews = () => [...new Set(read(VIEW_KEY, views).map(idOf).filter(id => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id)).map(id => id.toLowerCase()))].slice(0, 10);
export const rememberView = id => {
  if (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id)) return;
  views = [id, ...getRecentViews().filter(value => value !== id)].slice(0, 10);
  write(VIEW_KEY, views);
};
export const getRecentSearches = () => [...new Map(read(SEARCH_KEY, searches).filter(value => typeof value === 'string' && value.trim()).map(value => [value.toLowerCase(), value.slice(0, 200)])).values()].slice(0, 6);
export const rememberSearch = text => {
  const query = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 200);
  if (!query) return getRecentSearches();
  searches = [query, ...getRecentSearches().filter(value => value.toLowerCase() !== query.toLowerCase())].slice(0, 6);
  write(SEARCH_KEY, searches);
  return searches;
};
export const clearBrowsingHistory = () => { views = []; searches = []; };
if (typeof window !== 'undefined') window.addEventListener('storage-choices-updated', () => {
  if (!allowsPreferences()) clearBrowsingHistory();
});
