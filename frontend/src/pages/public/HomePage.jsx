import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import contentService from '../../services/contentService';
import categoryService from '../../services/categoryService';
import productService from '../../services/productService';
import ProductCard from '../../components/products/ProductCard';
import { CoverflowCarousel } from '../../components/ui/CoverflowCarousel';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton, SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Image } from '../../components/ui/Image';
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Award,
  Truck,
  Headphones,
  Sparkles,
  Layers,
} from 'lucide-react';

const HomePage = () => {
  // Section 1: Hero Banners State
  const [banners, setBanners] = useState([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [isBannersLoading, setIsBannersLoading] = useState(true);

  // Section 2: Featured Categories State
  const [categories, setCategories] = useState([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);

  // Section 3: Featured Products State
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);

  // Section 4: Promotional Banners State
  const [promoBanners, setPromoBanners] = useState([]);

  // Section 5: Trust Badges State
  const [trustBadges, setTrustBadges] = useState([]);

  // Load Homepage Data
  const loadHomepageData = useCallback(async () => {
    setIsBannersLoading(true);
    setIsCategoriesLoading(true);
    setIsProductsLoading(true);
    setProductsError(null);

    // Fetch Hero Banners
    try {
      const bannerRes = await contentService.getBanners();
      const bannerList = bannerRes.data?.banners || bannerRes.banners || [];
      setBanners(bannerList);
    } catch (err) {
      console.warn('Hero banners API error:', err);
    } finally {
      setIsBannersLoading(false);
    }

    // Fetch Featured Categories
    try {
      const catRes = await categoryService.getCategories({ limit: 8, isActive: true });
      const catList = catRes.data?.categories || catRes.categories || [];
      setCategories(catList);
    } catch (err) {
      console.warn('Categories API error:', err);
    } finally {
      setIsCategoriesLoading(false);
    }

    // Fetch Featured Products
    try {
      const prodRes = await productService.getProducts({ isFeatured: true, isActive: true, limit: 8 });
      const prodList = prodRes.data?.products || prodRes.products || [];
      setFeaturedProducts(prodList);
    } catch (err) {
      console.error('Featured products API error:', err);
      setProductsError('Failed to load featured products.');
    } finally {
      setIsProductsLoading(false);
    }

    // Fetch Promo Banners
    try {
      const promoRes = await contentService.getPromotionalBanners();
      const promoList = promoRes.data?.promotionalBanners || promoRes.promotionalBanners || [];
      setPromoBanners(promoList);
    } catch (err) {
      console.warn('Promo banners API error:', err);
    }

    // Fetch Trust Badges
    try {
      const trustRes = await contentService.getTrustBadges();
      const trustList = trustRes.data?.trustBadges || trustRes.trustBadges || [];
      setTrustBadges(trustList);
    } catch (err) {
      console.warn('Trust badges API error:', err);
    }
  }, []);

  useEffect(() => {
    loadHomepageData();
  }, [loadHomepageData]);

  // Automatic Banner Carousel Interval
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  return (
    <div className="space-y-16 pb-16 bg-background text-foreground">
      
      {/* 1. HERO BANNER CAROUSEL */}
      <section className="relative bg-gradient-to-b from-muted via-background to-background border-b border-border overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20 relative z-10">
          {isBannersLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-16 w-3/4" />
              <Skeleton className="h-12 w-40" />
            </div>
          ) : banners.length > 0 ? (
            <div className="relative min-h-[380px] flex items-center">
              {banners.map((banner, index) => {
                if (index !== activeBannerIndex) return null;
                return (
                  <div
                    key={banner._id || index}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full animate-fadeIn"
                  >
                    {/* Content Column */}
                    <div className="lg:col-span-7 space-y-6 text-left">
                      <Badge variant="primary" icon={<Sparkles className="w-3.5 h-3.5" />}>
                        {banner.subtitle || 'Official B2B CCTV & Security Equipment'}
                      </Badge>
                      <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight leading-tight">
                        {banner.title || 'Next-Gen Surveillance Systems'}
                      </h1>
                      <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
                        {banner.description ||
                          'Unlock direct wholesale rates on premium CCTV cameras, DVRs, NVRs, routers, and installation accessories.'}
                      </p>
                      <div className="flex flex-wrap gap-4 pt-2">
                        <Link to={banner.targetUrl || '/products'}>
                          <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                            {banner.buttonText || 'Explore Catalog'}
                          </Button>
                        </Link>
                        <Link to="/login">
                          <Button variant="outline" size="lg">
                            Apply for Dealer Pricing
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Image Column */}
                    <div className="lg:col-span-5 relative">
                      <div className="glass-panel-glow rounded-3xl p-3 max-w-md mx-auto shadow-xl">
                        <Image
                          src={banner.image?.url || banner.imageUrl}
                          alt={banner.title || 'Hero Banner'}
                          aspectRatio="aspect-video"
                          className="rounded-2xl"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Carousel Next/Prev Controls */}
              {banners.length > 1 && (
                <div className="absolute bottom-0 right-0 flex items-center gap-2">
                  <button
                    onClick={() =>
                      setActiveBannerIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1))
                    }
                    className="p-2.5 rounded-xl bg-card hover:bg-muted border border-border text-foreground shadow-sm transition-colors"
                    aria-label="Previous Slide"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveBannerIndex((prev) => (prev + 1) % banners.length)}
                    className="p-2.5 rounded-xl bg-card hover:bg-muted border border-border text-foreground shadow-sm transition-colors"
                    aria-label="Next Slide"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Fallback Default Hero */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-6 text-left">
                <Badge variant="primary" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                  Vinexus B2B Platform
                </Badge>
                <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight leading-tight">
                  High-Performance Security & CCTV Solutions
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
                  Browse India's premier catalog of CCTV cameras, recorders, modems, and network accessories with tier-one pricing for verified dealers.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link to="/products">
                    <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Browse Product Catalog
                    </Button>
                  </Link>
                  <Link to="/categories">
                    <Button variant="secondary" size="lg">
                      View Categories
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. FEATURED CATEGORIES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Category Hierarchy</span>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Featured Categories</h2>
          </div>
          <Link to="/categories" className="text-xs font-bold text-primary hover:text-accent flex items-center gap-1">
            View All Categories <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {isCategoriesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/products?categoryId=${cat._id}`}
                className="group glass-panel p-5 rounded-2xl border border-border hover:border-primary transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between shadow-sm bg-card"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                      {cat.description}
                    </p>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-bold group-hover:text-primary">
                  <span>Browse Products</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No Categories Available"
            description="Categories have not been populated yet in the backend catalog."
          />
        )}
      </section>

      {/* 3. FEATURED PRODUCTS 3D COVERFLOW SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">3D Interactive Showcase</span>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Featured Hardware & Surveillance</h2>
          </div>
          <Link to="/products" className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1">
            Explore All Products <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {isProductsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : productsError ? (
          <ErrorState title="Failed to Load Featured Products" description={productsError} onRetry={loadHomepageData} />
        ) : featuredProducts.length > 0 ? (
          <div className="space-y-12">
            {/* 3D Coverflow Carousel Component */}
            <CoverflowCarousel
              products={featuredProducts}
              sectionLabel="VINEXUS PREMIUM HARDWARE SHOWCASE"
              autoplay={true}
              autoplayDelay={5000}
            />

            {/* Product Cards Grid Below */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6">
                All Featured Catalog Items ({featuredProducts.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {featuredProducts.map((prod) => (
                  <ProductCard key={prod._id} product={prod} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No Featured Products"
            description="No featured products currently active in the catalog."
            actionLabel="View Full Catalog"
            onAction={() => window.location.assign('/products')}
          />
        )}
      </section>

      {/* 4. PROMOTIONAL BANNER STRIP */}
      {promoBanners.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="glass-panel-glow p-8 rounded-3xl border border-primary/20 relative overflow-hidden">
            {promoBanners.map((promo, idx) => (
              <div key={promo._id || idx} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-8 space-y-3 text-left">
                  <Badge variant="warning">Special Wholesale Promotion</Badge>
                  <h3 className="text-2xl font-extrabold text-foreground">{promo.title || 'Dealer Bulk Discount Offer'}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{promo.description || 'Verified dealers get exclusive commercial discounts on bulk NVR & camera packages.'}</p>
                </div>
                <div className="md:col-span-4 flex justify-start md:justify-end">
                  <Link to="/products">
                    <Button variant="primary" size="md" rightIcon={<Zap className="w-4 h-4" />}>
                      Claim Deal Now
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. WHY VINEXUS / TRUST BADGES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Platform Guarantee</span>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Why Choose Vinexus</h2>
          <p className="text-xs text-muted-foreground">Direct equipment supply with verified dealer pricing and expert support.</p>
        </div>

        {trustBadges.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {trustBadges.map((badge, idx) => (
              <div key={badge._id || idx} className="glass-panel p-6 rounded-2xl border border-border space-y-3">
                <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-foreground text-sm">{badge.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{badge.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-foreground text-sm">100% Genuine Products</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">Direct authorized supply from Hikvision, CP Plus, TrueView & leading brands.</p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-foreground text-sm">Verified Wholesale Rates</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">Approved dealers unlock exclusive wholesale price tiers across all catalog items.</p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-foreground text-sm">Fast Pan-India Dispatch</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">Swift commercial order dispatch and multi-channel WhatsApp quotation flow.</p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
                <Headphones className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-foreground text-sm">Technical Assistance</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">Expert guidance on camera specs, DVR compatibility, and project requirements.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
