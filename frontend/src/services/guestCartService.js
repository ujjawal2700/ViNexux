const STORAGE_KEY = 'vinexus_guest_cart';

const read = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (items) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  const cart = { items, itemCount: items.length, totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0) };
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart } }));
  return cart;
};

export const guestCartService = {
  getCart: () => ({ items: read() }),
  getItems: read,
  addItem(product, quantity = 1) {
    const productId = String(product?._id || product?.id || '');
    if (!productId) return this.getCart();
    const items = read();
    const existing = items.find((item) => String(item.productId?._id || item.productId) === productId);
    if (existing) existing.quantity = Math.min(1000, existing.quantity + quantity);
    else items.push({ productId: product, quantity: Math.min(1000, quantity), priceSnapshot: product.standardPrice || 0 });
    return write(items);
  },
  updateItem(productId, quantity) {
    return write(read().map((item) => String(item.productId?._id || item.productId) === String(productId)
      ? { ...item, quantity: Math.min(1000, Math.max(1, quantity)) } : item));
  },
  removeItem(productId) {
    return write(read().filter((item) => String(item.productId?._id || item.productId) !== String(productId)));
  },
  clear: () => write([]),
};

export default guestCartService;
