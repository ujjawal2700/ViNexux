// Share public, price-free content between the layout and page. Never cache
// customer carts, authentication, product prices or admin responses here.
const requests = new Map();
export function publicRequest(key, loader, ttl = 15000) {
  const cached = requests.get(key);
  if (cached && (cached.pending || cached.expires > Date.now())) return cached.promise;
  const entry = { pending: true, expires: 0 };
  entry.promise = Promise.resolve().then(loader).then(value => {
    entry.pending = false; entry.expires = Date.now() + ttl; return value;
  }, error => { if (requests.get(key) === entry) requests.delete(key); throw error; });
  requests.set(key, entry); return entry.promise;
}
export function clearPublicRequests() { requests.clear(); }
