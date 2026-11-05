export const isAdminAppPath = pathname => /^\/admin(?:\/|$)/.test(String(pathname).split(/[?#]/)[0]);
export const pwaConfig = pathname => isAdminAppPath(pathname)
  ? { manifest: '/admin/manifest.webmanifest', name: 'ViNexus Admin', icon: '/pwa/icon-192.png', color: '#800020' }
  : { manifest: '/manifest.webmanifest', name: 'ViNexus', icon: '/pwa/icon-192.png', color: '#800020' };
export const renderPwaHtml = (html, pathname) => {
  const app = pwaConfig(pathname);
  return html.replace(/(<link\b[^>]*\brel=["']manifest["'][^>]*\bhref=["'])[^"']*(["'][^>]*>)/i, `$1${app.manifest}$2`)
    .replace(/(<meta\b[^>]*\bname=["'](?:application-name|apple-mobile-web-app-title)["'][^>]*\bcontent=["'])[^"']*(["'][^>]*>)/gi, `$1${app.name}$2`);
};
