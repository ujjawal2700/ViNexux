import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import categoryService from '../../services/categoryService';
import productService from '../../services/productService';
import ProductCard from '../../components/products/ProductCard';
import BrandCarousel from '../../components/home/BrandCarousel';
import CategorySlider from '../../components/home/CategorySlider';

export const HomePage = () => {
  // Categories
  const [categories, setCategories] = useState([]);

  // Products state
  const [allProducts, setAllProducts] = useState([]);
  const [updatedProducts, setUpdatedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [desktopProducts, setDesktopProducts] = useState([]);
  const [securityProducts, setSecurityProducts] = useState([]);
  const [networkingProducts, setNetworkingProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all homepage data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Categories
      try {
        const catRes = await categoryService.getCategories({ limit: 25, isActive: true });
        const catList = catRes.data?.categories || catRes.categories || [];
        setCategories(catList);
      } catch (e) {
        console.warn('Category fetch error:', e);
      }

      // 2. Fetch Products
      try {
        const prodRes = await productService.getProducts({ isActive: true, limit: 40 });
        const prodList = prodRes.data?.products || prodRes.products || [];
        setAllProducts(prodList);

        // Slice products into requested sections (exactly 6 products per row like Mega Jaipur)
        setUpdatedProducts(prodList.slice(0, 6));
        setNewArrivals([...prodList].reverse().slice(0, 6));

        // Desktop category products
        const desktops = prodList.filter((p) => {
          const name = (p.name || '').toLowerCase();
          const cat = (p.category?.name || p.category || '').toLowerCase();
          return (
            name.includes('desktop') ||
            name.includes('pc') ||
            name.includes('all in one') ||
            name.includes('aio') ||
            cat.includes('desktop')
          );
        });
        setDesktopProducts(desktops.length > 0 ? desktops.slice(0, 6) : prodList.slice(0, 6));

        // Security / CCTV category products
        const security = prodList.filter((p) => {
          const name = (p.name || '').toLowerCase();
          const cat = (p.category?.name || p.category || '').toLowerCase();
          return (
            name.includes('camera') ||
            name.includes('cctv') ||
            name.includes('dvr') ||
            name.includes('nvr') ||
            cat.includes('security') ||
            cat.includes('cctv')
          );
        });
        setSecurityProducts(security.length > 0 ? security.slice(0, 6) : prodList.slice(0, 6));

        // Networking category products
        const networking = prodList.filter((p) => {
          const name = (p.name || '').toLowerCase();
          const cat = (p.category?.name || p.category || '').toLowerCase();
          return (
            name.includes('router') ||
            name.includes('switch') ||
            name.includes('poe') ||
            name.includes('wifi') ||
            cat.includes('router') ||
            cat.includes('switch')
          );
        });
        setNetworkingProducts(networking.length > 0 ? networking.slice(0, 6) : prodList.slice(4, 10));
      } catch (e) {
        console.error('Products fetch error:', e);
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
      
      {/* 1. HERO WIDE BANNER (Single Clean CCTV Image Banner - Full Width Edge to Edge) */}
      <section className="relative w-full overflow-hidden">
        <div className="relative w-full h-[180px] sm:h-[230px] md:h-[280px] lg:h-[340px] xl:h-[380px] 2xl:h-[420px] overflow-hidden bg-white">
          <Link to="/products?search=CCTV" className="block w-full h-full group" title="ViNexus Advanced 4K AI Surveillance & Enterprise CCTV">
            <img
              src="/banners/cctv_hero_banner.jpg"
              alt="ViNexus Advanced 4K AI Surveillance & Enterprise CCTV"
              className="w-full h-full object-cover object-center group-hover:opacity-95 transition-opacity"
            />
          </Link>
        </div>
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

        {/* Full-width Responsive Grid: Max 6 columns on desktop/wide displays */}
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

      {/* 6. DESKTOP HEADER CATEGORY SECTION WITH PRODUCTS FOR ADD TO CART */}
      <section className="w-full px-3 sm:px-6 lg:px-8 2xl:px-12 space-y-3 pt-2 sm:pt-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight text-left">
            Desktop & Workstation Systems
          </h2>
          <Link
            to="/products?search=Desktop"
            className="text-xs font-semibold text-primary hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-3 sm:gap-4">
          {desktopProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>

      {/* 7. NEXT CATEGORY SECTION: CCTV CAMERAS & SECURITY HARDWARE */}
      <section className="w-full px-3 sm:px-6 lg:px-8 2xl:px-12 space-y-3 pt-2 sm:pt-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight text-left">
            CCTV Cameras & Security Systems
          </h2>
          <Link
            to="/products?search=CCTV"
            className="text-xs font-semibold text-primary hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-3 sm:gap-4">
          {securityProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>

      {/* 8. NEXT CATEGORY SECTION: ROUTERS & ENTERPRISE POE NETWORKING */}
      <section className="w-full px-3 sm:px-6 lg:px-8 2xl:px-12 space-y-3 pt-2 sm:pt-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight text-left">
            Routers, Gigabit Switches & Networking
          </h2>
          <Link
            to="/products?search=Routers"
            className="text-xs font-semibold text-primary hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-3 sm:gap-4">
          {networkingProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>

    </div>
  );
};

export default HomePage;
