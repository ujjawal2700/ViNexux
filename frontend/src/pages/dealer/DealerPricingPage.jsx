import React, { useState, useEffect, useCallback } from 'react';
import dealerService from '../../services/dealerService';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import ProductCard from '../../components/products/ProductCard';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Tag, Lock, CheckCircle2, AlertTriangle, Filter, RefreshCw, Layers } from 'lucide-react';

export const DealerPricingPage = () => {
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Dealer Profile & Catalog Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // 1. Fetch Dealer Profile
    try {
      const profRes = await dealerService.getDealerProfile();
      const profData = profRes.data?.profile || profRes.profile || profRes.data;
      setProfile(profData);
    } catch (profErr) {
      console.warn('Dealer profile not found or error:', profErr);
    }

    // 2. Fetch Categories
    try {
      const catRes = await categoryService.getCategories({ limit: 100, isActive: true });
      const catList = catRes.data?.categories || catRes.categories || [];
      setCategories(catList);
    } catch (catErr) {
      console.warn('Categories fetch error:', catErr);
    }

    // 3. Fetch Products
    try {
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

      const prodRes = await productService.getProducts(query);
      const prodList = prodRes.data?.products || prodRes.products || [];
      const pageInfo = prodRes.data?.pagination || prodRes.pagination || { page: 1, totalPages: 1, total: prodList.length };

      setProducts(prodList);
      setPagination(pageInfo);
    } catch (prodErr) {
      console.error('Dealer catalog products error:', prodErr);
      setError('Unable to load wholesale catalog products.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, selectedCategory, sortOption]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isApproved = profile?.status === 'approved';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSortOption('newest');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8 text-foreground max-w-7xl mx-auto">
      
      {/* 1. HEADER & KYC STATUS ALERT */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">B2B Commercial Catalog</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <Tag className="w-7 h-7 text-primary" />
            <span>Tiered Wholesale Pricing Matrix</span>
          </h1>
        </div>

        {profile && <StatusBadge status={profile.status} />}
      </div>

      {/* KYC Pricing Status Banner */}
      {isApproved ? (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <span className="font-bold block text-foreground">Wholesale Rates Active</span>
            <p className="text-[#664448]">
              Your account is approved. Exclusive wholesale dealer pricing is active across all catalog items.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3 shadow-sm">
          <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-foreground">Wholesale Pricing Locked</span>
            <p className="text-[#664448]">
              Standard prices are currently displayed. Complete your KYC profile submission and await admin approval to unlock B2B wholesale rates.
            </p>
          </div>
        </div>
      )}

      {/* 2. CATALOG CONTROLS BAR */}
      <div className="bg-card p-4 rounded-2xl border border-border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="w-full sm:w-72">
            <SearchInput
              placeholder="Search product SKU or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
            />
          </div>

          <div className="w-full sm:w-48">
            <Select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map((c) => ({ value: c._id, label: c.name })),
              ]}
            />
          </div>
        </div>

        <div className="w-full sm:w-56 flex items-center gap-2">
          <div className="flex-1">
            <Select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'newest', label: 'Sort: Newest' },
                { value: 'price_asc', label: 'Price: Low to High' },
                { value: 'price_desc', label: 'Price: High to Low' },
                { value: 'name_asc', label: 'Name: A-Z' },
              ]}
            />
          </div>

          {(searchTerm || selectedCategory) && (
            <Button variant="ghost" size="sm" iconOnly title="Reset Filters" onClick={handleResetFilters}>
              <RefreshCw className="w-4 h-4 text-primary" />
            </Button>
          )}
        </div>
      </div>

      {/* 3. PRODUCT GRID */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Catalog Error" description={error} onRetry={loadData} />
      ) : products.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} onCartUpdated={loadData} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pt-6 border-t border-border flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title="No Wholesale Products Found"
          description="No products match your current search or category filter criteria."
          actionLabel="Reset Filters"
          onAction={handleResetFilters}
        />
      )}
    </div>
  );
};

export default DealerPricingPage;
