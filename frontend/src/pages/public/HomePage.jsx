import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import contentService from '../../services/contentService';
import categoryService from '../../services/categoryService';
import productService from '../../services/productService';
import ProductCard from '../../components/products/ProductCard';
import { Button } from '../../components/ui/Button';

// Authorized Brands List for Full-Width Continuous Marquee Ticker
const AUTHORIZED_BRAND_LIST = [
  { name: "dahua", style: "text-red-600 font-extrabold text-base tracking-wider" },
  { name: "Trueview", style: "text-rose-500 font-serif italic text-base" },
  { name: "ACTIVE pixel", style: "text-emerald-600 font-mono text-xs uppercase font-bold" },
  { name: "Tiandy", style: "text-green-500 font-black text-base" },
  { name: "CP PLUS", style: "text-red-700 font-extrabold text-base tracking-tighter" },
  { name: "HIKVISION", style: "text-rose-600 font-extrabold text-base tracking-tight" },
  { name: "HONEYWELL", style: "text-red-600 font-sans font-bold text-sm tracking-widest" },
  { name: "BOSCH", style: "text-blue-600 font-black text-base tracking-wider" },
  { name: "PANASONIC", style: "text-blue-700 font-bold text-sm tracking-widest" },
  { name: "UNV (Uniview)", style: "text-cyan-600 font-black text-sm tracking-wider" },
];

// Default High-Res Camera Showcase Slides (auto-changes every 5-7 seconds)
const HERO_CAMERA_SLIDES = [
  {
    id: 1,
    title: "4K Ultra-HD Bullet Surveillance Camera",
    subtitle: "Precision Night Vision • AI Motion Detect • IP67 Weatherproof Construction",
    badge: "POPULAR MODEL",
    image: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: 2,
    title: "360° AI Smart Motion Dome Camera",
    subtitle: "Pan-Tilt-Zoom Control • Built-in Siren • Two-Way Clear HD Audio",
    badge: "SMART SURVEILLANCE",
    image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: 3,
    title: "Enterprise High-Capacity NVR Hub & Switch",
    subtitle: "64-Channel Ultra HD Sync • H.265+ Compression & RAID Storage",
    badge: "ENTERPRISE GRADE",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: 4,
    title: "Central Command Surveillance Control Center",
    subtitle: "Multi-Screen Monitoring Wall • Real-time AI Analytics & Instant Alerts",
    badge: "COMMAND CENTER",
    image: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&q=80&w=1200",
  },
];

