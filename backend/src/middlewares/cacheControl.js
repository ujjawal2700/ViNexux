// Short-lived HTTP caching for public, user-independent GET responses.
// Requests carrying credentials (signed-in shoppers, admins) bypass it so
// an admin never sees a stale list right after editing.
export const publicCache = (maxAgeSeconds = 60, staleSeconds = 300) => (req, res, next) => {
  if (req.method === 'GET' && !req.headers.authorization) {
    res.set('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleSeconds}`);
  } else {
    res.set('Cache-Control', 'private, no-cache');
  }
  next();
};

export default publicCache;
