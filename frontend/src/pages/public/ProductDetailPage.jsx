import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import productService from '../../services/productService';
import cartService from '../../services/cartService';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import ProductCard from '../../components/products/ProductCard';
import { Button } from '../../components/ui/Button';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Image } from '../../components/ui/Image';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  ShoppingCart,
  ArrowLeft,
  Tag,
  ShieldCheck,
  Layers,
  Plus,
  Minus,
  CheckCircle2,
  Share2,
} from 'lucide-react';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);

  // Fetch product data
  const fetchProduct = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await productService.getProductById(id);
      const prod = res.data?.product || res.product || res.data;
      if (!prod) {
        setError('Product not found');
        return;
      }
      setProduct(prod);

      // Fetch related products if categoryId is available
      const catId = typeof prod.categoryId === 'object' ? prod.categoryId._id : prod.categoryId;
      if (catId) {
        try {
          const relRes = await productService.getProducts({ categoryId: catId, limit: 4, isActive: true });
          const relList = relRes.data?.products || relRes.products || [];
          setRelatedProducts(relList.filter((p) => p._id !== prod._id));
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
  }, [id]);

  useEffect(() => {
    fetchProduct();
    setSelectedImageIndex(0);
    setQuantity(1);
  }, [fetchProduct]);

  // Determine user pricing role
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

  // Format Currency (INR ₹)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Quantity Modifier Handlers
  const handleDecrement = () => setQuantity((prev) => Math.max(1, prev - 1));
  const handleIncrement = () => setQuantity((prev) => Math.min(1000, prev + 1));

  // Add to Cart Action
  const handleAddToCart = async () => {
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
      await cartService.addItem(product._id, quantity);
      toast.success(`Added ${quantity} x "${product.name}" to cart!`);
    } catch (err) {
      console.error('Failed to add item to cart:', err);
      const errMsg = err.response?.data?.message || 'Failed to add product to cart.';
      toast.error(errMsg);
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8 bg-background">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-4">
            <Skeleton className="h-96 w-full rounded-2xl" />
            <div className="flex gap-4">
              <Skeleton className="h-20 w-20 rounded-xl" />
              <Skeleton className="h-20 w-20 rounded-xl" />
            </div>
          </div>
          <div className="lg:col-span-6 space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-48" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <ErrorState title="Product Not Found" description={error || "The requested product does not exist in our catalog."} />
        <div className="text-center mt-6">
          <Link to="/products">
            <Button variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return to Catalog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [{ url: '' }];
  const currentImage = images[selectedImageIndex]?.url || '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12 bg-background text-foreground min-h-screen">
      
      {/* 1. BREADCRUMB HEADER */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-4">
        <Link to="/products" className="hover:text-primary inline-flex items-center gap-1.5 font-medium transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Product Catalog
        </Link>
        <div className="flex items-center gap-2 text-[#9a6870]">
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span>Category:</span>
          <span className="text-foreground font-semibold">
            {typeof product.categoryId === 'object' ? product.categoryId?.name : 'Security Equipment'}
          </span>
        </div>
      </div>

      {/* 2. MAIN PRODUCT PRESENTATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Left Column: Image Gallery & Thumbnails */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-card p-2 rounded-3xl border border-border overflow-hidden relative group shadow-sm">
            <Image
              src={currentImage}
              alt={product.name}
              aspectRatio="aspect-square"
              className="rounded-2xl object-cover w-full h-full"
            />
            {product.isFeatured && (
              <Badge variant="warning" className="absolute top-4 left-4 shadow-lg">
                Featured Equipment
              </Badge>
            )}
          </div>

          {/* Thumbnails Row */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    selectedImageIndex === index ? 'border-primary scale-95 shadow-md' : 'border-border opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image src={img.url} alt={`Thumbnail ${index}`} aspectRatio="aspect-square" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Metadata & Pricing Controls */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Header Titles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="font-mono text-xs text-primary font-bold uppercase tracking-wider">
                SKU: {product.sku}
              </span>
              <StatusBadge status={product.isActive ? 'in-stock' : 'out-of-stock'} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-snug">
              {product.name}
            </h1>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-xs sm:text-sm text-[#664448] leading-relaxed border-t border-border pt-4">
              {product.description}
            </p>
          )}

          {/* Role-Aware Pricing Block */}
          <div className="bg-card p-5 rounded-2xl border border-border space-y-2 shadow-sm">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-foreground tracking-tight">
                {formatCurrency(displayPrice)}
              </span>

              {hasDealerDiscount && (
                <span className="text-base text-[#9a6870] line-through font-medium">
                  {formatCurrency(standardPrice)}
                </span>
              )}
            </div>

            <div className="text-xs">
              {isApprovedDealer ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Verified Dealer Wholesale Price Applied
                </span>
              ) : isAdmin ? (
                <span className="text-muted-foreground">
                  Standard: {formatCurrency(standardPrice)} | Dealer: {formatCurrency(dealerPrice)}
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Standard Retail Price (Log in as Approved Dealer for wholesale rates)
                </span>
              )}
            </div>
          </div>

          {/* Quantity Selector & Add to Cart Controls */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Quantity:</span>
              <div className="flex items-center bg-muted border border-border rounded-xl overflow-hidden">
                <button
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  className="p-2.5 text-muted-foreground hover:text-primary disabled:opacity-40 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-bold text-foreground font-mono">{quantity}</span>
                <button
                  onClick={handleIncrement}
                  className="p-2.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isAdding}
                isDisabled={!product.isActive}
                leftIcon={<ShoppingCart className="w-5 h-5" />}
                onClick={handleAddToCart}
              >
                {product.isActive ? 'Add to Cart' : 'Out of Stock'}
              </Button>
            </div>
          </div>

          {/* Brand/Support Highlights */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Authentic Brand Guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-700" />
              <span>Bulk Commercial Quotation</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DETAILED SPECIFICATIONS TABLE */}
      {product.specifications && product.specifications.length > 0 && (
        <div className="space-y-4 border-t border-border pt-10">
          <h3 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <span>Technical Specifications</span>
          </h3>

          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <tbody>
                {product.specifications.map((spec, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? 'bg-background' : 'bg-card'}
                  >
                    <td className="px-6 py-3.5 font-bold text-foreground w-1/3 border-b border-border">
                      {spec.key}
                    </td>
                    <td className="px-6 py-3.5 text-[#664448] border-b border-border font-mono">
                      {spec.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. RELATED PRODUCTS RECOMMENDATIONS */}
      {relatedProducts.length > 0 && (
        <div className="space-y-6 border-t border-border pt-10">
          <h3 className="text-xl font-bold text-foreground tracking-tight">Related Category Equipment</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map((relProd) => (
              <ProductCard key={relProd._id} product={relProd} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
