import http from 'node:http';
import supertest from 'supertest';
if (process.env.NODE_ENV !== 'test') throw new Error('Test location fixtures must never run outside tests.');
const original = supertest.Test.prototype.end;
// Supply optional audit locations for tests that inspect location metadata.
// Tests can opt out explicitly; this fixture never changes server requirements.
supertest.Test.prototype.end = function (callback) {
  const omit = this.getHeader('X-Test-No-Admin-Location');
  if (!omit && !this.getHeader('X-Admin-Location')) this.set('X-Admin-Location', JSON.stringify({ status: 'available', latitude: 25.18, longitude: 75.85, accuracy: 10, timestamp: Date.now() }));
  return original.call(this, callback);
};
const originalFetch = globalThis.fetch;
if (originalFetch) globalThis.fetch = (input, options = {}) => {
  try {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
      const headers = new Headers(options.headers || (input instanceof Request ? input.headers : undefined));
      const omit = headers.has('X-Test-No-Admin-Location'); headers.delete('X-Test-No-Admin-Location');
      if (!omit && !headers.has('X-Admin-Location')) headers.set('X-Admin-Location', JSON.stringify({ status: 'available', latitude: 25.18, longitude: 75.85, accuracy: 10, timestamp: Date.now() }));
      return originalFetch(input, { ...options, headers });
    }
  } catch { /* Preserve native fetch handling for invalid URLs. */ }
  return originalFetch(input, options);
};

const httpPatch = Symbol.for('vinexus.test.adminLocation.http');
if (!http.request[httpPatch]) {
const originalHttpRequest = http.request;
http.request = function (...args) {
  let index = 0, host;
  if (typeof args[0] === 'string' || args[0] instanceof URL) {
    const url = new URL(args[0]); host = url.hostname;
    if (!args[1] || typeof args[1] !== 'object') args.splice(1, 0, {});
    index = 1;
  } else host = args[0]?.hostname || args[0]?.host || 'localhost';
  if (['127.0.0.1', 'localhost', '[::1]'].includes(host)) {
    const options = args[index], headers = new Headers(options.headers);
    const omit = headers.has('X-Test-No-Admin-Location'); headers.delete('X-Test-No-Admin-Location');
    if (!omit && !headers.has('X-Admin-Location')) headers.set('X-Admin-Location', JSON.stringify({ status: 'available', latitude: 25.18, longitude: 75.85, accuracy: 10, timestamp: Date.now() }));
    args[index] = { ...options, headers: Object.fromEntries(headers) };
  }
  return originalHttpRequest.apply(this, args);
};

http.request[httpPatch] = true;
}
