export default async function sitemap(req, res) {
  const file = String(req.query?.file || 'sitemap.xml');
  if (!/^sitemap(?:-pages|-products-[1-9]\d*)?\.xml$/.test(file)) return res.status(404).end();
  const apiBase = process.env.API_BASE_URL || process.env.VITE_API_BASE_URL;
  if (!/^https?:\/\//i.test(apiBase || '')) return res.status(503).end();
  try {
    const response = await fetch(`${apiBase.replace(/\/$/, '')}/seo/${file}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) { res.setHeader('Cache-Control', 'no-store'); if (response.status === 503) res.setHeader('Retry-After', '60'); return res.status(response.status).end(); }
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
    res.status(200).send(await response.text());
  } catch { res.setHeader('Retry-After', '60'); res.status(503).end(); }
}
