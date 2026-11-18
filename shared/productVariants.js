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

export const mergeVariantSpecifications = (base = [], overrides = []) => {
  const result = base.map(row => ({ key: row.key, value: row.value }));
  for (const override of overrides) {
    const key = override.key.trim();
    const index = result.findIndex(row => row.key.trim().toLowerCase() === key.toLowerCase());
    if (index >= 0) result[index] = { key: result[index].key, value: override.value };
    else result.push({ key, value: override.value });
  }
  return result;
};
export const variantDefinitionSnapshot = rows => (rows || []).map(row => ({
  _id: String(row._id || ''), name: row.name, sku: row.sku || '', modelNumber: row.modelNumber || '', model: row.model || '',
  standardPrice: row.standardPrice, dealerPrice: row.dealerPrice || 0, stockQuantity: row.stockQuantity, isActive: row.isActive !== false,
  images: (row.images || []).map(image => ({ url: image.url, publicId: image.publicId || '', altText: image.altText || '', sortOrder: image.sortOrder || 0 })),
  specifications: (row.specifications || []).map(row => ({ key: row.key, value: row.value })),
}));

export const selectedVariantProduct = (product, variantId, { includeInactive = false } = {}) => {
  if (!hasVariants(product)) return variantId ? null : product;
  const option = product.variants.find(item => String(item._id) === String(variantId));
  if (!option || (!includeInactive && option.isActive === false)) return null;
  const plain = typeof product.toObject === 'function' ? product.toObject() : product;
  return { ...plain, _variantId: String(option._id), variantId: String(option._id), variant: option.name,
    name: `${product.name} — ${option.name}`, sku: option.sku || product.sku,
    modelNumber: option.modelNumber?.trim() || product.modelNumber, model: option.model?.trim() || product.model,
    images: option.images?.length ? option.images : plain.images,
    specifications: mergeVariantSpecifications(plain.specifications, option.specifications),
    standardPrice: option.standardPrice, dealerPrice: option.dealerPrice,
    applicablePrice: option.applicablePrice, stockQuantity: option.isActive === false ? 0 : option.stockQuantity, availableStock: option.isActive === false ? 0 : option.stockQuantity,
    stockStatus: option.isActive !== false && option.stockQuantity > 0 ? (product.isLowStock ? 'low-stock' : 'in-stock') : 'out-of-stock',
  };
};
