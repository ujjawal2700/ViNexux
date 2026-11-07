// A product/variant pair is a sellable item. Never merge different options.
export const productLineKey = (productId, variantId) => `${productId?._id || productId}${variantId ? `:${variantId}` : ''}`;
export const activeVariants = product => (product?.variants || []).filter(option => option.isActive !== false);
export const hasVariants = product => Array.isArray(product?.variants) && product.variants.length > 0;
export const variantSummary = variants => {
  const active = activeVariants({ variants });
  return {
    stockQuantity: variants.reduce((sum, option) => sum + Number(option.stockQuantity || 0), 0),
    availableStock: active.reduce((sum, option) => sum + Number(option.stockQuantity || 0), 0),
    standardPrice: active.length ? Math.min(...active.map(option => Number(option.standardPrice || 0))) : 0,
    dealerPrice: active.length ? Math.min(...active.map(option => Number(option.dealerPrice) > 0 ? Number(option.dealerPrice) : Number(option.standardPrice || 0))) : 0,
  };
};

export const selectedVariantProduct = (product, variantId, { includeInactive = false } = {}) => {
  if (!hasVariants(product)) return variantId ? null : product;
  const option = product.variants.find(item => String(item._id) === String(variantId));
  if (!option || (!includeInactive && option.isActive === false)) return null;
  const plain = typeof product.toObject === 'function' ? product.toObject() : product;
  return { ...plain, _variantId: String(option._id), variantId: String(option._id), variant: option.name,
    name: `${product.name} — ${option.name}`, sku: option.sku || product.sku,
    standardPrice: option.standardPrice, dealerPrice: option.dealerPrice,
    applicablePrice: option.applicablePrice, stockQuantity: option.isActive === false ? 0 : option.stockQuantity, availableStock: option.isActive === false ? 0 : option.stockQuantity,
    stockStatus: option.isActive !== false && option.stockQuantity > 0 ? (product.isLowStock ? 'low-stock' : 'in-stock') : 'out-of-stock',
  };
};
