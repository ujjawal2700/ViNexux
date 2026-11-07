export const canViewStorefrontPrices = (user) =>
  Boolean(user && ['customer', 'dealer', 'admin'].includes(user.role));

const priceFields = ['standardPrice', 'dealerPrice', 'applicablePrice', 'price', 'mrp', 'originalPrice', 'priceHistory'];
const priceSpecification = /^(?:dealer\s*price|standard\s*price|selling\s*price|price|mrp|discount)$/i;

// Copy rather than mutate shared catalog rows or browser-stored products.
export const withoutStorefrontPrices = (product) => {
  const result = { ...product };
  for (const field of priceFields) delete result[field];
  if (Array.isArray(result.variants)) result.variants = result.variants.map(withoutStorefrontPrices);
  if (Array.isArray(result.specifications)) {
    result.specifications = result.specifications.filter(spec => !priceSpecification.test(spec.key?.trim() || ''));
  }
  return result;
};
