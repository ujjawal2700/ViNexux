import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import ProductCard from '../../components/products/ProductCard';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Drawer } from '../../components/ui/Drawer';
import { Pagination } from '../../components/ui/Pagination';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Filter, SlidersHorizontal, RefreshCw, Layers, CheckCircle } from 'lucide-react';

export const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract initial query params from URL
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('categoryId') || '';

  // Local filter states
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortOption, setSortOption] = useState('newest'); // newest | price_asc | price_desc | name_asc
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Data states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Update URL search params when search or category changes
  useEffect(() => {
    const querySearch = searchParams.get('search') || '';
    const queryCategory = searchParams.get('categoryId') || '';
    setSearchTerm(querySearch);
    setSelectedCategory(queryCategory);
  }, [searchParams]);

  // Fetch Categories for sidebar filter
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryService.getCategories({ limit: 100, isActive: true });
        const list = res.data?.categories || res.categories || [];
        setCategories(list);
      } catch (err) {
        console.warn('Failed to load categories for catalog filter:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Products based on current filters, sorting & pagination
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Map sortOption dropdown to backend params
      let sortBy = 'createdAt';
      let sortOrder = 'desc';

      if (sortOption === 'price_asc') {
        sortBy = 'standardPrice';
        sortOrder = 'asc';
      } else if (sortOption === 'price_desc') {
        sortBy = 'standardPrice';
        sortOrder = 'desc';
      } else if (sortOption === 'name_asc') {
        sortBy = 'name';
        sortOrder = 'asc';
      } else if (sortOption === 'newest') {
        sortBy = 'createdAt';
        sortOrder = 'desc';
      }

      const query = {
        page: currentPage,
        limit: 12,
        isActive: true,
        sortBy,
        sortOrder,
      };

      if (searchTerm.trim()) {
        query.search = searchTerm.trim();
      }

      if (selectedCategory) {
        query.categoryId = selectedCategory;
      }

      const response = await productService.getProducts(query);
      const productList = response.data?.products || response.products || [];
      const pageInfo = response.data?.pagination || response.pagination || { page: 1, totalPages: 1, total: productList.length };

      setProducts(productList);
      setPagination(pageInfo);
    } catch (err) {
      console.error('Catalog products fetch error:', err);
      setError('Unable to load catalog products. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, selectedCategory, sortOption]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle Search Input Change
  const handleSearchSubmit = (val) => {
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (val) {
      newParams.set('search', val);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  // Handle Category Filter Select
  const handleCategorySelect = (catId) => {
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (catId) {
      newParams.set('categoryId', catId);
    } else {
      newParams.delete('categoryId');
    }
    setSearchParams(newParams);
    setIsMobileFilterOpen(false);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSortOption('newest');
    setCurrentPage(1);
    setSearchParams({});
    setIsMobileFilterOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 bg-background text-foreground min-h-screen">
      
      {/* 1. CATALOG PAGE HEADER */}
      <div className="border-b border-border pb-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Security & CCTV Catalog</span>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Product Catalog</h1>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Browse high-definition security equipment, DVRs/NVRs, cables, and routers.
            </p>
          </div>

          {/* Search Input, Category Filter Dropdown & Sort Dropdown */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex-1 min-w-[200px] md:w-60">
              <SearchInput
                placeholder="Search SKU or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClear={() => handleSearchSubmit('')}
              />
            </div>

            {/* Upper Bar Category Dropdown Filter */}
            <div className="w-full sm:w-56">
              <Select
                value={selectedCategory}
                onChange={(e) => handleCategorySelect(e.target.value)}
                placeholder={null}
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.map((cat) => ({
                    value: cat._id,
                    label: cat.name,
                  })),
                ]}
              />
            </div>

            {/* Sort Dropdown */}
            <div className="w-full sm:w-44">
              <Select
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={null}
                options={[
                  { value: 'newest', label: 'Newest Arrivals' },
                  { value: 'price_asc', label: 'Price: Low to High' },
                  { value: 'price_desc', label: 'Price: High to Low' },
                  { value: 'name_asc', label: 'Name: A-Z' },
                ]}
              />
            </div>

            {(selectedCategory || searchTerm) && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-all flex items-center gap-1 shrink-0"
                title="Reset all filters"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. MAIN COMPACT PRODUCT CATALOG GRID */}
      <main className="space-y-6">
        
        {/* Info Header Line */}
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium border-b border-border/40 pb-2">
          <div>
            Showing <span className="font-bold text-foreground">{products.length}</span> of{' '}
            <span className="font-bold text-foreground">{pagination.total || products.length}</span> items
            {searchTerm && <span> for "<span className="text-primary font-bold">{searchTerm}</span>"</span>}
          </div>
        </div>

        {/* PRODUCT CARDS HIGH-DENSITY GRID (5-6 items per row) */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {[...Array(12)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState title="Catalog Error" description={error} onRetry={fetchProducts} />
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} onCartUpdated={fetchProducts} />
              ))}
            </div>

            {/* BACKEND PAGINATION */}
            {pagination.totalPages > 1 && (
              <div className="pt-6 border-t border-border/80 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="No Products Found"
            description="No security products match your current search or category filter criteria."
            actionLabel="Clear Filters"
            onAction={handleResetFilters}
          />
        )}
      </main>
    </div>
  );
};

export default ProductsPage;
