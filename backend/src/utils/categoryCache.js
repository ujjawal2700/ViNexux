// In-process cache for the public category tree. The tree is read on almost
// every catalog request but changes rarely, so it is rebuilt at most once per
// TTL. Category model hooks call invalidate() on every write in this process;
// the TTL bounds staleness for writes from scripts or other server instances.
const TTL_MS = 30 * 1000;

let cached = null;
let cachedAt = 0;
let pending = null;
let generation = 0;

export const getCachedCategories = async (loader) => {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;
  if (pending) return pending;

  const loadGeneration = generation;
  pending = loader()
    .then((rows) => {
      // A write landed while loading: serve this result but do not keep it.
      if (loadGeneration === generation) {
        cached = rows;
        cachedAt = Date.now();
      }
      return rows;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
};

export const invalidateCategoryCache = () => {
  generation += 1;
  cached = null;
  pending = null;
};
