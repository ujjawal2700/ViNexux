import contentService from '../../services/contentService';
import { ErrorState } from '../../components/ui/ErrorState';
import useAuth from '../../hooks/useAuth';
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import categoryService from '../../services/categoryService';
import productService from '../../services/productService';
import ProductCard from '../../components/products/ProductCard';
import BrandCarousel from '../../components/home/BrandCarousel';
import CategorySlider from '../../components/home/CategorySlider';
import HeroBannerSlider from '../../components/home/HeroBannerSlider';
import Skeleton, { BrandCarouselSkeleton, ProductCardSkeleton } from '../../components/ui/Skeleton';

const HomePageSkeleton = () => (
  <div className="w-full min-h-screen bg-gray-50 pb-16 space-y-6 sm:space-y-8" role="status" aria-label="Loading storefront">
    <Skeleton className="w-full h-[200px] sm:h-[260px] md:h-[320px] lg:h-[380px] xl:h-[430px] 2xl:h-[460px] rounded-none" />

    <div className="w-full px-3 sm:px-6 lg:px-8 2xl:px-12">
      <BrandCarouselSkeleton count={8} className="px-0" />
    </div>

    <div className="w-full px-3 sm:px-6 lg:px-8 2xl:px-12 space-y-4">
      <Skeleton className="h-6 w-44" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </div>
    <span className="sr-only">Loading catalog</span>
  </div>
);

export const HomePage = () => {
  const { user } = useAuth();
  const [banners, setBanners] = useState([]);
  const [error, setError] = useState(null);
  // Slider categories
  const [categories, setCategories] = useState([]);

  // Products state
  const [updatedProducts, setUpdatedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [headerCategorySections, setHeaderCategorySections] = useState([]);
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
      const [bannerResponse, catRes, featured, newest] = await Promise.all([
        contentService.getBanners(),
        categoryService.getCategoryTree(),
        productService.getProducts({ sortBy: 'updatedAt', sortOrder: 'desc', limit: 6 }),
        productService.getProducts({ sortBy: 'createdAt', sortOrder: 'desc', limit: 6 }),
      ]);
      setBanners((bannerResponse.data?.banners || []).map((banner) => ({ ...banner, id: banner._id, image: banner.image?.url, link: banner.link || '/' })));
      const rootCats = (catRes.data?.categories || []).filter((category) => !category.parentId);
      setCategories(rootCats);
      setUpdatedProducts(featured.data?.products || []);
      setNewArrivals(newest.data?.products || []);
      setIsLoading(false);

      // Category product rows are below the fold. Load them after the main
      // storefront is visible so they do not block the hero banner.
      const sectionResults = await Promise.allSettled(rootCats.map(async (category) => {
        const response = await productService.getProducts(
          { categoryId: category._id, limit: 8 }
        );
        return { category, products: response.data?.products || [] };
      }));
      const sections = sectionResults
        .filter((result) => result.status === 'fulfilled' && result.value.products.length)
        .map((result) => result.value);
      setHeaderCategorySections(sections);
    } catch {
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
    <div className="w-full bg-gray-50 pb-16 space-y-6 sm:space-y-8">
      
      {/* 1. HERO WIDE BANNER SLIDER */}
      <section className="relative w-full overflow-hidden shadow-xs">
        <HeroBannerSlider slides={banners} />
      </section>

      {/* 2. ALL BRANDS WITH LOGOS SLIDING RIGHT TO LEFT */}
      <section className="w-full">
        <BrandCarousel />
      </section>

      {/* 3. ALL HEADER CATEGORIES WITH LOGOS / ICONS SLIDING */}
      <section className="w-full">
        <CategorySlider categories={categories} />
      </section>

      {/* 4. UPDATED PRODUCTS SECTION (Full Width Grid - Exactly 6 per row) */}
      <section className="w-full px-3 sm:px-6 lg:px-8 2xl:px-12 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight text-left">
            Updated Products
          </h2>
          <Link
            to="/"
            className="text-xs font-semibold text-primary hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-3 sm:gap-4">
          {updatedProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>

      {/* 5. NEW ARRIVALS SECTION (Full Width Grid - Exactly 6 per row) */}
      <section className="w-full px-3 sm:px-6 lg:px-8 2xl:px-12 space-y-3 pt-2 sm:pt-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight text-left">
            New Arrivals
          </h2>
          <Link
            to="/"
            className="text-xs font-semibold text-primary hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-3 sm:gap-4">
          {newArrivals.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>

      {/* 6. HEADER CATEGORIES LINE BY LINE (Matching Mega Jaipur Image 4 & 5)
             - Renders each real Header Category in line-by-line sequence (Desktop, Laptop, Storage, etc.)
             - Max 8 products per category
             - NO "View All" link
      */}
      {headerCategorySections.map((section) => (
        <section
          key={section.category._id || section.category.slug}
          className="w-full px-3 sm:px-6 lg:px-8 2xl:px-12 space-y-3 pt-2 sm:pt-4"
        >
          {/* Category Header: Name only (NO View All option, matching Mega Jaipur) */}
          <div className="border-b border-gray-200 pb-2">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight text-left">
              {section.category.name}
            </h2>
          </div>

          {/* Up to 8 Products in responsive grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-3 sm:gap-4">
            {section.products.slice(0, 8).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      ))}

    </div>
  );
};

export default HomePage;
