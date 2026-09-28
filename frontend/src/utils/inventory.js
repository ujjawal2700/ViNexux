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

export const getMaximumOrderQuantity = (product) => getAvailableStock(product) ?? 1000;

