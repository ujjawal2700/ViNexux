import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import productService from '../../services/productService';
import ProductCard from '../../components/products/ProductCard';
import { Skeleton } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import {
  Flame,
  AlertTriangle,
  ChevronRight,
  Home,
  SlidersHorizontal,
  ArrowUpDown,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';

export const LowStockProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentPage = useMemo(() => {
    const p = parseInt(searchParams.get('page') || '1', 10);
    return Number.isFinite(p) && p > 0 ? p : 1;
  }, [searchParams]);

  const sortBy = searchParams.get('sort') || 'stock-asc';

  const handlePageChange = (newPage) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(newPage));
    setSearchParams(nextParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (e) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('sort', e.target.value);
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  const fetchLowStockProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        lowStock: true,
        availability: 'low-stock',
        page: currentPage,
        limit: 20,
        isActive: true,
      };

      if (sortBy === 'price-asc') {
        params.sortBy = 'standardPrice';
        params.sortOrder = 'asc';
      } else if (sortBy === 'price-desc') {
        params.sortBy = 'standardPrice';
        params.sortOrder = 'desc';
      } else if (sortBy === 'newest') {
        params.sortBy = 'createdAt';
        params.sortOrder = 'desc';
      } else {
        // default: stock-asc (fewest left first)
        params.sortBy = 'stockQuantity';
        params.sortOrder = 'asc';
      }

      const res = await productService.getProducts(params);
      const data = res?.data || res;
      const list = data?.products || [];
      const meta = data?.pagination || {
        page: currentPage,
        limit: 20,
        total: list.length,
        pages: Math.ceil(list.length / 20) || 1,
      };

      setProducts(list);
      setPagination(meta);
    } catch (err) {
      console.error('Failed to load low stock products:', err);
      setError('Unable to load limited stock products right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, sortBy]);

  useEffect(() => {
    fetchLowStockProducts();
  }, [fetchLowStockProducts]);

  return (
    <div className="min-h-screen bg-[var(--store-background)]/60 pb-16">
      {/* 1. Breadcrumbs */}
      <div className="bg-[var(--store-surface)] border-b border-[var(--store-border)]">
        <div className="storefront-container py-3 px-4">
          <nav className="flex items-center gap-1.5 text-xs text-[var(--store-muted)]" aria-label="Breadcrumb">
            <Link to="/" className="flex items-center gap-1 hover:text-[var(--store-primary)] transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--store-muted)]" />
            <span className="font-semibold text-[var(--store-text)]">Limited Stock Alert</span>
          </nav>
        </div>
      </div>

      {/* 2. Hero Notice Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-[var(--store-primary)] text-white py-8 sm:py-10 shadow-inner">
        <div className="storefront-container px-4">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--store-surface)]/20 backdrop-blur-xs px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-100">
              <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Limited Stock Products</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Hurry! Limited Units Remaining
            </h1>
            <p className="text-sm sm:text-base text-amber-100/90 leading-relaxed">
              These verified items have fewer than 10 units left in warehouse inventory.
              To guarantee fair distribution across all buyers, purchase is capped at a <span className="font-bold underline decoration-amber-300">maximum of 3 units per order</span>.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-amber-200">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-300" /> Live stock allocation
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Genuine warranty verified
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300" /> Max 3 units / customer
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Grid & Controls */}
      <div className="storefront-container px-4 pt-6">
        {/* Controls Bar */}
        <div className="bg-[var(--store-surface)] rounded-xl border border-[var(--store-border)] p-3.5 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[var(--store-primary)]" />
            <span className="text-sm font-bold text-[var(--store-text)]">
              {isLoading ? (
                'Loading items...'
              ) : (
                <>
                  <span className="text-[var(--store-primary)] font-black">{pagination.total || products.length}</span>{' '}
                  {pagination.total === 1 ? 'Product with limited stock' : 'Products with limited stock'}
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <label htmlFor="sort-select" className="text-xs font-semibold text-[var(--store-muted)] flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={handleSortChange}
              className="text-xs font-semibold text-[var(--store-text)] bg-[var(--store-background)] border border-[var(--store-border)] rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-[var(--store-primary)]/20 focus:border-[var(--store-primary)] outline-none cursor-pointer"
            >
              <option value="stock-asc">Fewest Units Left</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newly Added</option>
            </select>
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-[var(--store-surface)] rounded-xl border border-[var(--store-border)] p-3 space-y-3">
                <Skeleton className="w-full aspect-square rounded-lg" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
                <Skeleton className="h-5 w-1/3 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-[var(--store-surface)] rounded-2xl border border-rose-200 p-8 text-center max-w-md mx-auto space-y-3">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-[var(--store-text)]">Failed to load</h3>
            <p className="text-xs text-[var(--store-muted)]">{error}</p>
            <button
              type="button"
              onClick={fetchLowStockProducts}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--store-primary)] text-white text-xs font-bold rounded-lg hover:bg-[var(--store-primary-hover)] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-[var(--store-surface)] rounded-2xl border border-[var(--store-border)] p-12 text-center max-w-lg mx-auto space-y-4 shadow-2xs">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-[var(--store-text)]">All Stock Fully Available!</h3>
            <p className="text-xs sm:text-sm text-[var(--store-muted)] leading-relaxed">
              There are currently no products with fewer than 10 units left in stock. Browse our full computer hardware and security catalog.
            </p>
            <div>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--store-primary)] text-white text-xs font-bold uppercase tracking-wider hover:bg-[var(--store-primary-hover)] transition-all shadow-xs"
              >
                Browse All Products
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.pages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LowStockProductsPage;
