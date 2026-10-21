import { productIdFromPath, renderSocialHtml } from '../../shared/socialMetadata.js';

export const renderSharePage = async ({ html, pathname, origin, apiBase, fetchImpl = fetch }) => {
  const productId = productIdFromPath(pathname);
  const read = async path => {
    const response = await fetchImpl(`${apiBase.replace(/\/$/, '')}${path}`, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Public metadata API returned ${response.status}`);
    return response.json();
  };
  const [settingsResult, productResult] = await Promise.allSettled([
    read('/content/website-settings'),
    productId ? read(`/products/${productId}`) : Promise.resolve(null),
  ]);
  const settingsResponse = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
  const productResponse = productResult.status === 'fulfilled' ? productResult.value : null;
  const settings = settingsResponse?.data?.settings || settingsResponse?.settings || settingsResponse?.data || {};
  const product = productResponse?.data?.product || productResponse?.product || productResponse?.data || null;
  return {
    html: renderSocialHtml(html, { pathname, origin, settings, product }),
    // Never cache a backend outage as a product's permanent preview.
    cacheable: settingsResult.status === 'fulfilled' && productResult.status === 'fulfilled',
  };
};
