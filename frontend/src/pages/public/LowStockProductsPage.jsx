import React from 'react';
import ProductsPage from './ProductsPage';

// Share catalog filters, pagination, sorting and product cards with the store.
export const LowStockProductsPage = () => <ProductsPage lowStockOnly />;
export default LowStockProductsPage;
