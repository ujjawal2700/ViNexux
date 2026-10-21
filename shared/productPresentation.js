export const isWarrantyLink = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
  } catch { return false; }
};

export const productModelVariant = (product) => {
  const model = product?.model?.trim();
  const specificationModel = product?.specifications?.find(spec => spec.key?.trim().toLowerCase() === 'model')?.value?.trim();
  const values = [model && model !== 'Standard Model' ? model : specificationModel, product?.variant?.trim()].filter(Boolean);
  return [...new Set(values)].join(' / ');
};
