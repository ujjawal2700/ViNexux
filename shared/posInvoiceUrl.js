// Link to the customer portal, never to the admin's API address.
export function publicInvoiceUrl(token, { publicSiteUrl, origin, production = false } = {}) {
  if (!/^[a-f\d]{64}$/.test(token || '')) return null;
  try {
    const base = new URL(publicSiteUrl?.trim() || (production ? 'https://vinexus.in' : origin));
    const local = base.hostname === 'localhost' || base.hostname === '127.0.0.1' || base.hostname === '[::1]';
    const runtime = origin ? new URL(origin) : null;
    // Vite serves plain HTTP locally. Numeric loopback avoids cached HTTPS
    // upgrades for localhost when following the link from another site/app.
    if (local && !production && runtime?.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(runtime.hostname)) {
      base.protocol = 'http:';
      base.hostname = '127.0.0.1';
      base.port = runtime.port;
    }
    if ((base.protocol !== 'https:' && !(base.protocol === 'http:' && local && !production)) || base.username || base.password) return null;
    return new URL(`/invoices/${token}`, base).href;
  } catch { return null; }
}
