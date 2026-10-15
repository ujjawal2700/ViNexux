import { compareHeaderProductPositions, hasProductPosition } from '../../../shared/headerProductPositioning.js';

export const categoryProductPriorities = (categories) => {
  const headers = categories.filter(category => !category.parentId).sort(compareHeaderProductPositions);
  const byId = new Map(categories.map(category => [String(category._id), category]));
  const rank = new Map(headers.filter(hasProductPosition).map((category, index) => [String(category._id), index]));
  return categories.map(category => {
    let current = category;
    const seen = new Set();
    while (current && !seen.has(String(current._id))) {
      seen.add(String(current._id));
      if (!current.parentId) return { id: category._id, priority: rank.get(String(current._id)) ?? headers.length };
      current = byId.get(String(current.parentId?._id || current.parentId || ''));
    }
    return { id: category._id, priority: headers.length };
  });
};

// Each header has a unique rank, including the assignment sequence for ties.
// All its descendants share that rank, keeping the whole header's products
// together. A product assigned to multiple headers uses the earliest one.
export const storefrontOrderingStages = (categories) => {
  const priorities = categoryProductPriorities(categories);
  const unranked = categories.length + 1;
  const memberships = { $setUnion: [
    { $ifNull: ['$categoryIds', []] }, [{ $ifNull: ['$categoryId', null] }],
  ] };
  const rank = priorities.length ? { $min: priorities.map(({ id, priority }) => ({
    $cond: [{ $in: [{ $literal: id }, memberships] }, priority, unranked],
  })) } : unranked;
  return [{ $set: { _categoryPriority: rank } },
    { $sort: { _categoryPriority: 1, createdAt: -1, _id: 1 } }];
};
