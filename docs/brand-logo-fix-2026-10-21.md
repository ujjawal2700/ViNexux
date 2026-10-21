# Brand logo upload fix — 21 October 2026

The brand form uploaded logos through `/admin/upload/image`, which requires the separate Shared media uploads permission. A brand editor with Brands read/write access could create a brand without a logo but received HTTP 403 when attaching a logo. The real HTTP/database regression reproduces this permission mismatch against the old shared endpoint.

Brand logos now use `POST /admin/brands/logo`, protected by Brands write permission. The server fixes the storage folder to `vinexus/brands` and category to `cms`, enforces the existing 5 MB image limit and uses the shared validated PNG/JPG/WebP/SVG-to-WebP processing. Read-only employees cannot upload, and brand access does not grant access to shared media uploads.

The frontend uses this endpoint for both new and edited brands and accepts SVG files whose MIME type is missing or generic. Brand success/error notices now pass the correct props to the toast container, making the result visible. Failed uploads preserve the form and can be retried.

Verification: 437 unit tests and 237 API tests passed; the new isolated MongoDB/HTTP integration passed, including PNG, SVG, generic MIME, no-logo creation, super admins, read-only permissions, invalid/script files, empty uploads and oversized images. Three browser regressions passed in development and again against the compiled production build. Build and lint passed (existing lint and bundle-size warnings remain). Live Cloudinary credentials were not exercised; the integration uses the development storage provider after the real image-conversion pipeline.

Deploy the frontend and backend together because the form now calls the new brand-logo route. These changes have not been pushed or deployed.
