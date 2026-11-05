import { withoutStorefrontPrices } from '../../../shared/storefrontPricing';
import { getMaximumEnquiryQuantity } from '../utils/inventory';

const STORAGE_KEY = 'vinexus_guest_cart';

const read = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const items = Array.isArray(parsed) ? parsed.map(({ priceSnapshot: _price, price: _legacyPrice, ...item }) => ({
      ...item,
      productId: item.productId && typeof item.productId === 'object'
        ? withoutStorefrontPrices(item.productId) : item.productId,
    })) : [];
    if (JSON.stringify(items) !== JSON.stringify(parsed)) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return items;
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
    const maximum = getMaximumEnquiryQuantity(product);
    if (existing) existing.quantity = Math.min(maximum, existing.quantity + quantity);
    else items.push({ productId: withoutStorefrontPrices(product), quantity: Math.min(maximum, quantity) });
    return write(items);
  },
  updateItem(productId, quantity) {
    return write(read().map((item) => String(item.productId?._id || item.productId) === String(productId)
      ? { ...item, quantity: Math.min(getMaximumEnquiryQuantity(item.productId), Math.max(1, quantity)) } : item));
  },
  removeItem(productId) {
    return write(read().filter((item) => String(item.productId?._id || item.productId) !== String(productId)));
  },
  clear: () => write([]),
};

export default guestCartService;
