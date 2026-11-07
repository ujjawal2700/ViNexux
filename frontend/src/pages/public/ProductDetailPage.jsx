import { activeVariants, hasVariants, selectedVariantProduct } from '../../../../shared/productVariants.js';
import { productPath, productStructuredData, SITE_ORIGIN } from '../../../../shared/seo.js';
import PriceGate, { LoginToViewPrices, usePriceVisibility } from '../../components/products/PriceGate';
import { isWarrantyLink, productModelVariant } from '../../../../shared/productPresentation.js';
import { productShareDescription } from '../../../../shared/socialMetadata.js';
import { getRecentViews, rememberView } from '../../utils/browsingHistory';
import { findHeaderCategory, orderedProductSpecifications } from '../../utils/productBrowsing';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import productService from '../../services/productService';
import contentService from '../../services/contentService';
import categoryService from '../../services/categoryService';
import cartService from '../../services/cartService';
import wishlistService from '../../services/wishlistService';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import usePageSeo from '../../hooks/usePageSeo';
import ProductCard from '../../components/products/ProductCard';
import { extractProductId, buildProductPath, buildCategoryPath, buildCategoryTrail, buildBrandUrl, cleanBrandSlug } from '../../utils/categoryUrls';
import { Image } from '../../components/ui/Image';
import { Skeleton } from '../../components/ui/Skeleton';
import NotFoundPage from './NotFoundPage';
import { getAvailableStock, getMaximumOrderQuantity, isLowStock } from '../../utils/inventory';
import {
  ShoppingCart,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Heart,
  Copy,
  Link2,
  Check,
  ListFilter,
  Minus,
  Plus,
  ExternalLink,
  X,
} from 'lucide-react';

