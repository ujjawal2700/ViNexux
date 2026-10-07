import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import cartService from '../../services/cartService';
import guestCartService from '../../services/guestCartService';
import wishlistService from '../../services/wishlistService';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import usePageSeo from '../../hooks/usePageSeo';
import ProductCard from '../../components/products/ProductCard';
import { extractProductId, buildCategoryPath, buildCategoryTrail, buildBrandUrl, cleanBrandSlug } from '../../utils/categoryUrls';
import { Image } from '../../components/ui/Image';
import { Skeleton } from '../../components/ui/Skeleton';
import NotFoundPage from './NotFoundPage';
import { getAvailableStock } from '../../utils/inventory';
import { allowsPreferences } from '../../utils/storageConsent';
import {
  ShoppingCart,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Heart,
  Copy,
  Check,
  ListFilter,
  Minus,
  Plus,
  ExternalLink,
} from 'lucide-react';

export const ProductDetailPage = () => {
  const params = useParams();
  const { id, param2, param3, brandSlug } = params;
  const rawId = id || param3 || param2;
  const productId = extractProductId(rawId);

  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [hasNameCopied, setHasNameCopied] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setQuantity(1);
  }, [productId]);

  useEffect(() => {
    const syncWishlist = () => setIsWishlisted(wishlistService.isInWishlist(productId));
    window.addEventListener('wishlist-updated', syncWishlist);
    return () => window.removeEventListener('wishlist-updated', syncWishlist);
  }, [productId]);


  // 1. Fetch categories tree for breadcrumbs & category linking
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await categoryService.getCategoryTree();
        const list = res.data?.categories || res.categories || [];
        setCategories(list);
      } catch (err) {
        console.warn('Failed to load categories for breadcrumbs:', err);
      }
    };
    fetchCats();
  }, []);

  // 2. Fetch product data
  const fetchProduct = useCallback(async () => {
    if (!productId) {
      setError('Product reference is missing');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setRelatedProducts([]);
    try {
      const res = await productService.getProductById(productId);
      const prod = res.data?.product || res.product || res.data;
      if (!prod) {
        setError('Product not found');
        return;
      }
      setProduct(prod);
      setIsWishlisted(wishlistService.isInWishlist(prod._id));

      // Save to localStorage for Recently Viewed section
      try {
        if (allowsPreferences()) {
          const stored = JSON.parse(localStorage.getItem('vinexus_recently_viewed') || '[]');
          const filtered = stored.filter((p) => p && String(p._id) !== String(prod._id));
          const updated = [prod, ...filtered].slice(0, 12);
          localStorage.setItem('vinexus_recently_viewed', JSON.stringify(updated));
        }
      } catch (e) {
        // non-blocking
      }

      // Match the product's exact category, excluding neighboring categories.
      const catId = typeof prod.categoryId === 'object' ? prod.categoryId._id : prod.categoryId;
      if (catId) {
        try {
          const relRes = await productService.getProducts({
            categoryId: catId,
            exactCategory: 'true',
            limit: 5,
            isActive: true,
            includeFacets: false,
          });
          const relList = relRes.data?.products || relRes.products || [];
          setRelatedProducts(relList.filter((p) => String(p._id) !== String(prod._id) && String(p.categoryId?._id || p.categoryId) === String(catId)).slice(0, 4));
        } catch (relErr) {
          console.warn('Failed to fetch related products:', relErr);
        }
      }
    } catch (err) {
      console.error('Product detail fetch error:', err);
      setError('Product not found or unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [productId, user?.id, user?.dealerStatus]);

  useEffect(() => {
    fetchProduct();
    setSelectedImageIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchProduct]);

  // Extracted Brand info
  const brandName = useMemo(() => {
    if (product?.brandId?.name) return product.brandId.name;
    const fromSpec = product?.specifications?.find((s) => s.key.toLowerCase() === 'brand')?.value;
    if (fromSpec) return fromSpec;
    if (product?.brand) return product.brand;
    const firstWord = product?.name?.split(' ')[0];
    return firstWord || 'ViNexus';
  }, [product]);

  const brandUrl = useMemo(() => {
    if (product?.brandId?.slug || product?.brandId?.name) {
      return buildBrandUrl(product.brandId);
    }
    const fromSpec = product?.specifications?.find((s) => s.key?.toLowerCase() === 'brand')?.value;
    if (fromSpec) {
      return buildBrandUrl(fromSpec);
    }
    if (product?.brand) {
      return buildBrandUrl(product.brand);
    }
    if (brandName && brandName.toLowerCase() !== 'vinexus') {
      return buildBrandUrl(brandName);
    }
    return null;
  }, [product, brandName]);

  // Compute Breadcrumb Trail
  const breadcrumbTrail = useMemo(() => {
    if (brandSlug) {
      const cleanSlug = cleanBrandSlug(brandSlug);
      const brandDisplayName = cleanSlug.replace(/-/g, ' ').toUpperCase();
      return [
        { label: 'Home', path: '/' },
        { label: 'Brands', path: '/brands' },
        { label: brandDisplayName, path: `/brands/${cleanSlug}` },
        { label: product?.name || 'Product Details', path: null },
      ];
    }

    const catId = typeof product?.categoryId === 'object' ? product?.categoryId?._id : product?.categoryId;
    const catObj = categories.find((c) => String(c._id) === String(catId)) || (typeof product?.categoryId === 'object' ? product.categoryId : null);

    if (catObj) {
      const trail = buildCategoryTrail(catObj, categories);
      return [
        ...trail,
        { label: product?.name || 'Product Details', path: null },
      ];
    }

    if (brandUrl && brandName && brandName.toLowerCase() !== 'vinexus') {
      return [
        { label: 'Home', path: '/' },
        { label: 'Brands', path: '/brands' },
        { label: brandName, path: brandUrl },
        { label: product?.name || 'Product Details', path: null },
      ];
    }

    return [
      { label: 'Home', path: '/' },
      { label: product?.name || 'Product Details', path: null },
    ];
  }, [brandSlug, product, categories, brandUrl, brandName]);

  // Category Path & Name for "See all in [Category] ->"
  const categoryPath = useMemo(() => {
    const catId = typeof product?.categoryId === 'object' ? product?.categoryId?._id : product?.categoryId;
    const catObj = categories.find((c) => String(c._id) === String(catId)) || (typeof product?.categoryId === 'object' ? product.categoryId : null);
    if (catObj) {
      return buildCategoryPath(catObj, categories);
    }
    return '/';
  }, [product, categories]);

  const categoryName = useMemo(() => {
    const catId = typeof product?.categoryId === 'object' ? product?.categoryId?._id : product?.categoryId;
    const catObj = categories.find((c) => String(c._id) === String(catId)) || (typeof product?.categoryId === 'object' ? product.categoryId : null);
    return catObj?.name || 'Category';
  }, [product, categories]);

  // Determine pricing & stock
  const isApprovedDealer = user?.role === 'dealer' && (user?.dealerStatus === 'approved' || user?.kycStatus === 'approved');
  const isAdmin = user?.role === 'admin';

  const standardPrice = product?.standardPrice || 0;
  const dealerPrice = product?.dealerPrice || 0;

  let displayPrice = product?.applicablePrice ?? standardPrice;
  let hasDealerDiscount = false;

  if (isApprovedDealer && dealerPrice > 0) {
    displayPrice = product?.applicablePrice ?? dealerPrice;
    if (standardPrice > dealerPrice) {
      hasDealerDiscount = true;
    }
  }

  // Stock status: isActive = true means available in stock
  const availableStock = getAvailableStock(product);
  const isInStock = product?.stockStatus === 'out-of-stock' || availableStock === 0
    ? false
    : ['in-stock', 'low-stock'].includes(product?.stockStatus) || (availableStock !== null && availableStock > 0) || Boolean(product?.isActive);

  // Dynamic SEO metadata & Google Product Structured Data (JSON-LD)
  usePageSeo({
    title: product?.name ? `${product.name} | Buy Online at Best Price - Vinexus` : 'Product Details | Vinexus',
    description: product?.shortDescription
      ? `${product.name} - ${product.shortDescription}. Buy networking & IT equipment with official warranty, GST invoice & nationwide express shipping on Vinexus.`
      : product?.name
      ? `Buy ${product.name} at wholesale dealer prices on Vinexus. Official warranty, GST commercial invoice, and fast delivery in India.`
      : undefined,
    keywords: product?.name
      ? `${product.name}, ${brandName || ''}, networking products, CCTV camera, enterprise switches, IT hardware India, Vinexus Kota`
      : undefined,
    image: product?.images?.[0]?.url || product?.imageUrl,
    type: 'product',
    jsonLd: product?.name
      ? {
          '@context': 'https://schema.org/',
          '@type': 'Product',
          name: product.name,
          image: product.images?.map((i) => i.url) || [product.imageUrl],
          description: product.description || product.shortDescription || product.name,
          sku: product.sku || product._id,
          brand: {
            '@type': 'Brand',
            name: brandName || 'Vinexus',
          },
          offers: {
            '@type': 'Offer',
            url: typeof window !== 'undefined' ? window.location.href : 'https://vinexus.in',
            priceCurrency: 'INR',
            price: displayPrice || standardPrice || 0,
            availability: isInStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
          },
        }
      : null,
  });

  // Stepper handlers & disabled state (matches user request: + disables at stock limit, - re-enables it)
  const isIncrementDisabled = !isInStock || (availableStock !== null && quantity >= availableStock);
  const isDecrementDisabled = !isInStock || quantity <= 1;

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrement = () => {
    if (availableStock !== null && quantity >= availableStock) {
      return;
    }
    setQuantity((prev) => prev + 1);
  };

  // Format Currency (INR ₹)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Add to Cart Action
  const handleAddToCart = async () => {
    if (!isInStock) {
      toast.warning('This product is currently out of stock. Please submit an enquiry.');
      return;
    }

    if (!isAuthenticated) {
      const updatedCart = guestCartService.addItem(product, quantity);
      window.dispatchEvent(new CustomEvent('cart-item-added', { detail: { product, quantity, displayPrice, cart: updatedCart } }));
      return;
    }

    if (isAdmin) {
      toast.warning('Admin accounts are view-only and cannot submit cart items.');
      return;
    }

    try {
      setIsAdding(true);
      const res = await cartService.addItem(product._id, quantity);
      const updatedCart = res.data?.cart || res.data || res.cart || res;
      window.dispatchEvent(
        new CustomEvent('cart-updated', {
          detail: { cart: updatedCart },
        })
      );
      window.dispatchEvent(
        new CustomEvent('cart-item-added', {
          detail: {
            product,
            quantity,
            displayPrice,
            cart: updatedCart,
          },
        })
      );
    } catch (err) {
      console.error('Failed to add item to cart:', err);
      const errMsg = err.response?.data?.message || 'Failed to add product to cart.';
      toast.error(errMsg);
    } finally {
      setIsAdding(false);
    }
  };

  // Wishlist toggle
  const handleToggleWishlist = () => {
    if (!product) return;
    const added = wishlistService.toggleWishlist(product);
    if (added === null) return;
    setIsWishlisted(added);
    if (added) {
      toast.success('Added to Wishlist!');
    } else {
      toast.info('Removed from Wishlist');
    }
  };

  // Copy link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setHasCopied(true);
    toast.success('Product link copied to clipboard!');
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleCopyName = () => {
    navigator.clipboard.writeText(product?.name || '');
    setHasNameCopied(true);
    toast.success('Product name copied to clipboard!');
    setTimeout(() => setHasNameCopied(false), 2000);
  };


  const modelNumber = product?.modelNumber || `VNX-${String(product?._id || '').slice(-8).toUpperCase()}`;
  const modelName = product?.model || product?.specifications?.find(
    (specification) => specification.key?.trim().toLowerCase() === 'model'
  )?.value || 'Standard Model';

  const warrantyText = useMemo(() => {
    return product?.warranty || product?.specifications?.find((s) => s.key.toLowerCase().includes('warranty'))?.value || '1 Year ON-SITE / Direct Replacement Warranty';
  }, [product]);

  // Structured Full Specifications List
  const fullSpecifications = useMemo(() => {
    if (!product) return [];
    const list = [];

    // 1. Brand
    list.push({ key: 'Brand', value: brandName });

    // 2. Stock Quantity
    const stockVal = product.stockQuantity !== undefined && product.stockQuantity !== null
      ? product.stockQuantity
      : (availableStock !== undefined && availableStock !== null ? availableStock : 0);
    list.push({ key: 'Stock Quantity', value: String(stockVal) });

    // 3. Variant (if provided)
    if (product.variant && product.variant.trim()) {
      list.push({ key: 'Variant', value: product.variant.trim() });
    }

    // 4. Manually added specifications
    if (product.specifications && Array.isArray(product.specifications)) {
      product.specifications.forEach((s) => {
        const keyLower = s.key?.trim().toLowerCase();
        if (s.key && s.value && !['brand', 'stock', 'inventory', 'stock quantity', 'variant'].includes(keyLower)) {
          list.push({ key: s.key.trim(), value: s.value.trim() });
        }
      });
    }

    // 5. Key Features
    if (product.description && product.description.trim()) {
      list.push({ key: 'Key Features', value: product.description.trim() });
    }

    return list;
  }, [product, brandName, availableStock]);

  // Product Images Gallery (Safe for hooks order)
  const images = useMemo(() => {
    if (!product) return [{ url: '' }];
    return product.images?.length ? product.images : [{ url: '' }];
  }, [product]);

  const currentImage = images[selectedImageIndex]?.url || images[0]?.url || '';

  if (isLoading) {
    return (
      <div className="storefront-container px-3 sm:px-6 lg:px-8 2xl:px-12 py-8 space-y-6 bg-white min-h-screen">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-4">
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
          <div className="xl:col-span-5 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-2 xl:col-span-3">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return <NotFoundPage />;
  }

  return (
    <div className="storefront-container px-3 sm:px-6 lg:px-8 2xl:px-12 py-4 sm:py-6 space-y-10 bg-white min-h-screen text-gray-900 font-sans">
      
      {/* 1. TOP BREADCRUMBS (Matching Given Image - No left gap) */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <nav aria-label="Breadcrumb" className="flex min-w-0 max-w-full items-center flex-nowrap gap-2 overflow-x-auto whitespace-nowrap text-sm sm:text-base text-[#800020] font-medium">
          {breadcrumbTrail.map((crumb, idx) => {
            const isLast = idx === breadcrumbTrail.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-4 h-4 text-[#800020] shrink-0" />}
                {isLast || !crumb.path ? (
                  <span className="font-semibold text-[#800020] shrink-0">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.path}
                    className="shrink-0 hover:text-[#650019] transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* 2. TOP MAIN PRODUCT PRESENTATION: 3-COLUMN LAYOUT (Matching Given Image) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-start">
        
        {/* =========================================
            COLUMN 1: PRODUCT IMAGE & THUMBNAILS (Left - No empty margin)
           ========================================= */}
        <div className="xl:col-span-4 space-y-3">
          <div className="bg-white p-4 rounded-xl border border-gray-200 overflow-hidden relative shadow-2xs group flex items-center justify-center min-h-[360px] sm:min-h-[420px] xl:min-h-[clamp(460px,34vw,660px)]">
            <Image
              src={currentImage}
              alt={product.name}
              aspectRatio="aspect-square"
              className="rounded-lg object-contain w-full max-h-[620px] transition-transform duration-300 group-hover:scale-102"
            />

            {/* Left and Right navigation arrows over main photo */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 shadow-md border border-gray-200 flex items-center justify-center hover:bg-white text-gray-700 transition-all hover:scale-105 active:scale-95 cursor-pointer z-10"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((prev) => (prev + 1) % images.length);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 shadow-md border border-gray-200 flex items-center justify-center hover:bg-white text-gray-700 transition-all hover:scale-105 active:scale-95 cursor-pointer z-10"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails Row below photo (Matching Mega Jaipur Image) */}
          {images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-18 h-18 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all shrink-0 bg-white p-1 cursor-pointer flex items-center justify-center ${
                    selectedImageIndex === index
                      ? 'border-[#800020] shadow-xs ring-1 ring-[#800020]/20'
                      : 'border-gray-200 opacity-70 hover:opacity-100 hover:border-gray-300'
                  }`}
                  aria-label={`Select photo ${index + 1}`}
                >
                  <Image src={img.url} alt={`Thumbnail ${index}`} aspectRatio="aspect-square" className="object-contain w-full h-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* =========================================
            COLUMN 2: PRODUCT INFO, TITLE, WARRANTY & SPECS TABLE (Middle)
           ========================================= */}
        <div className="xl:col-span-5 space-y-4">
          {/* Title Row + Action Icons + Brand Box */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-snug">
                {product.name}
              </h1>

              {/* Product actions */}
              <div className="flex items-center gap-3 pt-0.5">
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                    isWishlisted
                      ? 'border-rose-300 bg-rose-50 text-rose-600'
                      : 'border-gray-200 text-gray-500 hover:text-[#800020] hover:border-gray-300'
                  }`}
                  title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={handleCopyName}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:text-[#800020]"
                  title="Copy Product Name"
                  aria-label="Copy Product Name"
                >
                  {hasNameCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:text-[#800020]"
                  title="Copy Product Link"
                  aria-label="Copy Product Link"
                >
                  {hasCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Brand Logo / Box (Clickable link to specific brand page) */}
            {brandUrl ? (
              <Link
                to={brandUrl}
                className="border border-gray-200 hover:border-[#800020] rounded-lg px-3 py-1.5 min-w-[70px] text-center font-black text-sm text-[#800020] bg-white hover:bg-gray-50/80 shadow-2xs hover:shadow-sm shrink-0 flex items-center justify-center uppercase tracking-wider transition-all group/brand cursor-pointer"
                title={`View all products from ${brandName}`}
              >
                {product?.brandId?.logo?.url ? (
                  <img
                    src={product.brandId.logo.url}
                    alt={brandName}
                    className="max-h-12 max-w-24 object-contain transition-transform group-hover/brand:scale-105"
                  />
                ) : (
                  <span className="group-hover/brand:underline">{brandName}</span>
                )}
              </Link>
            ) : (
              <div
                className="border border-gray-200 rounded-lg px-3 py-1.5 min-w-[70px] text-center font-black text-sm text-[#800020] bg-white shadow-2xs shrink-0 flex items-center justify-center uppercase tracking-wider"
                title={`Brand: ${brandName}`}
              >
                {product?.brandId?.logo?.url ? (
                  <img src={product.brandId.logo.url} alt={brandName} className="max-h-12 max-w-24 object-contain" />
                ) : (
                  brandName
                )}
              </div>
            )}
          </div>

          {/* Product Overview Specs Table (Matching Given Image) */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs bg-white text-xs">
            <table className="w-full text-left border-collapse">
              <tbody>
                <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-gray-600 flex items-center gap-2">
                    <span className="text-gray-400 font-bold">#</span>
                    <span>Model Number</span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">{modelNumber}</td>
                </tr>

                <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-gray-600 flex items-center gap-2">
                    <span className="text-gray-400 font-bold">▣</span>
                    <span>Model</span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">
                    {modelName}
                  </td>
                </tr>

                <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-gray-600 flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5 text-[#800020]" />
                    <span>Product URL</span>
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    {product.productUrl ? (
                      <a
                        href={product.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#800020] underline underline-offset-2 hover:text-[#650019]"
                      >
                        View Product <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-400">Not provided</span>
                    )}
                  </td>
                </tr>

                {/* 4. Warranty Period */}
                <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-gray-600 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#800020]" />
                    <span>Warranty Period</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-800 font-medium">
                    {warrantyText}
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>

        {/* Purchase card: product quantity is adjusted later in the cart. */}
        <div className="lg:col-span-2 xl:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            
            {/* Price & Discount Row */}
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {formatCurrency(displayPrice)}
                </span>
                {hasDealerDiscount && (
                  <span className="text-xs text-gray-400 line-through">
                    Standard: {formatCurrency(standardPrice)}
                  </span>
                )}
              </div>

              {hasDealerDiscount && (
                <span className="inline-flex items-center rounded border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold uppercase tracking-tight text-[#800020]">
                  DEALER SAVING: {formatCurrency(standardPrice - dealerPrice)}
                </span>
              )}
            </div>

            {/* In Stock / Out of Stock Status Pill */}
            {isInStock ? (
              <div className="w-full py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{product?.stockStatus === 'in-stock' ? 'IN STOCK' : 'AVAILABILITY ON REQUEST'}</span>
              </div>
            ) : (
              <div className="w-full py-2 px-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>OUT OF STOCK</span>
              </div>
            )}

            {/* Quantity Stepper + Add to Cart Button (Matching Screenshot) */}
            <div className="flex items-center gap-3">
              {isInStock && (
                <div className="flex items-center h-11 border border-gray-300 rounded-lg bg-white overflow-hidden shadow-xs shrink-0">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={isDecrementDisabled}
                    className="w-10 h-full flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4 stroke-[2.2]" />
                  </button>
                  <span className="w-10 h-full flex items-center justify-center border-x border-gray-200 font-bold text-sm text-gray-900 select-none">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={isIncrementDisabled}
                    className="w-10 h-full flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!isInStock || isAdding}
                className={`flex-1 h-11 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs ${
                  isInStock
                    ? 'bg-[#800020] hover:bg-[#66001a] text-white cursor-pointer active:scale-98'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-75'
                }`}
                title={isInStock ? 'Add to Cart' : 'Out of Stock - Please send an enquiry'}
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                <span>{isInStock ? (isAdding ? 'Adding...' : 'Add to Cart') : 'Out of Stock'}</span>
              </button>
            </div>

            {/* Trust Footer */}
            <div className="text-[10px] text-gray-400 text-center pt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>Secured by ViNexus Genuine Warranty</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. SPECIFICATIONS SECTION (On Scroll Down - Exactly Matching Given Image 2)
         ========================================================================= */}
      <section className="space-y-4 pt-6 border-t border-gray-200">
        {/* Header with List Icon */}
        <div className="flex items-center gap-2.5 text-gray-900">
          <div className="w-6 h-6 rounded bg-[#800020]/10 flex items-center justify-center text-[#800020]">
            <ListFilter className="w-4 h-4" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900">
            Specifications
          </h2>
        </div>

        {/* Alternating Row Table Matching Given Image 2 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <tbody>
              {fullSpecifications.map((spec, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    idx % 2 === 0 ? 'bg-[#fcfbfc]' : 'bg-white'
                  } border-b border-gray-100 last:border-b-0`}
                >
                  <td className="px-5 sm:px-6 py-3.5 font-medium text-gray-500 w-1/4 sm:w-1/5 select-none">
                    {spec.key}
                  </td>
                  <td className="px-5 sm:px-6 py-3.5 font-semibold text-gray-900 font-mono text-xs sm:text-sm">
                    {spec.key === 'Product URL' ? (
                      <a href={spec.value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#800020] underline underline-offset-2 hover:text-[#650019]">
                        View Product <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : spec.key === 'Brand' && brandUrl ? (
                      <Link to={brandUrl} className="inline-flex items-center text-[#800020] hover:underline font-bold font-sans">
                        {spec.value}
                      </Link>
                    ) : spec.key === 'Key Features' ? (
                      <div className="whitespace-pre-line font-sans font-normal text-gray-800 text-xs sm:text-sm leading-relaxed">
                        {spec.value}
                      </div>
                    ) : spec.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* =========================================================================
          4. RELATED PRODUCTS SECTION (On Scroll Down - Exactly Matching Given Image 3 & 4)
         ========================================================================= */}
      {product?.categoryId && (
        <section className="space-y-4 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              Related Products
            </h2>
            <Link
              to={categoryPath}
              className="text-xs sm:text-sm font-semibold text-[#800020] hover:underline flex items-center gap-1"
            >
              <span>Show all in {categoryName}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 4 Columns Grid Matching Given Image */}
          {relatedProducts.length > 0 ? (
            <div className="storefront-product-grid gap-4 sm:gap-5">
              {relatedProducts.map((relProd) => (
                <ProductCard key={relProd._id} product={relProd} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No other products in this category yet.</p>
          )}
        </section>
      )}


    </div>
  );
};

export default ProductDetailPage;
