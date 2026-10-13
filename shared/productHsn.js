// Preserve codes as text, including leading zeros. Older products used specifications.
export const getProductHsnCode = (product) => String(product?.hsnCode ||
  product?.specifications?.find((spec) => /^hsn(?:\/sac|\s*code)?$/i.test(spec.key?.trim() || ''))?.value || '').trim();
