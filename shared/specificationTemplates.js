export const specificationKey = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

// Apply a snapshot: retain existing values, fill empty groups and append new keys.
// Repeated keys with different values represent multi-select specifications.
export const applySpecificationTemplate = (existing = [], template = []) => {
  const occupied = new Set(existing.filter(spec => String(spec.value || '').trim()).map(spec => specificationKey(spec.key)));
  const incoming = template.filter(spec => !occupied.has(specificationKey(spec.key))).map(({ key, value }) => ({ key, value }));
  const incomingKeys = new Set(incoming.map(spec => specificationKey(spec.key)));
  return [
    ...existing.filter(spec => !incomingKeys.has(specificationKey(spec.key))).map(({ key, value }) => ({ key, value })),
    ...incoming,
  ];
};
