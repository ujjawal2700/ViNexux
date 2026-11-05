import { productIdFromPath } from '../../shared/socialMetadata.js';
import { renderSeoHtml, routeMetadata } from '../../shared/seo.js';

export const renderSharePage = async ({ html, pathname, origin, apiBase, fetchImpl = fetch }) => {
  try {
    const response = await fetchImpl(`${apiBase.replace(/\/$/, '')}/seo/page?path=${encodeURIComponent(pathname)}`, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Public SEO API returned ${response.status}`);
    const payload = await response.json();
    const page = payload.data?.page;
    if (!page?.status) throw new Error('Invalid public SEO response');
    return { html: renderSeoHtml(html, page, origin), status: page.status, redirect: page.redirect,
      robots: page.metadata?.robots, cacheable: page.status === 200 && !page.metadata?.robots?.includes('noindex') };
  } catch {
    const metadata = routeMetadata({ pathname, origin });
    if (productIdFromPath(pathname)) metadata.image = '';
    return { html: renderSeoHtml(html, { pathname, metadata: { ...metadata, heading: 'Temporarily unavailable', description: 'Please try again shortly.' } }, origin), status: 503, cacheable: false };
  }
};