// Staggered motion container variants for product grid
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
};
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
import CategoryIcon, { getCategoryProductImage } from '../../components/ui/CategoryIcon';

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

  // Combine dynamic banners with default CCTV Camera slides
  const heroSlides = banners && banners.length > 0
    ? banners.map((b, idx) => ({
        id: b._id || idx,
        title: b.title || HERO_CAMERA_SLIDES[idx % HERO_CAMERA_SLIDES.length].title,
        subtitle: b.description || HERO_CAMERA_SLIDES[idx % HERO_CAMERA_SLIDES.length].subtitle,
        badge: b.tag || "SURVEILLANCE TECH",
        image: b.imageUrl || HERO_CAMERA_SLIDES[idx % HERO_CAMERA_SLIDES.length].image,
      }))
    : HERO_CAMERA_SLIDES;

  // Automatic Single Camera Image Showcase Interval (Changes every 6 seconds)
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  return (
    <div className="space-y-12 sm:space-y-16 pb-16 bg-background text-foreground">
      
      {/* 1. CCTV & SECURITY SYSTEMS HERO SECTION */}
      <section className="relative bg-background border-b border-border overflow-hidden pt-2 sm:pt-4 pb-8 sm:pb-12">
        {/* Background Watermark Typography with Soft Ambient Blur */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-[0.03] dark:opacity-[0.02] blur-[3px] sm:blur-[4px]">
          <span className="text-[13vw] font-black uppercase text-foreground/50 whitespace-nowrap tracking-tighter">
            CCTV CAMERAS SECURITY SYSTEM
          </span>
        </div>

        {/* Background Ambient Red Glow */}
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-5 text-left">
              {/* Top Red Badge */}
              <div className="inline-block px-3 py-1 rounded-sm bg-primary text-white text-[11px] font-black uppercase tracking-widest shadow-sm">
                PROFESSIONAL GRADE
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-foreground tracking-tight leading-[1.08]">
                Wide Range of <br />
                <span className="text-primary font-black tracking-tight">CCTV CAMERAS</span> <br />
                <span className="tracking-tight">& SECURITY SYSTEMS</span>
              </h1>

              {/* Subheading */}
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed font-medium">
                Precision engineering for professionals. Equipping dealers and enterprises with top-tier surveillance technology across India.
              </p>

              {/* CTA Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link to="/products">
                  <Button
                    variant="primary"
                    size="lg"
                    className="px-8 py-3.5 text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20 rounded-md hover:scale-105 transition-transform"
                  >
                    VIEW CATALOG
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    variant="outline"
                    size="lg"
                    className="px-8 py-3.5 text-xs font-black uppercase tracking-wider border-2 border-foreground/30 hover:border-primary text-foreground rounded-md hover:scale-105 transition-transform"
                  >
                    PARTNER WITH US
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Column - Seamless & Borderless CCTV Camera Showcase (Auto-changes every 5-7s) */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full max-w-lg">
                {/* Background Ambient Glow */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-primary/25 via-accent/15 to-transparent rounded-full blur-3xl opacity-70 pointer-events-none"></div>

                {/* Main Showcase Container (No Outer Card, No Borders) */}
                <div className="relative group overflow-hidden rounded-3xl shadow-2xl">
                  
                  {/* Top Floating Live Badge */}
                  <div className="absolute top-5 left-5 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-bold shadow-md">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="tracking-wider uppercase text-[10px]">
                      {heroSlides[activeBannerIndex % heroSlides.length]?.badge || "FEATURED CAMERA"}
                    </span>
                  </div>

                  {/* Image Frame with Smooth AnimatePresence Transition */}
                  <div className="relative w-full h-[380px] sm:h-[460px] rounded-3xl overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={activeBannerIndex}
                        src={heroSlides[activeBannerIndex % heroSlides.length]?.image}
                        alt={heroSlides[activeBannerIndex % heroSlides.length]?.title || "CCTV Camera System"}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="w-full h-full object-cover object-center"
                      />
                    </AnimatePresence>

                    {/* Gradient Shadow Overlay for seamless text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none"></div>

                    {/* Bottom Content & Interactive Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 z-20 text-white space-y-2">
                      <motion.h3
                        key={`title-${activeBannerIndex}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-md"
                      >
                        {heroSlides[activeBannerIndex % heroSlides.length]?.title}
                      </motion.h3>

                      <motion.p
                        key={`sub-${activeBannerIndex}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="text-xs sm:text-sm text-gray-200 font-medium line-clamp-2"
                      >
                        {heroSlides[activeBannerIndex % heroSlides.length]?.subtitle}
                      </motion.p>

                      {/* Integrated Footer Controls (Counter + Navigation Arrows) */}
                      <div className="flex items-center justify-end gap-3 pt-2">

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono font-bold text-gray-300">
                            0{(activeBannerIndex % heroSlides.length) + 1} / 0{heroSlides.length}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setActiveBannerIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
                              className="p-1.5 rounded-full bg-black/40 hover:bg-primary text-white transition-colors border border-white/10"
                              aria-label="Previous Camera Image"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setActiveBannerIndex((prev) => (prev + 1) % heroSlides.length)}
                              className="p-1.5 rounded-full bg-black/40 hover:bg-primary text-white transition-colors border border-white/10"
                              aria-label="Next Camera Image"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Continuous Right-to-Left Marquee Ticker for Authorized Brands */}
        <div className="mt-8 sm:mt-10 pt-3 border-t border-border/40 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary inline-block animate-pulse"></span>
              AUTHORIZED BRANDS & DISTRIBUTOR NETWORK
            </span>
          </div>

          {/* Marquee Track Container with Fade Masks */}
          <div className="relative w-full overflow-hidden bg-card/40 backdrop-blur-md border-y border-border/50 py-3 sm:py-3.5">
            {/* Fade Overlays on Edges */}
            <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"></div>

            {/* Framer Motion Continuous Marquee */}
            <div className="flex w-max">
              <motion.div
                className="flex items-center gap-10 sm:gap-14 pr-10 sm:pr-14"
                animate={{ x: ['0%', '-50%'] }}
                transition={{
                  repeat: Infinity,
                  ease: 'linear',
                  duration: 25,
                }}
              >
                {[...AUTHORIZED_BRAND_LIST, ...AUTHORIZED_BRAND_LIST].map((brand, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 whitespace-nowrap opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <span className={brand.style}>{brand.name}</span>
                    <span className="text-[9px] text-muted-foreground/30 font-normal select-none">✦</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/products?categoryId=${cat._id}`}
                className="group glass-panel p-4 sm:p-5 rounded-2xl border border-border hover:border-primary transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between shadow-sm bg-card overflow-hidden space-y-3"
              >
                <div className="space-y-3">
                  {/* Top Header Row with Icon and Badge */}
                  <div className="flex items-center justify-between">
                    <CategoryIcon name={cat.name} containerClassName="w-11 h-11" className="w-5.5 h-5.5" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                      Catalog
                    </span>
                  </div>

                  {/* Product Category Photo Preview Frame */}
                  <div className="relative h-32 w-full rounded-2xl overflow-hidden bg-muted/40 border border-border/60 group-hover:border-primary/40 transition-colors">
                    <img
                      src={getCategoryProductImage(cat.name, cat.image)}
                      alt={cat.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div>
                    <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors leading-snug">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed font-medium">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-bold group-hover:text-primary">
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

      {/* 3. FEATURED PRODUCTS CATALOG SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Catalog Showcase</span>
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
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {featuredProducts.map((prod) => (
              <motion.div key={prod._id} variants={itemVariants}>
                <ProductCard product={prod} />
              </motion.div>
            ))}
          </motion.div>
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
          <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
            {trustBadges.map((badge, idx) => (
              <div key={badge._id || idx} className="glass-panel p-6 rounded-2xl border border-border space-y-3 w-full sm:w-80 text-left">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-foreground text-sm">{badge.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{badge.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
            <div className="glass-panel p-6 rounded-2xl border border-border space-y-3 w-full sm:w-72 text-left">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-foreground text-sm">100% Genuine Products</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">Direct authorized supply from Hikvision, CP Plus, TrueView & leading brands.</p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-border space-y-3 w-full sm:w-72 text-left">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-foreground text-sm">Verified Wholesale Rates</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">Approved dealers unlock exclusive wholesale price tiers across all catalog items.</p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-border space-y-3 w-full sm:w-72 text-left">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-foreground text-sm">Fast Pan-India Dispatch</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">Swift commercial order dispatch and multi-channel WhatsApp quotation flow.</p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-border space-y-3 w-full sm:w-72 text-left">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
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
