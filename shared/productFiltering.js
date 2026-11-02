export const readProductFilters = value => {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value || '{}') : value;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key, values]) => /^[a-f\d]{24}$/i.test(key) && Array.isArray(values))
      .map(([key, values]) => [key, [...new Set(values.filter(value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)))]]).filter(([, values]) => values.length));
  } catch { return {}; }
};