export const ProductDetailPage = () => {
  const pricesVisible = usePriceVisibility();
  const navigate = useNavigate();
  const params = useParams();
  const { id, param2, param3, brandSlug } = params;
  const rawId = id || param3 || param2;
  const productId = extractProductId(rawId);

  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  useEffect(() => {
    let active = true;
    contentService.getFooterContent().then(response => {
      const footer = response?.data?.footer || response?.footer || response?.data;
      const raw = String(footer?.whatsappNumbers?.[0]?.number || footer?.whatsappNumber || '').replace(/\D/g, '');
      const phone = raw.length === 10 ? `91${raw}` : raw;
      if (active && /^\d{10,15}$/.test(phone)) setWhatsappPhone(phone);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const [categories, setCategories] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);
  const [relatedPage, setRelatedPage] = useState(1);
  const [hasMoreRelated, setHasMoreRelated] = useState(false);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState('');
  const [relatedRetry, setRelatedRetry] = useState(0);
  const requestVersion = useRef(0);
  const relatedHeader = useMemo(() => findHeaderCategory(product, categories), [product, categories]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [hasNameCopied, setHasNameCopied] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState("");

  useEffect(() => {
    setQuantity(1);
  }, [productId]);

  useEffect(() => {
    const syncWishlist = () => setIsWishlisted(wishlistService.isInWishlist(productId));
    window.addEventListener('wishlist-updated', syncWishlist);
    return () => window.removeEventListener('wishlist-updated', syncWishlist);
  }, [productId]);


  useEffect(() => {
    const clearRecent = () => setRecentProducts([]);
    window.addEventListener('storage-choices-updated', clearRecent);
    return () => window.removeEventListener('storage-choices-updated', clearRecent);
  }, []);

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
    const version = ++requestVersion.current;
    setIsLoading(true);
    setError(null);
    try {
      const res = await productService.getProductById(productId);
      const prod = res.data?.product || res.product || res.data;
      if (version !== requestVersion.current) return;
      if (!prod) {
        setError('Product not found');
        return;
      }
      setProduct(prod);
      setIsWishlisted(wishlistService.isInWishlist(prod._id));

      const previousIds = getRecentViews().filter(value => value !== String(prod._id));
      rememberView(String(prod._id));
      setRecentProducts([]);
      // Resolve current prices/status through the API; history contains IDs only.
      Promise.allSettled(previousIds.map(value => productService.getProductById(value, { skipGlobalLoader: true })))
        .then(results => {
          if (version !== requestVersion.current) return;
          setRecentProducts(results.filter(result => result.status === 'fulfilled').map(result =>
            result.value.data?.product || result.value.product || result.value.data
          ).filter(value => value?._id && value.isActive !== false));
        });
    } catch (err) {
      if (version !== requestVersion.current) return;
      console.error('Product detail fetch error:', err);
      setError('Product not found or unavailable.');
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, [productId, pricesVisible, user?._id, user?.id, user?.role, user?.dealerStatus, user?.kycStatus]);

  useEffect(() => {
    fetchProduct();
    setSelectedImageIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => { requestVersion.current++; };
  }, [fetchProduct]);

  useEffect(() => {
    setRelatedProducts([]); setRelatedPage(1); setHasMoreRelated(false);
  }, [product?._id, relatedHeader?._id]);
  useEffect(() => {
    if (!product?._id || !relatedHeader?._id) return;
    let active = true;
    const controller = new AbortController();
    setRelatedLoading(true); setRelatedError('');
    productService.getProducts({ categoryId: String(relatedHeader._id), page: relatedPage, limit: 12, includeFacets: false },
      { signal: controller.signal, skipGlobalLoader: true }).then(response => {
      if (!active) return;
      const data = response.data || response;
      const rows = (data.products || []).filter(value => String(value._id) !== String(product._id));
      setRelatedProducts(previous => [...new Map((relatedPage === 1 ? rows : [...previous, ...rows]).map(value => [String(value._id), value])).values()]);
      const pages = data.pagination?.totalPages ?? data.pagination?.pages;
      setHasMoreRelated(pages !== undefined ? relatedPage < pages : (data.products || []).length === 12);
    }).catch(error => { if (active && error.code !== 'ERR_CANCELED') setRelatedError('Related products could not load. Please try again.'); })
      .finally(() => { if (active) setRelatedLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [pricesVisible, product?._id, relatedHeader?._id, relatedPage, relatedRetry, user?._id, user?.role, user?.dealerStatus, user?.kycStatus]);

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

  const categoryPath = relatedHeader ? buildCategoryPath(relatedHeader, categories) : '/products';
  const categoryName = relatedHeader?.name || 'Category';

  // Determine pricing & stock
  const isApprovedDealer = user?.role === 'dealer' && (user?.dealerStatus === 'approved' || user?.kycStatus === 'approved');
  const isAdmin = user?.role === 'admin';

  const options = activeVariants(product);
  const variantId = options.some(option => String(option._id) === selectedVariantId) ? selectedVariantId : String(options.find(option => option.stockQuantity > 0)?._id || options[0]?._id || '');
  const purchaseProduct = hasVariants(product) ? selectedVariantProduct(product, variantId) : product;
  const standardPrice = purchaseProduct?.standardPrice || 0;
  const dealerPrice = purchaseProduct?.dealerPrice || 0;

  let displayPrice = purchaseProduct?.applicablePrice ?? standardPrice;
  let hasDealerDiscount = false;

  if (isApprovedDealer && dealerPrice > 0) {
    displayPrice = purchaseProduct?.applicablePrice ?? dealerPrice;
    if (standardPrice > dealerPrice) {
      hasDealerDiscount = true;
    }
  }

  // Stock status: isActive = true means available in stock
  const availableStock = getAvailableStock(purchaseProduct);
  const maxAllowedQuantity = getMaximumOrderQuantity(purchaseProduct);
  const isOutOfStock = !purchaseProduct || purchaseProduct?.stockStatus === 'out-of-stock' || availableStock === 0 || maxAllowedQuantity === 0;
  const isInStock = !isOutOfStock;
  const productIsLowStock = !isOutOfStock && isLowStock(purchaseProduct);

  // Dynamic SEO metadata & Google Product Structured Data (JSON-LD)
  usePageSeo({
    robots: error || (!isLoading && !product) ? 'noindex, follow' : undefined,
    title: error || (!isLoading && !product) ? 'Page not found | ViNexus' : product?.name ? `${product.name} | ViNexus` : 'Product Details | Vinexus',
    description: product ? productShareDescription(product) : undefined,
    keywords: product?.name
      ? `${product.name}, ${brandName || ''}, networking products, CCTV camera, enterprise switches, IT hardware India, Vinexus Kota`
      : undefined,
    image: product?.images?.[0]?.url || product?.imageUrl,
    imageAlt: product?.name,
    type: 'product',
    canonical: product?._id ? new URL(productPath(product), SITE_ORIGIN).href : undefined,
    jsonLd: product?.name ? productStructuredData(product) : null,
  });

  // Stepper handlers & disabled state (capped at available stock and 5 for manually flagged low-stock items)
  const isIncrementDisabled = !isInStock || quantity >= maxAllowedQuantity;
  const isDecrementDisabled = !isInStock || quantity <= 1;

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrement = () => {
    if (quantity >= maxAllowedQuantity) {
      toast.warning('The quantity limit for this enquiry has been reached.');
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

    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: buildProductPath(product) } } });
      return;
    }

    if (isAdmin) {
      toast.warning('Admin accounts are view-only and cannot submit cart items.');
      return;
    }

    try {
      setIsAdding(true);
      const res = await cartService.addItem(product._id, quantity, variantId || undefined);
      const updatedCart = res.data?.cart || res.data || res.cart || res;
      window.dispatchEvent(
        new CustomEvent('cart-updated', {
          detail: { cart: updatedCart },
        })
      );
      window.dispatchEvent(
        new CustomEvent('cart-item-added', {
          detail: {
            product: purchaseProduct,
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
  const modelName = productModelVariant(product) || 'Not specified';

  const warrantyText = useMemo(() => {
    return product?.warranty || product?.specifications?.find((s) => s.key.toLowerCase().includes('warranty'))?.value || 'Not specified';
  }, [product]);

  const fullSpecifications = useMemo(() => orderedProductSpecifications(product, brandName), [product, brandName]);

  // Product Images Gallery (Safe for hooks order)
  const images = useMemo(() => {
    if (!product) return [{ url: '' }];
    return product.images?.length ? product.images : [{ url: '' }];
  }, [product]);

  const currentImage = images[selectedImageIndex]?.url || images[0]?.url || '';

  useEffect(() => {
    if (!isImageLightboxOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsImageLightboxOpen(false);
      if (event.key === 'ArrowLeft') setSelectedImageIndex((index) => (index - 1 + images.length) % images.length);
      if (event.key === 'ArrowRight') setSelectedImageIndex((index) => (index + 1) % images.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageLightboxOpen, images.length]);

  if (isLoading) {
    return (
      <div className="storefront-container px-3 sm:px-6 lg:px-8 2xl:px-12 py-6 space-y-6 bg-[var(--store-surface)]">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-5 xl:col-span-4">
            <Skeleton className="aspect-square w-full max-w-[480px] rounded-xl" />
          </div>
          <div className="grid min-w-0 gap-5 lg:col-span-7 xl:col-span-8 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
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
    <div className="storefront-container px-3 sm:px-6 lg:px-8 2xl:px-12 py-4 sm:py-6 space-y-6 bg-[var(--store-surface)] text-[var(--store-text)] font-sans">
      
      {/* 1. TOP BREADCRUMBS (Matching Given Image - No left gap) */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--store-border)] pb-3">
        <nav aria-label="Breadcrumb" className="flex min-w-0 max-w-full items-center flex-nowrap gap-2 overflow-x-auto whitespace-nowrap text-sm sm:text-base text-[var(--store-primary)] font-medium">
          {breadcrumbTrail.map((crumb, idx) => {
            const isLast = idx === breadcrumbTrail.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-4 h-4 text-[var(--store-primary)] shrink-0" />}
                {isLast || !crumb.path ? (
                  <span className="font-semibold text-[var(--store-primary)] shrink-0">
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

      {/* Compact gallery beside product information and purchase controls. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        
        {/* =========================================
            COLUMN 1: PRODUCT IMAGE & THUMBNAILS (Left - No empty margin)
           ========================================= */}
        <div className="min-w-0 lg:col-span-5 xl:col-span-4">
          <div role="group" aria-label="Product gallery" className="mx-auto flex w-full max-w-[480px] gap-2 sm:gap-3 lg:mx-0">
            {/* Keep all thumbnails in a scrollable rail beside the main image. */}
            {images.length > 1 && (
              <div className="relative w-12 shrink-0 self-stretch sm:w-16">
                <div role="group" aria-label="Product image thumbnails" className="absolute inset-0 flex flex-col gap-2 overflow-y-auto overscroll-contain">
                {images.map((img, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 bg-[var(--store-surface)] p-1 cursor-pointer flex items-center justify-center ${
                      selectedImageIndex === index
                        ? 'border-[var(--store-primary)] shadow-xs ring-1 ring-[var(--store-primary)]/20'
                        : 'border-[var(--store-border)] opacity-70 hover:opacity-100 hover:border-[var(--store-border)]'
                    }`}
                    aria-pressed={selectedImageIndex === index}
                    aria-label={`Select photo ${index + 1}`}
                  >
                    <Image src={img.url} alt="" aspectRatio="aspect-square" className="object-contain w-full h-full" />
                  </button>
                ))}
                </div>
              </div>
            )}
            <div className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-xl border border-[var(--store-border)] bg-[var(--store-surface)] shadow-2xs">
              <button type="button" aria-label="Open full size product image" onClick={() => currentImage && setIsImageLightboxOpen(true)}
                className="group/product-image h-full w-full cursor-zoom-in p-2 sm:p-3"
                onMouseMove={(event) => {
                  const image = event.currentTarget.querySelector('img');
                  if (!image) return;
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
                  const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
                  image.style.transformOrigin = `${x}% ${y}%`;
                }}
                onMouseLeave={(event) => {
                  const image = event.currentTarget.querySelector('img');
                  if (image) image.style.transformOrigin = 'center center';
                }}
              >
                <Image
                  src={currentImage}
                  alt={product.name}
                  objectFit="object-contain"
                  className="h-full w-full rounded-lg"
                  imgClassName="transition-transform duration-100 motion-safe:group-hover/product-image:scale-200"
                />
              </button>

              {/* Left and Right navigation arrows over main photo */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--store-surface)]/95 shadow-md border border-[var(--store-border)] flex items-center justify-center hover:bg-[var(--store-surface)] text-[var(--store-muted)] transition-all hover:scale-105 active:scale-95 cursor-pointer z-10"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--store-surface)]/95 shadow-md border border-[var(--store-border)] flex items-center justify-center hover:bg-[var(--store-surface)] text-[var(--store-muted)] transition-all hover:scale-105 active:scale-95 cursor-pointer z-10"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

          </div>

          {isImageLightboxOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Product image viewer"
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 sm:p-8"
              onClick={() => setIsImageLightboxOpen(false)}
            >
              <span className="absolute left-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white">
                {selectedImageIndex + 1} / {images.length}
              </span>
              <button type="button" aria-label="Close image viewer" onClick={() => setIsImageLightboxOpen(false)} className="absolute right-4 top-4 z-10 rounded-full bg-white/15 p-3 text-white hover:bg-white/25">
                <X className="h-6 w-6" />
              </button>
              {images.length > 1 && <button type="button" aria-label="Previous image" onClick={(event) => { event.stopPropagation(); setSelectedImageIndex((index) => (index - 1 + images.length) % images.length); }} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white hover:bg-white/25"><ChevronLeft className="h-7 w-7" /></button>}
              <img src={currentImage} alt={product.name} onClick={(event) => event.stopPropagation()} className="max-h-[86vh] max-w-[92vw] select-none object-contain" />
              {images.length > 1 && <button type="button" aria-label="Next image" onClick={(event) => { event.stopPropagation(); setSelectedImageIndex((index) => (index + 1) % images.length); }} className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white hover:bg-white/25"><ChevronRight className="h-7 w-7" /></button>}
              {images.length > 1 && <div className="absolute bottom-4 left-1/2 flex max-w-[90vw] -translate-x-1/2 gap-2 overflow-x-auto rounded-lg bg-black/40 p-2" onClick={(event) => event.stopPropagation()}>{images.map((img, index) => <button key={img.publicId || img.url || index} type="button" aria-label={`Show image ${index + 1}`} onClick={() => setSelectedImageIndex(index)} className={`h-14 w-14 shrink-0 overflow-hidden rounded border-2 bg-white ${selectedImageIndex === index ? 'border-white' : 'border-white/30 opacity-70'}`}><img src={img.url} alt="" className="h-full w-full object-contain" /></button>)}</div>}
            </div>
          )}
        </div>

        {/* =========================================
            COLUMN 2: PRODUCT INFO, TITLE, WARRANTY & SPECS TABLE (Middle)
           ========================================= */}
        <div className="grid min-w-0 gap-5 lg:col-span-7 xl:col-span-8 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] items-start">
        <div className="min-w-0 space-y-4">
          {/* Title Row + Action Icons + Brand Box */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--store-text)] tracking-tight leading-snug">
                {purchaseProduct?.name || product.name}
              </h1>

              {/* Product actions */}
              <div className="flex items-center gap-3 pt-0.5">
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                    isWishlisted
                      ? 'border-rose-300 bg-rose-50 text-rose-600'
                      : 'border-[var(--store-border)] text-[var(--store-muted)] hover:text-[var(--store-primary)] hover:border-[var(--store-border)]'
                  }`}
                  title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={handleCopyName}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--store-border)] text-[var(--store-muted)] hover:text-[var(--store-primary)] hover:border-[var(--store-primary)]/40 hover:bg-[var(--store-primary)]/5 transition-colors cursor-pointer"
                  title={hasNameCopied ? "Product Name Copied!" : "Copy Product Name"}
                  aria-label="Copy Product Name"
                >
                  {hasNameCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--store-border)] text-[var(--store-muted)] hover:text-[var(--store-primary)] hover:border-[var(--store-primary)]/40 hover:bg-[var(--store-primary)]/5 transition-colors cursor-pointer"
                  title={hasCopied ? "Product Link Copied!" : "Copy Product Link"}
                  aria-label="Copy Product Link"
                >
                  {hasCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Brand Logo / Box (Clickable link to specific brand page) */}
            {brandUrl ? (
              <Link
                to={brandUrl}
                className="border border-[var(--store-border)] hover:border-[var(--store-primary)] rounded-lg px-3 py-1.5 min-w-[70px] text-center font-black text-sm text-[var(--store-primary)] bg-[var(--store-surface)] hover:bg-[var(--store-background)]/80 shadow-2xs hover:shadow-sm shrink-0 flex items-center justify-center uppercase tracking-wider transition-all group/brand cursor-pointer"
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
                className="border border-[var(--store-border)] rounded-lg px-3 py-1.5 min-w-[70px] text-center font-black text-sm text-[var(--store-primary)] bg-[var(--store-surface)] shadow-2xs shrink-0 flex items-center justify-center uppercase tracking-wider"
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
          <div className="border border-[var(--store-border)] rounded-xl overflow-hidden shadow-2xs bg-[var(--store-surface)] text-xs">
            <table className="w-full text-left border-collapse">
              <tbody>
                <tr className="border-b border-[var(--store-border)] hover:bg-[var(--store-background)]/50">
                  <td className="px-4 py-2.5 font-medium text-[var(--store-muted)] flex items-center gap-2">
                    <span className="text-[var(--store-muted)] font-bold">#</span>
                    <span>Model Number</span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-[var(--store-text)]">{modelNumber}</td>
                </tr>

                <tr className="border-b border-[var(--store-border)] hover:bg-[var(--store-background)]/50">
                  <td className="px-4 py-2.5 font-medium text-[var(--store-muted)] flex items-center gap-2">
                    <span className="text-[var(--store-muted)] font-bold">▣</span>
                    <span>Model Name / Variant</span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-[var(--store-text)]">
                    {modelName}
                  </td>
                </tr>

                <tr className="border-b border-[var(--store-border)] hover:bg-[var(--store-background)]/50">
                  <td className="px-4 py-2.5 font-medium text-[var(--store-muted)] flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--store-primary)]" />
                    <span>Product URL</span>
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    {product.productUrl ? (
                      <a
                        href={product.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[var(--store-primary)] underline underline-offset-2 hover:text-[#650019]"
                      >
                        View Product <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[var(--store-muted)]">Not provided</span>
                    )}
                  </td>
                </tr>

                {/* 4. Warranty Period */}
                <tr className="border-b border-[var(--store-border)] hover:bg-[var(--store-background)]/50">
                  <td className="px-4 py-2.5 font-medium text-[var(--store-muted)] flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[var(--store-primary)]" />
                    <span>Warranty Period</span>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--store-text)] font-medium">
                    {product.warrantyType === 'link' && isWarrantyLink(product.warranty) ? (
                      <a href={product.warranty} target="_blank" rel="noopener noreferrer" className="text-[var(--store-primary)] underline underline-offset-2">{product.warranty}</a>
                    ) : warrantyText}
                  </td>
                </tr>

                {(product.additionalDetails || []).filter(detail => detail.key?.trim() && detail.value?.trim()).map((detail, index) => (
                  <tr key={index} className="border-b border-[var(--store-border)] last:border-b-0 hover:bg-[var(--store-background)]/50">
                    <td className="px-4 py-2.5 align-top font-medium text-[var(--store-muted)] break-words [overflow-wrap:anywhere]">{detail.key}</td>
                    <td className="px-4 py-2.5 align-top font-medium text-[var(--store-text)] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{detail.value}</td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        </div>

        {/* Purchase card: product quantity is adjusted later in the cart. */}
        <div className="min-w-0">
          <div className="bg-[var(--store-surface)] rounded-2xl border border-[var(--store-border)] p-5 shadow-xs space-y-4">
            
            {options.length > 0 && <fieldset className="min-w-0 space-y-3" aria-label="Choose Configuration">
              <legend className="flex items-center gap-2 text-base font-bold text-[var(--store-primary)]"><ListFilter className="h-5 w-5" aria-hidden="true" />Choose Configuration</legend>
              <p className="text-sm font-semibold text-[var(--store-muted)]">Variant</p>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,120px),1fr))] gap-2">
                {options.map(option => {
                  const selected = String(option._id) === variantId;
                  const price = option.applicablePrice ?? (isApprovedDealer && option.dealerPrice > 0 ? option.dealerPrice : option.standardPrice);
                  const inStock = getMaximumOrderQuantity(selectedVariantProduct(product, option._id)) > 0;
                  return <label key={option._id} className={`relative min-w-0 cursor-pointer rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-[var(--store-primary)] ${selected ? 'border-[var(--store-primary)] bg-[var(--store-primary)]/5 ring-1 ring-[var(--store-primary)]' : 'border-[var(--store-border)] hover:border-[var(--store-primary)]'}`}>
                    <input type="radio" name="product-variant" aria-label={option.name} value={String(option._id)} checked={selected} onChange={() => { setSelectedVariantId(String(option._id)); setQuantity(1); }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                    <span className="block break-words text-base font-semibold text-[var(--store-primary)]">{option.name}</span>
                    <span className="mt-1 block text-xs leading-5">{pricesVisible && <><span className="text-[var(--store-muted)]">{formatCurrency(price)}</span><span aria-hidden="true"> · </span></>}<span className={inStock ? 'text-emerald-700' : 'text-rose-600'}>{inStock ? 'In Stock' : 'Out of Stock'}</span></span>
                  </label>;
                })}
              </div>
              {purchaseProduct?.sku && <p className="text-xs text-[var(--store-muted)]">SKU: {purchaseProduct.sku}</p>}
            </fieldset>}
            {/* Price & Discount Row */}
            {pricesVisible && <PriceGate>
            <div className="flex items-center justify-between gap-2 border-b border-[var(--store-border)] pb-3">
              <div className="flex flex-col">
                <span data-testid="purchase-price" aria-live="polite" className="text-2xl sm:text-3xl font-black text-[var(--store-text)] tracking-tight">
                  {formatCurrency(displayPrice)}
                </span>
                {hasDealerDiscount && (
                  <span className="text-xs text-[var(--store-muted)] line-through">
                    Standard: {formatCurrency(standardPrice)}
                  </span>
                )}
              </div>

              {hasDealerDiscount && (
                <span className="inline-flex items-center rounded border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold uppercase tracking-tight text-[var(--store-primary)]">
                  DEALER SAVING: {formatCurrency(standardPrice - dealerPrice)}
                </span>
              )}
            </div>

            </PriceGate>}
            {/* In Stock / Out of Stock Status Pill */}
            {isOutOfStock ? (
              <div className="w-full py-2.5 px-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>OUT OF STOCK</span>
              </div>
            ) : productIsLowStock ? (
              <div className="w-full py-2.5 px-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>LOW STOCK</span>
              </div>
            ) : (
              <div className="w-full py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>IN STOCK</span>
              </div>
            )}

            {!pricesVisible ? <LoginToViewPrices /> : <>
            {/* Quantity Stepper + Add to Cart Button (Matching Screenshot) */}
            <div className="flex flex-wrap items-center gap-3">
              {isInStock && (
                <div className="flex items-center h-11 border border-[var(--store-border)] rounded-lg bg-[var(--store-surface)] overflow-hidden shadow-xs shrink-0">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={isDecrementDisabled}
                    className="w-10 h-full flex items-center justify-center text-[var(--store-muted)] hover:bg-[var(--store-background)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4 stroke-[2.2]" />
                  </button>
                  <span className="w-10 h-full flex items-center justify-center border-x border-[var(--store-border)] font-bold text-sm text-[var(--store-text)] select-none">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={isIncrementDisabled}
                    className="w-10 h-full flex items-center justify-center text-[var(--store-muted)] hover:bg-[var(--store-background)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAdding || !product.isActive}
                className="min-w-[150px] flex-1 h-11 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs bg-[var(--store-primary)] hover:bg-[#66001a] text-white cursor-pointer active:scale-98"
                title={isInStock ? 'Add to Cart' : 'Out of Stock - Please send an enquiry'}
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                <span>{isAdding ? 'Adding...' : isOutOfStock ? 'Enquire about availability' : 'Add to Cart'}</span>
              </button>
            </div>
            </>}


            {isOutOfStock && <p className="text-sm text-[var(--store-muted)]">Send an enquiry to ask about availability and restocking.</p>}
            {pricesVisible && whatsappPhone && (
              <a href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Hello, I would like to order ${purchaseProduct?.name || product.name}${product.modelNumber ? ` (Model: ${product.modelNumber})` : ''}. Quantity: ${quantity}. Please confirm pricing and availability. ${window.location.href}`)}`} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700">
                Order on WhatsApp
              </a>
            )}
            {/* Trust Footer */}
            <div className="text-[10px] text-[var(--store-muted)] text-center pt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--store-muted)] shrink-0" />
              <span>Secured by ViNexus Genuine Warranty</span>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* =========================================================================
          3. SPECIFICATIONS SECTION (On Scroll Down - Exactly Matching Given Image 2)
         ========================================================================= */}
      <section className="space-y-4 pt-4 border-t border-[var(--store-border)]">
        {/* Header with List Icon */}
        <div className="flex items-center gap-2.5 text-[var(--store-text)]">
          <div className="w-6 h-6 rounded bg-[var(--store-primary)]/10 flex items-center justify-center text-[var(--store-primary)]">
            <ListFilter className="w-4 h-4" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--store-text)]">
            Specifications
          </h2>
        </div>

        {/* Alternating Row Table Matching Given Image 2 */}
        <div className="bg-[var(--store-surface)] rounded-xl border border-[var(--store-border)] overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse text-xs sm:text-sm" style={{ fontFamily: 'inherit' }}>
            <tbody>
              {fullSpecifications.map((spec, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    idx % 2 === 0 ? 'bg-[#fcfbfc]' : 'bg-[var(--store-surface)]'
                  } border-b border-[var(--store-border)] last:border-b-0`}
                >
                  <td className="px-5 sm:px-6 py-3.5 font-medium text-[var(--store-muted)] w-1/4 sm:w-1/5 select-none">
                    {spec.key}
                  </td>
                  <td className="px-5 sm:px-6 py-3.5 font-medium text-[var(--store-text)] text-xs sm:text-sm">
                    {spec.key === 'Product URL' ? (
                      <a href={spec.value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[var(--store-primary)] underline underline-offset-2 hover:text-[#650019]">
                        View Product <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : spec.key === 'Brand' && brandUrl ? (
                      <Link to={brandUrl} className="inline-flex items-center text-[var(--store-primary)] hover:underline font-semibold">
                        {spec.value}
                      </Link>
                    ) : spec.key === 'Key Features' ? (
                      <div className="whitespace-pre-line font-sans font-normal text-[var(--store-text)] text-xs sm:text-sm leading-relaxed">
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
      {relatedHeader && (
        <section aria-label="Related products" className="space-y-4 pt-8 border-t border-[var(--store-border)]">
          <div className="flex items-center justify-between border-b border-[var(--store-border)] pb-3">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--store-text)] tracking-tight">
              Related Products
            </h2>
            <Link
              to={categoryPath}
              className="text-xs sm:text-sm font-semibold text-[var(--store-primary)] hover:underline flex items-center gap-1"
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
            !relatedLoading && !relatedError && <p className="text-sm text-[var(--store-muted)]">No other products in this header category yet.</p>
          )}
          {relatedLoading && <p role="status" className="text-sm text-[var(--store-muted)]">Loading related products…</p>}
          {relatedError && <div><p role="alert" className="text-sm text-red-700">{relatedError}</p><button type="button" onClick={() => setRelatedRetry(value => value + 1)} className="mt-2 rounded border px-3 py-2 text-sm">Retry related products</button></div>}
          {hasMoreRelated && !relatedError && <button type="button" disabled={relatedLoading} onClick={() => setRelatedPage(page => page + 1)} className="rounded-lg border px-4 py-2 text-sm font-semibold text-[var(--store-text)]">Show more related products</button>}
        </section>
      )}
      {recentProducts.length > 0 && <section aria-label="Recently viewed products" className="space-y-4 border-t border-[var(--store-border)] pt-8">
        <h2 className="text-lg sm:text-xl font-bold text-[var(--store-text)]">Recently viewed products</h2>
        <div className="storefront-product-grid gap-4 sm:gap-5">{recentProducts.map(value => <ProductCard key={value._id} product={value} />)}</div>
      </section>}

    </div>
  );
};

export default ProductDetailPage;
