// Membership arrays are grouped together so one multi-category product contributes
// once to each ancestor, even when it is assigned to several sibling categories.
export const categoryMembershipStages = [
  { $project: { ids: { $setUnion: [
    { $cond: [{ $ne: [{ $ifNull: ['$categoryId', null] }, null] }, ['$categoryId'], []] },
    { $ifNull: ['$categoryIds', []] },
  ] } } },
  { $group: { _id: '$ids', count: { $sum: 1 } } },
];
export const rollupCategoryCounts = (groups, categories) => {
  const byId = new Map(categories.map(category => [String(category._id), category]));
  const counts = new Map();
  for (const group of groups || []) {
    const included = new Set();
    for (const id of group._id || []) {
      let category = byId.get(String(id));
      const seen = new Set();
      while (category && !seen.has(String(category._id))) {
        const key = String(category._id); seen.add(key); included.add(key);
        category = byId.get(String(category.parentId?._id || category.parentId || ''));
      }
    }
    for (const id of included) counts.set(id, (counts.get(id) || 0) + group.count);
  }
  return counts;
};
export const specificationCountStages = [
  { $unwind: '$specifications' },
  { $match: { 'specifications.key': { $type: 'string' }, 'specifications.value': { $type: 'string' } } },
  { $group: { _id: { product: '$_id', key: { $toLower: { $trim: { input: '$specifications.key' } } }, value: { $trim: { input: '$specifications.value' } } }, displayKey: { $first: '$specifications.key' } } },
  { $group: { _id: { key: '$_id.key', value: '$_id.value' }, key: { $first: '$displayKey' }, count: { $sum: 1 } } },
];
export const availabilityCountStages = [
  { $project: { statuses: { $setUnion: [['$stockStatus'], { $cond: [{ $eq: ['$isLowStock', true] }, ['low-stock'], []] }] } } },
  { $unwind: '$statuses' },
  { $group: { _id: '$statuses', count: { $sum: 1 } } },
];
