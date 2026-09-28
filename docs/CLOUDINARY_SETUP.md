# Cloudinary setup

The backend owns every upload. The browser never receives the Cloudinary API secret.

Set these variables in `backend/.env` for local development and in the backend hosting provider for production:

```env
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=replace_with_cloud_name
CLOUDINARY_API_KEY=replace_with_api_key
CLOUDINARY_API_SECRET=replace_with_api_secret
```

Restart the backend after changing environment variables. No Cloudinary variables belong in the frontend environment.

Uploads are stored in these folders:

- `vinexus/products/{productId}`
- `vinexus/categories`
- `vinexus/banners`
- `vinexus/promotional-banners`
- `vinexus/trust-badges`

Image files are validated on the backend, resized to a maximum 2000px edge, converted to WebP, uploaded over the Cloudinary SDK, and saved in MongoDB as `{ url, publicId }`. Deleting/replacing managed CMS images also removes the corresponding Cloudinary asset.

For the deployed frontend, set `VITE_API_BASE_URL` to the public backend URL ending in `/api`. Add the deployed frontend domain to backend `CORS_ORIGIN`.
