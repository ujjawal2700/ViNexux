import { withoutStorefrontPrices } from '../../../shared/storefrontPricing';
import { allowsPreferences } from '../utils/storageConsent.js';

const WISHLIST_KEY = 'vinexus_wishlist';

export const getWishlist = () => {
  if (!allowsPreferences()) return [];
  try {
    const data = localStorage.getItem(WISHLIST_KEY);
    const items = data ? JSON.parse(data) : [];
    const cleaned = Array.isArray(items) ? items.map(withoutStorefrontPrices) : [];
    if (JSON.stringify(cleaned) !== JSON.stringify(items)) localStorage.setItem(WISHLIST_KEY, JSON.stringify(cleaned));
    return cleaned;
  } catch (e) {
    console.error('Error reading wishlist from localStorage:', e);
    return [];
  }
};

export const isInWishlist = (productId) => {
  if (!productId) return false;
  const items = getWishlist();
  return items.some((p) => (p._id || p.id) === productId);
};

export const toggleWishlist = (product) => {
  if (!product) return false;
  if (!allowsPreferences()) {
    window.dispatchEvent(new Event('open-storage-choices'));
    return null;
  }
  const items = getWishlist();
  const id = product._id || product.id;
  const exists = items.some((p) => (p._id || p.id) === id);
  let updated;
  if (exists) {
    updated = items.filter((p) => (p._id || p.id) !== id);
  } else {
    updated = [...items, withoutStorefrontPrices(product)];
  }
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('wishlist-updated'));
  } catch (e) {
    console.error('Failed to save wishlist:', e);
  }
  return !exists;
};

export const clearWishlist = () => {
  try {
    localStorage.removeItem(WISHLIST_KEY);
    window.dispatchEvent(new Event('wishlist-updated'));
  } catch (e) {
    console.error('Failed to clear wishlist:', e);
  }
};

export default {
  getWishlist,
  isInWishlist,
  toggleWishlist,
  clearWishlist,
};
