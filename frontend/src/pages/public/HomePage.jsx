import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import categoryService from '../../services/categoryService';
import productService from '../../services/productService';
import ProductCard from '../../components/products/ProductCard';
import BrandCarousel from '../../components/home/BrandCarousel';
import CategorySlider from '../../components/home/CategorySlider';
import HeroBannerSlider from '../../components/home/HeroBannerSlider';

export const HomePage = () => {
  // Slider categories
  const [categories, setCategories] = useState([]);

  // Products state
  const [updatedProducts, setUpdatedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [headerCategorySections, setHeaderCategorySections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all homepage data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Categories
      let rootCats = [];
      try {
        const catRes = await categoryService.getCategories({ limit: 100, isActive: true });
        const allCats = catRes.data?.categories || catRes.categories || [];
        setCategories(allCats);
        // Extract root/header categories (those with no parentId) in natural order
        rootCats = allCats.filter((c) => !c.parentId);
      } catch (e) {
        console.warn('Category fetch error:', e);
      }

      // 2. Fetch Featured/Updated Products & New Arrivals
      try {
        const prodRes = await productService.getProducts({ isActive: true, limit: 30 });
        const prodList = prodRes.data?.products || prodRes.products || [];
        setUpdatedProducts(prodList.slice(0, 6));
        setNewArrivals([...prodList].reverse().slice(0, 6));
      } catch (e) {
        console.error('Products fetch error:', e);
      }

      // 3. Fetch products for all Header Categories line by line (max 8 products, no View All)
      if (rootCats.length > 0) {
        try {
          const sections = await Promise.all(
            rootCats.map(async (cat) => {
              try {
                const res = await productService.getProducts({
                  categoryId: cat._id,
                  isActive: true,
                  limit: 8,
                });
                const prods = res.data?.products || res.products || [];
                return {
                  category: cat,
                  products: prods.slice(0, 8),
                };
              } catch (err) {
                console.warn(`Failed to load products for header category ${cat.name}:`, err);
                return { category: cat, products: [] };
              }
            })
          );
          // Only show categories that have products available
          setHeaderCategorySections(sections.filter((s) => s.products && s.products.length > 0));
        } catch (err) {
          console.error('Failed to load header category sections:', err);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="w-full bg-gray-50 pb-16 space-y-6 sm:space-y-8">
      
      {/* 1. HERO WIDE BANNER SLIDER */}
      <section className="relative w-full overflow-hidden shadow-xs">
        <HeroBannerSlider />
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
            to="/products"
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
            to="/products"
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
