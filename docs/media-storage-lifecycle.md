# Upload optimization and storage cleanup

All Cloudinary uploads go through `storageService.uploadFile` before reaching the provider.

- Images are decoded, oriented and resized to fit within 2000 × 2000 without enlargement, then encoded as WebP at quality 80. Bank QR artwork uses lossless WebP. SVGs are validated and rasterized rather than serving uploaded vector source.
- PDFs are validated, their ordinary RGB JPEG scans recompressed at quality 82 and capped at 2000 pixels, and document objects saved using compressed object streams. Text, vectors, page layout, masks and unsupported image encodings are preserved. The smaller of the original and optimized PDF is stored. Digitally signed PDFs retain their original bytes because rewriting invalidates signatures. Invalid/encrypted PDFs and PDFs over 300 pages are rejected. Already optimized files cannot be guaranteed to get smaller.
- Banner videos already pass through the FFmpeg optimization flow before storage.

Replacement uploads persist the new database reference before deleting the old asset. Failed saves discard only the new upload. Product and variant gallery cleanup retains shared images; permanent product deletion includes variant and staging images. CMS banners, promotional banners, trust badges, brand logos, website assets, footer QR/social images, campaign media and dealer documents clean up removed/replaced files. Theme images still referenced by a published theme, another theme or retained history are preserved.

New uploads are recorded in `StorageAsset`. Unreferenced uploads (for example, a generic upload abandoned before Save) become eligible for cleanup after 24 hours. A worker runs every minute, claims up to 50 due records and checks product, dealer document, CMS, footer, theme/history and campaign references before deletion. Retained assets are checked again the next day. Failed deletions use exponential retry up to one day and survive restarts; there is no TTL that could discard unfinished work. Existing Cloudinary files are not mass-deleted or automatically imported into the registry. Legacy files are registered when cleanup is requested.

Cloudinary deletion tries the image, raw-document and video namespaces and requests CDN invalidation. Cloudinary account backups, if enabled, follow the account's own backup-retention settings.

Deployment: run `npm ci` in `backend` to install the new `pdf-lib` dependency and restart/reload the backend. The cleanup worker starts after MongoDB connects; no extra cron or system PDF tool is required.
