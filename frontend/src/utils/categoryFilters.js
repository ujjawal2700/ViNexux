export const getEffectiveFilterDefinitions = (categories, categoryId) => {
  if (!categoryId) return [];

  const byId = new Map(categories.map((category) => [String(category._id), category]));
  const lineage = [];
  let current = byId.get(String(categoryId));
  const visited = new Set();

  while (current && !visited.has(String(current._id))) {
    visited.add(String(current._id));
    lineage.unshift(current);
    const parentId = current.parentId?._id || current.parentId;
    current = parentId ? byId.get(String(parentId)) : null;
  }

  const definitions = new Map();
  lineage.forEach((category) => {
    (category.filterDefinitions || []).forEach((definition) => {
      if (definition?.key) definitions.set(definition.key.trim().toLowerCase(), definition);
    });
  });

  return [...definitions.values()].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
};
