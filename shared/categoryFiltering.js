export const CATEGORY_FILTER_KEYS = ['headerCategory', 'mainCategory', 'subCategory'];
export const splitFilterValues = value => [...new Set(String(value || '').split(',').map(item => item.trim()).filter(Boolean))];
export const categoryLevels = categories => {
  const byId = new Map(categories.map(category => [String(category._id), category]));
  const levels = new Map();
  for (const category of categories) {
    let current = category, depth = 0;
    const seen = new Set();
    while (current && !seen.has(String(current._id))) {
      seen.add(String(current._id)); depth++;
      current = byId.get(String(current.parentId?._id || current.parentId || ''));
    }
    levels.set(String(category._id), Math.min(depth, 3));
  }
  return levels;
};
export const readCategorySelections = (params, categories, routeCategory = null) => {
  const levels = categoryLevels(categories);
  const result = Object.fromEntries(CATEGORY_FILTER_KEYS.map(key => [key, splitFilterValues(params.get(key))]));
  const legacy = splitFilterValues(params.get('categoryId') || params.get('category'));
  if (routeCategory) legacy.push(String(routeCategory._id));
  for (const value of legacy) {
    const category = categories.find(item => String(item._id) === value || item.slug?.toLowerCase() === value.toLowerCase());
    if (!category) continue;
    const key = CATEGORY_FILTER_KEYS[(levels.get(String(category._id)) || 1) - 1];
    result[key].push(String(category._id));
  }
  for (const key of CATEGORY_FILTER_KEYS) result[key] = [...new Set(result[key].map(value => {
    const category = categories.find(item => String(item._id) === value || item.slug?.toLowerCase() === value.toLowerCase());
    return category ? String(category._id) : value;
  }))];
  return result;
};
export const readSpecificationSelections = value => {
  try {
    const parsed = JSON.parse(value || '{}');
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return {};
    const result = Object.create(null), keys = new Map();
    for (const [rawKey, values] of Object.entries(parsed)) {
      if (!rawKey.trim() || !Array.isArray(values) || !values.every(item => typeof item === 'string')) continue;
      const normalized = rawKey.trim().toLowerCase();
      const key = keys.get(normalized) || rawKey.trim(); keys.set(normalized, key);
      result[key] = [...new Set([...(result[key] || []), ...values])];
    }
    return Object.fromEntries(Object.entries(result));
  } catch { return {}; }
};

export const specificationFilterValues = (filters, key) => Object.entries(filters).find(([name]) => name.toLowerCase() === key.toLowerCase())?.[1] || [];
