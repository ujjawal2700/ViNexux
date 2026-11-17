export const LOW_STOCK_MAX_ORDER = 5;

export const getAvailableStock = (product) => {
  const direct = product?.availableStock ?? product?.stockQuantity ?? product?.stock;
  if (direct !== undefined && direct !== null && direct !== '') {
    const parsed = Number(direct);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
  }

  const stockSpec = product?.specifications?.find((specification) =>
    /^(stock|inventory)$/i.test(String(specification?.key || '').trim())
  );
  if (!stockSpec) return null;
  const parsed = Number(stockSpec.value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
};

// Low stock is a merchandising flag, independent of the physical stock count.
export const isLowStock = (product) => product?.isLowStock === true;

export const getMaximumOrderQuantity = (product) => {
  const stock = getAvailableStock(product);
  const limit = isLowStock(product) ? LOW_STOCK_MAX_ORDER : 1000;
  return stock === null ? limit : Math.min(stock, limit);
};

// Availability enquiries use a description-only form, never a cart quantity.
export const getMaximumEnquiryQuantity = product => product?.stockStatus === 'out-of-stock' ? 0 : getMaximumOrderQuantity(product);
export const isOutOfStock = product => product?.stockStatus === 'out-of-stock' || getAvailableStock(product) === 0;
