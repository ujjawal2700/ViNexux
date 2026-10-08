import contentService from '../../services/contentService';
import { ErrorState } from '../../components/ui/ErrorState';
import useAuth from '../../hooks/useAuth';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import categoryService from '../../services/categoryService';
import productService from '../../services/productService';
import ProductCard from '../../components/products/ProductCard';
import BrandCarousel from '../../components/home/BrandCarousel';
import HeroBentoGrid from '../../components/home/HeroBentoGrid';
import '../../styles/banner-grid.css';
import Skeleton, { BrandCarouselSkeleton, ProductCardSkeleton } from '../../components/ui/Skeleton';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const HomePageSkeleton = () => (
  <div className="w-full min-h-screen bg-[var(--store-background)] pb-16 space-y-6 sm:space-y-8" role="status" aria-label="Loading storefront">
    <div className="hero-bento-grid storefront-container">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className={`bento-banner-tile bento-banner-tile-${i + 1}`} />)}</div>

    <div className="storefront-container px-3 sm:px-6 lg:px-8 2xl:px-12">
      <BrandCarouselSkeleton count={8} className="px-0" />
    </div>

    <div className="storefront-container px-3 sm:px-6 lg:px-8 2xl:px-12 space-y-4">
      <Skeleton className="h-6 w-44" />
      <div className="home-product-grid gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </div>
    <span className="sr-only">Loading catalog</span>
  </div>
);

export const HomePage = () => {
  const { user } = useAuth();
  const [bannerGrid, setBannerGrid] = useState(null);
  const [error, setError] = useState(null);
  // Slider categories
  const [categories, setCategories] = useState([]);

  // Products state
  const [updatedProducts, setUpdatedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingSkeleton, setShowLoadingSkeleton] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowLoadingSkeleton(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setShowLoadingSkeleton(true), 300);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  // Load all homepage data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [catRes, featured, newest, allRes, gridResponse] = await Promise.all([
        categoryService.getCategoryTree(),
        productService.getProducts({ sortBy: 'stockUpdatedAt', sortOrder: 'desc', limit: 8, includeFacets: false }),
        productService.getProducts({ sortBy: 'createdAt', sortOrder: 'desc', limit: 8, includeFacets: false }),
        productService.getProducts({ page: 1, limit: 16, includeFacets: false }),
        contentService.getBannerGrid().catch(() => ({ data: { grid: null } })),
      ]);
      setBannerGrid(gridResponse.data?.grid || null);
      const rootCats = (catRes.data?.categories || []).filter((category) => !category.parentId);
      setCategories(rootCats);
      setUpdatedProducts(featured.data?.products || []);
      setNewArrivals(newest.data?.products || []);
      setAllProducts(allRes.data?.products || []);
    } catch (err) {
      if (axios.isCancel(err)) return;
      setError('Unable to load the storefront. Please retry.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.dealerStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (error) return <ErrorState title="Storefront unavailable" description={error} onRetry={loadData} />;
  if (isLoading && showLoadingSkeleton) return <HomePageSkeleton />;

  return (
    <div className="theme-home w-full max-w-full bg-[var(--store-background)] pb-16 space-y-6 sm:space-y-8 overflow-x-hidden">
      
      {/* Four independently rotating collections, not a full-width carousel. */}
      <HeroBentoGrid grid={bannerGrid} />

      {/* 2. ALL BRANDS WITH LOGOS SLIDING RIGHT TO LEFT */}
      <section className="w-full">
        <BrandCarousel />
      </section>

      {/* 3. UPDATED PRODUCTS SECTION */}
      {updatedProducts.length > 0 && (
        <section className="storefront-container px-3 sm:px-6 lg:px-8 2xl:px-12 space-y-3">
          <div className="border-b border-[var(--store-border)] pb-2">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--store-text)] tracking-tight text-left">
              Updated Products
            </h2>
          </div>

          <div className="home-product-grid gap-3 sm:gap-4">
            {updatedProducts.slice(0, 8).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 4. NEW ARRIVALS SECTION */}
      {newArrivals.length > 0 && (
        <section className="storefront-container px-3 sm:px-6 lg:px-8 2xl:px-12 space-y-3 pt-2 sm:pt-4">
          <div className="border-b border-[var(--store-border)] pb-2">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--store-text)] tracking-tight text-left">
              New Arrivals
            </h2>
          </div>

          <div className="home-product-grid gap-3 sm:gap-4">
            {newArrivals.slice(0, 8).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 5. ALL PRODUCTS SECTION (2 horizontal rows of products + Show All button in front) */}
      {allProducts.length > 0 && (
        <section className="storefront-container px-3 sm:px-6 lg:px-8 2xl:px-12 space-y-3 pt-2 sm:pt-4">
          <div className="flex items-center justify-between border-b border-[var(--store-border)] pb-2">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--store-text)] tracking-tight text-left">
              All Products
            </h2>
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[var(--store-primary)] bg-[var(--store-surface)] text-xs sm:text-sm font-semibold text-[var(--store-primary)] hover:bg-[var(--store-primary)] hover:text-white shadow-2xs transition-all cursor-pointer"
            >
              <span>Show All</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="home-product-grid gap-3 sm:gap-4">
            {allProducts.slice(0, 16).map((product, index) => {
              // Hide overflow items dynamically to always maintain exactly 2 horizontal lines
              let breakpointClass = '';
              if (index >= 12) {
                breakpointClass = 'hidden 2xl:block';
              } else if (index >= 8) {
                breakpointClass = 'hidden xl:block';
              } else if (index >= 6) {
                breakpointClass = 'hidden md:block';
              } else if (index >= 4) {
                breakpointClass = 'hidden sm:block';
              }

              return (
                <div key={product._id} className={breakpointClass}>
                  <ProductCard product={product} />
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
};

export default HomePage;
