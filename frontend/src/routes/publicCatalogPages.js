import lazyWithRetry from '../utils/lazyWithRetry';
export const ProductsPage = lazyWithRetry(() => import('../pages/public/ProductsPage'));
export const ProductDetailPage = lazyWithRetry(() => import('../pages/public/ProductDetailPage'));
