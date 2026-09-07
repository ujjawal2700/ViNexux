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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 bg-[#fdf8f9] text-[#3d0a0d] min-h-screen">
      
      {/* 1. CATALOG PAGE HEADER */}
      <div className="border-b border-[#e5d1d4] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#800020]">Security & CCTV Catalog</span>
          <h1 className="text-3xl font-black text-[#3d0a0d] tracking-tight">Product Catalog</h1>
          <p className="text-xs text-[#7c5c5f] mt-1 font-medium">
            Browse high-definition security equipment, DVRs/NVRs, cables, and routers.
          </p>
        </div>

        {/* Top Controls: Search & Mobile Filter Toggle */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex-1 md:w-72">
            <SearchInput
              placeholder="Search SKU or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => handleSearchSubmit('')}
            />
          </div>

          <Button
            variant="outline"
            size="md"
            className="lg:hidden shrink-0 border-[#e5d1d4] text-[#800020]"
            leftIcon={<SlidersHorizontal className="w-4 h-4" />}
            onClick={() => setIsMobileFilterOpen(true)}
          >
            Filters
          </Button>
        </div>
      </div>

      {/* 2. MAIN CATALOG BODY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* DESKTOP SIDEBAR FILTER PANEL */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6 sticky top-24 glass-panel p-6 rounded-2xl border border-[#e5d1d4] bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-[#e5d1d4] pb-4">
            <div className="flex items-center gap-2 text-[#3d0a0d] font-bold text-sm">
              <Filter className="w-4 h-4 text-[#800020]" />
              <span>Catalog Filters</span>
            </div>
            {(selectedCategory || searchTerm) && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-[#800020] hover:text-[#9a1b32] flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          {/* Category Selector Tree */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#7c5c5f]">Categories</h4>
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              <button
                onClick={() => handleCategorySelect('')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                  !selectedCategory
                    ? 'bg-[#f4e7ea] text-[#800020] border border-[#e5d1d4] font-bold shadow-xs'
                    : 'text-[#7c5c5f] hover:text-[#3d0a0d] hover:bg-[#f4e7ea]/50'
                }`}
              >
                <span>All Categories</span>
                {!selectedCategory && <CheckCircle className="w-3.5 h-3.5" />}
              </button>

              {categories.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => handleCategorySelect(cat._id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                    selectedCategory === cat._id
                      ? 'bg-[#f4e7ea] text-[#800020] border border-[#e5d1d4] font-bold shadow-xs'
                      : 'text-[#7c5c5f] hover:text-[#3d0a0d] hover:bg-[#f4e7ea]/50'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  {selectedCategory === cat._id && <CheckCircle className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* MOBILE FILTER DRAWER */}
        <Drawer
          isOpen={isMobileFilterOpen}
          onClose={() => setIsMobileFilterOpen(false)}
          title="Filter Catalog"
          position="left"
          size="sm"
        >
          <div className="space-y-6 pt-2">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300">Active Filters</span>
              <button
                onClick={handleResetFilters}
                className="text-xs text-crimson-400 hover:text-crimson-300"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase">Categories</h4>
              <div className="space-y-1">
                <button
                  onClick={() => handleCategorySelect('')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium ${
                    !selectedCategory ? 'bg-crimson-900/40 text-crimson-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => handleCategorySelect(cat._id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium ${
                      selectedCategory === cat._id ? 'bg-crimson-900/40 text-crimson-400 font-bold' : 'text-slate-300'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Drawer>

        {/* MAIN PRODUCT GRID & CONTROLS */}
        <main className="col-span-1 lg:col-span-9 space-y-6">
          
          {/* Top Grid Info Bar: Result count & Sort dropdown */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              Showing <span className="font-bold text-white">{products.length}</span> of{' '}
              <span className="font-bold text-white">{pagination.total || products.length}</span> products
              {searchTerm && <span> for "<span className="text-crimson-400">{searchTerm}</span>"</span>}
            </div>

            {/* Sort Select */}
            <div className="w-full sm:w-56">
              <Select
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'newest', label: 'Sort: Newest Arrival' },
                  { value: 'price_asc', label: 'Price: Low to High' },
                  { value: 'price_desc', label: 'Price: High to Low' },
                  { value: 'name_asc', label: 'Name: A-Z' },
                ]}
              />
            </div>
          </div>

          {/* PRODUCT CARDS LIST / STATES */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState title="Catalog Error" description={error} onRetry={fetchProducts} />
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} onCartUpdated={fetchProducts} />
                ))}
              </div>

              {/* BACKEND PAGINATION */}
              {pagination.totalPages > 1 && (
                <div className="pt-6 border-t border-slate-800/80 flex justify-center">
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
    </div>
  );
};

export default ProductsPage;
