import { lazy } from 'react';

const RELOAD_FLAG = 'vinexus:chunk-reload';

// After a deploy, an open tab may request hashed chunks that no longer exist.
// Reload once to pick up the new index.html instead of showing an error page.
export const lazyWithRetry = (importer) => lazy(async () => {
  try {
    const module = await importer();
    try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* storage unavailable */ }
    return module;
  } catch (error) {
    let alreadyReloaded = false;
    try { alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1'; } catch { /* storage unavailable */ }
    if (!alreadyReloaded) {
      try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch { /* storage unavailable */ }
      window.location.reload();
      return new Promise(() => {});
    }
    throw error;
  }
});

export default lazyWithRetry;
