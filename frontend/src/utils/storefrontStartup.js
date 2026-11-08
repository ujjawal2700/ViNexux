// Server-rendered public presentation data is valid only for this document's
// homepage for up to two minutes; no persistent storage.
export function readStorefrontStartup() {
  if (typeof document === 'undefined' || window.location.pathname !== '/') return null;
  try {
    const data = JSON.parse(document.getElementById('storefront-startup')?.textContent || 'null');
    const age = Date.now() - data?.createdAt;
    return data?.version === 1 && age >= -60000 && age < 120000 && data.settings && !data.settings.maintenanceEnabled ? data : null;
  } catch { return null; }
}
export const storefrontStartup = readStorefrontStartup();
