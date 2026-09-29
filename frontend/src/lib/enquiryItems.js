export const getEnquiryItemImage = (item) => {
  const product = item.productId && typeof item.productId === 'object' ? item.productId : {};
  const firstImage = product.images?.[0];
  return item.productImageUrl || (typeof firstImage === 'string' ? firstImage : firstImage?.url) || product.image || '';
};

export const groupEnquiryItems = (items = []) => {
  const grouped = new Map();
  for (const item of items) {
    const productId = item.productId?._id || item.productId;
    const key = String(productId || item.productName);
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const lineTotal = (Number(item.priceShown) || 0) * quantity;
    const imageUrl = getEnquiryItemImage(item);
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += quantity;
      existing.lineTotal += lineTotal;
      existing.priceShown = existing.lineTotal / existing.quantity;
      if (!existing.imageUrl) existing.imageUrl = imageUrl;
    } else {
      grouped.set(key, { ...item, quantity, lineTotal, imageUrl, priceShown: Number(item.priceShown) || 0 });
    }
  }
  return [...grouped.values()];
};
