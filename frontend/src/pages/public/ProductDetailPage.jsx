import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import cartService from '../../services/cartService';
import wishlistService from '../../services/wishlistService';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import ProductCard from '../../components/products/ProductCard';
import { extractProductId, buildCategoryPath, buildCategoryTrail } from '../../utils/categoryUrls';
import { Image } from '../../components/ui/Image';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  ShoppingCart,
  ArrowLeft,
  Tag,
  ShieldCheck,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  Share2,
  ChevronRight,
  ChevronLeft,
  Heart,
  Copy,
  Check,
  FileText,
  X,
  Send,
  Phone,
  ListFilter,
  CheckCircle,
} from 'lucide-react';

export const ProductDetailPage = () => {
  const params = useParams();
  const { id, param2, param3, brandSlug } = params;
  const rawId = id || param3 || param2;
  const productId = extractProductId(rawId);

  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  // Quick Enquiry Modal State
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({
    name: '',
    phone: '',
    city: '',
    message: '',
  });
  const [isSubmittingEnquiry, setIsSubmittingEnquiry] = useState(false);

  // 1. Fetch categories tree for breadcrumbs & category linking
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await categoryService.getCategories({ limit: 500, isActive: true });
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
      setError('Product ID is missing');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
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
        const stored = JSON.parse(localStorage.getItem('vinexus_recently_viewed') || '[]');
        const filtered = stored.filter((p) => p && String(p._id) !== String(prod._id));
        const updated = [prod, ...filtered].slice(0, 12);
        localStorage.setItem('vinexus_recently_viewed', JSON.stringify(updated));
      } catch (e) {
        // non-blocking
      }

      // Fetch related products from same category
      const catId = typeof prod.categoryId === 'object' ? prod.categoryId._id : prod.categoryId;
      if (catId) {
        try {
          const relRes = await productService.getProducts({ categoryId: catId, limit: 8, isActive: true });
          const relList = relRes.data?.products || relRes.products || [];
          setRelatedProducts(relList.filter((p) => String(p._id) !== String(prod._id)).slice(0, 4));
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
  }, [productId]);

  useEffect(() => {
    fetchProduct();
    setSelectedImageIndex(0);
    setQuantity(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchProduct]);

  // Sync enquiry form defaults from logged-in user
  useEffect(() => {
    if (user) {
      setEnquiryForm((prev) => ({
        ...prev,
        name: user.fullName || user.name || user.contactPerson || '',
        phone: user.phone || user.whatsappNumber || '',
      }));
    }
  }, [user]);

  // Compute Breadcrumb Trail
  const breadcrumbTrail = useMemo(() => {
    if (brandSlug) {
      const brandName = brandSlug.replace(/-/g, ' ').toUpperCase();
      return [
        { label: 'Home', path: '/' },
        { label: 'Brands', path: '/brands' },
        { label: brandName, path: `/brands/${brandSlug}` },
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

    return [
      { label: 'Home', path: '/' },
      { label: 'Products', path: '/products' },
      { label: product?.name || 'Product Details', path: null },
    ];
  }, [brandSlug, product, categories]);

  // Category Path & Name for "See all in [Category] ->"
  const categoryPath = useMemo(() => {
    const catId = typeof product?.categoryId === 'object' ? product?.categoryId?._id : product?.categoryId;
    const catObj = categories.find((c) => String(c._id) === String(catId)) || (typeof product?.categoryId === 'object' ? product.categoryId : null);
    if (catObj) {
      return buildCategoryPath(catObj, categories);
    }
    return '/products';
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

  let displayPrice = standardPrice;
  let hasDealerDiscount = false;

  if (isApprovedDealer && dealerPrice > 0) {
    displayPrice = dealerPrice;
    if (standardPrice > dealerPrice) {
      hasDealerDiscount = true;
    }
  }

  // Stock status: isActive = true means available in stock
  const isInStock = Boolean(product?.isActive);

  // Format Currency (INR ₹)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Quantity Modifier Handlers
  const handleDecrement = () => setQuantity((prev) => Math.max(1, prev - 1));
  const handleIncrement = () => setQuantity((prev) => Math.min(1000, prev + 1));

  // Add to Cart Action
  const handleAddToCart = async () => {
    if (!isInStock) {
      toast.warning('This product is currently out of stock. Please submit an enquiry.');
      return;
    }

    if (!isAuthenticated) {
      toast.info('Please log in to add products to your cart.');
      navigate('/login');
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

  // Share
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: `Check out ${product?.name} on ViNexus`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  // Extracted Brand info
  const brandName = useMemo(() => {
    const fromSpec = product?.specifications?.find((s) => s.key.toLowerCase() === 'brand')?.value;
    if (fromSpec) return fromSpec;
    if (product?.brand) return product.brand;
    const firstWord = product?.name?.split(' ')[0];
    return firstWord || 'ViNexus';
  }, [product]);

  // Model & Item code from specifications
  const modelName = useMemo(() => {
    const fromSpec = product?.specifications?.find(
      (s) => s.key.toLowerCase().includes('model') || s.key.toLowerCase().includes('series')
    )?.value;
    return fromSpec || product?.name?.split(' ')[1] || 'Standard Series';
  }, [product]);

  const itemCode = useMemo(() => {
    const fromSpec = product?.specifications?.find(
      (s) => s.key.toLowerCase().includes('code') || s.key.toLowerCase().includes('part')
    )?.value;
    return fromSpec || (product?.sku ? product.sku.slice(0, 8).toUpperCase() : 'VNX-ITEM');
  }, [product]);

  const warrantyText = useMemo(() => {
    const fromSpec = product?.specifications?.find((s) => s.key.toLowerCase().includes('warranty'))?.value;
    return fromSpec || '1 Year ON-SITE / Direct Replacement Warranty';
  }, [product]);

  // WhatsApp Enquiry Link Generator
  const whatsappUrl = useMemo(() => {
    const phone = '918949940610';
    const message = `Hello ViNexus, I am interested in:
*Product:* ${product?.name || ''}
*PID / SKU:* ${product?.sku || ''}
*Item CD:* ${itemCode}
*Model:* ${modelName}
*Status:* ${isInStock ? 'In Stock' : 'Out of Stock (Special Request)'}
*Price:* ${formatCurrency(displayPrice)}
*Link:* ${window.location.href}

Please share commercial quotation and availability.`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }, [product, modelName, itemCode, isInStock, displayPrice]);

  // Submit Enquiry Modal Form
  const handleSubmitEnquiry = async (e) => {
    e.preventDefault();
    if (!enquiryForm.phone || enquiryForm.phone.length < 10) {
      toast.error('Please enter a valid 10-digit WhatsApp/Mobile number');
      return;
    }

    setIsSubmittingEnquiry(true);
    try {
      if (isAuthenticated && !isAdmin) {
        try {
          await cartService.addItem(product._id, quantity);
          window.dispatchEvent(new Event('cart-updated'));
        } catch {
          // non-blocking
        }
      }

      toast.success(
        `Thank you ${enquiryForm.name || 'Valued Customer'}! Your enquiry for "${product.name}" has been recorded. Our enterprise team will contact you shortly.`
      );
      setIsEnquiryModalOpen(false);

      // Open WhatsApp chat to speed up inquiry
      window.open(whatsappUrl, '_blank');
    } catch (err) {
      console.error('Enquiry submission error:', err);
      toast.error('Failed to submit enquiry. Please try via WhatsApp.');
    } finally {
      setIsSubmittingEnquiry(false);
    }
  };

  // Structured Full Specifications List (Matching Image 2)
  const fullSpecifications = useMemo(() => {
    if (!product) return [];
    const list = [];

    // Ensure Brand and Model are first
    list.push({ key: 'Brand', value: brandName });
    list.push({ key: 'Model', value: modelName });

    // Add all existing specs from product.specifications if not already present
    if (product.specifications && Array.isArray(product.specifications)) {
      product.specifications.forEach((s) => {
        if (s.key && s.value && s.key.toLowerCase() !== 'brand' && s.key.toLowerCase() !== 'model') {
          list.push({ key: s.key, value: s.value });
        }
      });
    }

    // Warranty if not already in list
    if (!list.some((s) => s.key.toLowerCase().includes('warranty'))) {
      list.push({ key: 'Warranty Period', value: warrantyText });
    }

    // Key Features summary if available
    if (product.description) {
      list.push({ key: 'Key Features', value: product.description });
    }

    return list;
  }, [product, brandName, modelName, warrantyText]);

  // Product Images Gallery (Safe for hooks order)
  const images = useMemo(() => {
    if (!product) return [{ url: '' }];
    let list = product.images && product.images.length > 0 ? product.images : [{ url: '' }];
    if (list.length === 1 && list[0].url) {
      list = [
        list[0],
        { url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=80', altText: `${product.name} Alternate Angle` },
      ];
    }
    return list;
  }, [product]);

  const currentImage = images[selectedImageIndex]?.url || images[0]?.url || '';

  if (isLoading) {
    return (
      <div className="w-full px-3 sm:px-6 lg:px-8 2xl:px-12 py-8 space-y-6 bg-white min-h-screen">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-3">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <ErrorState title="Product Not Found" description={error || 'The requested product does not exist in our catalog.'} />
        <div className="mt-6">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#800020] text-white font-bold text-sm hover:bg-[#66001a] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 2xl:px-12 py-4 sm:py-6 space-y-10 bg-white min-h-screen text-gray-900 font-sans">
      
      {/* 1. TOP BREADCRUMBS (Matching Given Image - No left gap) */}
      <div className="flex items-center justify-between gap-3 text-xs border-b border-gray-200 pb-3">
        <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1.5 text-gray-500 text-xs">
          {breadcrumbTrail.map((crumb, idx) => {
            const isLast = idx === breadcrumbTrail.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                {isLast || !crumb.path ? (
                  <span className="font-bold text-gray-900 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.path}
                    className="hover:text-[#800020] transition-colors truncate"
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-start">
        
        {/* =========================================
            COLUMN 1: PRODUCT IMAGE & THUMBNAILS (Left - No empty margin)
           ========================================= */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-3">
          <div className="bg-white p-4 rounded-xl border border-gray-200 overflow-hidden relative shadow-2xs group flex items-center justify-center min-h-[360px] sm:min-h-[420px] lg:min-h-[460px]">
            <Image
              src={currentImage}
              alt={product.name}
              aspectRatio="aspect-square"
              className="rounded-lg object-contain w-full max-h-[420px] transition-transform duration-300 group-hover:scale-102"
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
        <div className="lg:col-span-5 space-y-4">
          {/* Title Row + Action Icons + Brand Box */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-snug">
                {product.name}
              </h1>

              {/* Action Icons: Heart (Wishlist), Copy Link, Share */}
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
                  onClick={handleCopyLink}
                  className="p-1.5 rounded-full border border-gray-200 text-gray-500 hover:text-[#800020] hover:border-gray-300 transition-all cursor-pointer"
                  title="Copy Product Link"
                >
                  {hasCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="p-1.5 rounded-full border border-gray-200 text-gray-500 hover:text-[#800020] hover:border-gray-300 transition-all cursor-pointer"
                  title="Share Product"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Brand Logo / Box (Matching Given Image: White rectangular box with border) */}
            <div
              className="border border-gray-200 rounded-lg px-3 py-1.5 min-w-[70px] text-center font-black text-sm text-[#800020] bg-white shadow-2xs shrink-0 flex items-center justify-center uppercase tracking-wider"
              title={`Brand: ${brandName}`}
            >
              {brandName}
            </div>
          </div>

          {/* Product Overview Specs Table (Matching Given Image) */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs bg-white text-xs">
            <table className="w-full text-left border-collapse">
              <tbody>
                {/* 1. Product ID */}
                <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-gray-600 w-2/5 flex items-center gap-2">
                    <span className="text-[#800020] font-bold text-sm">#</span>
                    <span>Product ID</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono font-bold text-gray-900">
                    {product.sku || product._id?.slice(-6).toUpperCase()}
                  </td>
                </tr>

                {/* 2. Item CD */}
                <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-gray-600 flex items-center gap-2">
                    <span className="text-gray-400 font-bold">::</span>
                    <span>Item CD</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-gray-800">
                    {itemCode}
                  </td>
                </tr>

                {/* 3. Model */}
                <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-gray-600 flex items-center gap-2">
                    <span className="text-gray-400 font-bold">▣</span>
                    <span>Model</span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">
                    {modelName}
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

                {/* 5. Product Registration */}
                <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-gray-600 flex items-center gap-2">
                    <span className="text-gray-400 font-bold">::</span>
                    <span>Product Registration</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <a
                      href={`https://wa.me/918949940610?text=Hi%20ViNexus%2C%20I%20want%20to%20register%20warranty%20for%20${encodeURIComponent(product.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#800020] font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Click here</span>
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  </td>
                </tr>

                {/* 6. Warranty Claim Procedure */}
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-gray-600 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-[#800020]" />
                    <span>Warranty Claim Procedure</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <a
                      href={`https://wa.me/918949940610?text=Hi%20ViNexus%2C%20I%20need%20assistance%20with%20warranty%20claim%20for%20${encodeURIComponent(product.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#800020] font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Click here</span>
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Contact Assistance Row (Matching Given Image: "For More Information: 70738 88300") */}
          <div className="bg-[#fbf7f9] border border-rose-200/70 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-800">
              <CheckCircle2 className="w-4 h-4 text-[#800020] shrink-0" />
              <span>For More Information:</span>
              <a href="tel:+917073888300" className="font-bold text-[#800020] hover:underline font-mono">
                70738 88300
              </a>
            </div>
            <a
              href="https://wa.me/917073888300"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-[#800020] hover:underline"
            >
              Contact Support &rarr;
            </a>
          </div>
        </div>

        {/* =========================================
            COLUMN 3: BUY CARD, ADD TO CART & ENQUIRIES (Right)
            Matching Given Image with User Rules:
            - If In Stock: Add to Cart Enabled, WhatsApp Enabled, Send Enquiry Disabled
            - If Out of Stock: Add to Cart Disabled, Send Enquiry Enabled
           ========================================= */}
        <div className="lg:col-span-3">
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

              {/* Discount Tag */}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 text-[#800020] border border-rose-200 text-xs font-bold uppercase tracking-tight shrink-0">
                <Tag className="w-3 h-3 text-[#800020]" />
                {hasDealerDiscount
                  ? `CD DISCOUNT: ${formatCurrency(standardPrice - dealerPrice)}`
                  : `CD DISCOUNT: ${formatCurrency(Math.max(50, Math.round(displayPrice * 0.03)))}`}
              </span>
            </div>

            {/* In Stock / Out of Stock Status Pill */}
            {isInStock ? (
              <div className="w-full py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>IN STOCK</span>
              </div>
            ) : (
              <div className="w-full py-2 px-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>OUT OF STOCK</span>
              </div>
            )}

            {/* Quantity Selector + Add to Cart Button */}
            <div className="flex items-center gap-2">
              {/* Quantity Counter */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden h-11 shrink-0 bg-gray-50">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantity <= 1 || !isInStock}
                  className="px-2.5 h-full hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-colors cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-bold text-gray-900 text-sm">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={!isInStock}
                  className="px-2.5 h-full hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-colors cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add to Cart Button (Enabled when In Stock, Disabled when Out of Stock) */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!isInStock || isAdding}
                className={`flex-1 h-11 px-3 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-xs ${
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

            {/* Add to Quotation / Send Enquiry Button */}
            {/* RULE: If product available (in stock) -> Send Enquiry button is DISABLED */}
            {/* If product out of stock -> Send Enquiry button is ENABLED */}
            <div>
              <button
                type="button"
                onClick={() => setIsEnquiryModalOpen(true)}
                disabled={isInStock}
                className={`w-full h-10 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                  !isInStock
                    ? 'border-[#800020] bg-[#800020] text-white hover:bg-[#66001a] shadow-sm cursor-pointer'
                    : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                }`}
                title={
                  !isInStock
                    ? 'Submit enquiry for restock or bulk order'
                    : 'Product is available in stock to purchase directly via Cart'
                }
              >
                <FileText className="w-3.5 h-3.5" />
                <span>
                  {!isInStock ? 'Send Enquiry (Out of Stock)' : 'Send Enquiry (Disabled - Available via Cart)'}
                </span>
              </button>
            </div>

            {/* TWO BOTTOM OPTION BOXES: WhatsApp Enquiry & Send Enquiry */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
              
              {/* Option 1: WhatsApp Enquiry (Always enabled) */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl border border-gray-200 hover:border-[#25D366] hover:bg-emerald-50/40 transition-all flex flex-col justify-between group cursor-pointer text-left"
                title="Send Enquiry to WhatsApp"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-gray-900 group-hover:text-[#25D366] transition-colors flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 fill-[#25D366] shrink-0" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                    WhatsApp
                  </span>
                  <span className="text-[9px] font-bold text-[#25D366] uppercase">Chat &rarr;</span>
                </div>
                <span className="text-[10px] text-gray-500 line-clamp-1 leading-tight">
                  Instant Quote
                </span>
              </a>

              {/* Option 2: Send Enquiry */}
              <button
                type="button"
                onClick={() => setIsEnquiryModalOpen(true)}
                className="p-2.5 rounded-xl border border-gray-200 hover:border-[#800020] hover:bg-rose-50/40 transition-all flex flex-col justify-between group cursor-pointer text-left"
                title="Submit B2B Quotation Enquiry"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-gray-900 group-hover:text-[#800020] transition-colors flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-[#800020] shrink-0" />
                    Enquiry
                  </span>
                  <span className="text-[9px] font-bold text-[#800020] uppercase">Quote &rarr;</span>
                </div>
                <span className="text-[10px] text-gray-500 line-clamp-1 leading-tight">
                  B2B Assistance
                </span>
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
                    {spec.value}
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
      {relatedProducts.length > 0 && (
        <section className="space-y-4 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              Related Products
            </h2>
            <Link
              to={categoryPath}
              className="text-xs sm:text-sm font-semibold text-[#800020] hover:underline flex items-center gap-1"
            >
              <span>See all in {categoryName}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 4 Columns Grid Matching Given Image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {relatedProducts.map((relProd) => (
              <ProductCard key={relProd._id} product={relProd} />
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          5. DIRECT PRODUCT ENQUIRY MODAL (B2B / Out of Stock / Custom Quotation)
         ========================================================================= */}
      {isEnquiryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#800020]" />
                <h3 className="font-bold text-base text-gray-900">
                  Submit Product Enquiry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEnquiryModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Snapshot */}
            <div className="my-4 p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
              <div className="w-14 h-14 bg-white rounded-lg p-1 border border-gray-200 shrink-0">
                <Image src={currentImage} alt={product.name} aspectRatio="aspect-square" className="object-contain w-full h-full" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-gray-900 truncate">{product.name}</h4>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                  <span>SKU: {product.sku}</span>
                  <span>•</span>
                  <span className="font-bold text-[#800020]">{formatCurrency(displayPrice)}</span>
                </div>
                <div className="mt-1">
                  {isInStock ? (
                    <span className="text-[10px] text-emerald-700 font-bold">✔ In Stock</span>
                  ) : (
                    <span className="text-[10px] text-rose-700 font-bold">✖ Out of Stock (Special Request)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Enquiry Form */}
            <form onSubmit={handleSubmitEnquiry} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={enquiryForm.name}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#800020] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">WhatsApp / Phone *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={enquiryForm.phone}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#800020] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">City / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Jaipur, Rajasthan"
                    value={enquiryForm.city}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#800020] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Specific Requirement / Query</label>
                <textarea
                  rows={3}
                  placeholder={`Specify required quantity, custom cabling, deployment timeframe, or ask about restocking for ${product.name}...`}
                  value={enquiryForm.message}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#800020] focus:outline-none resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingEnquiry}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-[#800020] hover:bg-[#66001a] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingEnquiry ? 'Sending...' : 'Submit Enquiry & Chat'}</span>
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Direct WhatsApp</span>
                </a>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
