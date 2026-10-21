# WhatsApp product previews: live nginx routing

The live product URL `/products/6ad3b5ca8cef33cb419f9cc5` was checked with the `facebookexternalhit/1.1` user agent. It returns the static 7,006-byte app shell, with `og:type=website`, the homepage `og:url`, and `/social-preview.png` as its image.

The same server's `/api/share-page?path=/products/6ad3b5ca8cef33cb419f9cc5` returns the correct Trueview product name, specifications and Cloudinary product photo. The renderer and product API are deployed and working. The public page URL bypasses that renderer. Changing React metadata again will not resolve this response.

## Apply to the existing nginx site

Use `backend/deploy/storefront-pages.nginx.conf` inside the existing `vinexus.in` server block. Replace the existing `location /` and any exact root/index locations with these blocks; do not append duplicate locations. Keep the existing document root, static asset locations, HTTPS settings, and `/api/` proxy. The snippet internally routes page requests through that existing API proxy and does not assume its upstream port.

Back up the active nginx site configuration, apply the blocks, run `sudo nginx -t`, and reload with `sudo systemctl reload nginx` only if validation succeeds. This is a server configuration change; a frontend build alone cannot apply it.

## Verify the actual shared URL

```sh
curl -fsS -A 'facebookexternalhit/1.1' \
  'https://vinexus.in/products/6ad3b5ca8cef33cb419f9cc5' \
  | rg '<title|property="og:(title|description|image|url|type)"'
```

The response must name the Trueview camera, have `og:type=product`, use that product's URL and Cloudinary photo, and contain no `/social-preview.png`. Also check an actual category-based product URL copied from the storefront. Static CSS/JS and API requests must continue to work.

The live nginx configuration has not been changed from this workspace. No server deployment connection is configured in this repository.
