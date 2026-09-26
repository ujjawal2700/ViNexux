import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import ProductsPage from '../pages/public/ProductsPage';
import ProductDetailPage from '../pages/public/ProductDetailPage';
import NotFoundPage from '../pages/public/NotFoundPage';
import { RESERVED_ROOT_SLUGS, isProductIdParam } from '../utils/categoryUrls';

/**
 * 1-Segment Category Route: /:headerSlug (e.g. /laptop, /desktop, /security)
 */
export const CategoryRoute = () => {
  const { headerSlug } = useParams();
  const lower = (headerSlug || '').toLowerCase();

  if (RESERVED_ROOT_SLUGS.has(lower)) {
    return <NotFoundPage />;
  }

  return <ProductsPage />;
};

/**
 * 2-Segment Route: /:headerSlug/:param2
 * Dispatches to:
 * - ProductDetailPage if param2 is a product ID (e.g. /laptop/65f1234abcd...)
 * - ProductsPage if param2 is a main category slug (e.g. /laptop/branded-laptop)
 */
export const CategoryLevel2Route = () => {
  const { headerSlug, param2 } = useParams();
  const lowerHeader = (headerSlug || '').toLowerCase();

  if (RESERVED_ROOT_SLUGS.has(lowerHeader)) {
    return <NotFoundPage />;
  }

  if (isProductIdParam(param2)) {
    return <ProductDetailPage />;
  }

  return <ProductsPage />;
};

/**
 * 3-Segment Route: /:headerSlug/:param2/:param3
 * Dispatches to:
 * - ProductDetailPage if param3 is a product ID (e.g. /laptop/branded-laptop/65f1234abcd...)
 * - ProductsPage if param3 is a subcategory slug (e.g. /laptop/laptop-spares/laptop-hinges)
 */
export const CategoryLevel3Route = () => {
  const { headerSlug, param3 } = useParams();
  const lowerHeader = (headerSlug || '').toLowerCase();

  if (RESERVED_ROOT_SLUGS.has(lowerHeader)) {
    return <NotFoundPage />;
  }

  if (isProductIdParam(param3)) {
    return <ProductDetailPage />;
  }

  return <ProductsPage />;
};
