const WISHLIST_KEY = 'vinexus_wishlist';

export const getWishlist = () => {
  try {
    const data = localStorage.getItem(WISHLIST_KEY);
    return data ? JSON.parse(data) : [];
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
  const items = getWishlist();
  const id = product._id || product.id;
  const exists = items.some((p) => (p._id || p.id) === id);
  let updated;
  if (exists) {
    updated = items.filter((p) => (p._id || p.id) !== id);
  } else {
    updated = [...items, product];
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
