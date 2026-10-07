export const LOW_STOCK_THRESHOLD = 10;
export const LOW_STOCK_MAX_ORDER = 3;

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

export const isLowStock = (product) => {
  const stock = getAvailableStock(product);
  if (stock !== null) {
    return stock > 0 && stock < LOW_STOCK_THRESHOLD;
  }
  return product?.stockStatus === 'low-stock';
};

export const getMaximumOrderQuantity = (product) => {
  const stock = getAvailableStock(product);
  if (stock !== null) {
    if (stock <= 0) return 0;
    if (stock < LOW_STOCK_THRESHOLD) {
      return Math.min(LOW_STOCK_MAX_ORDER, stock);
    }
    return stock;
  }
  if (product?.stockStatus === 'low-stock') {
    return LOW_STOCK_MAX_ORDER;
  }
  return 1000;
};

