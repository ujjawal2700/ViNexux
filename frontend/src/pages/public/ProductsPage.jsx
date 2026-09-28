import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import ProductCard from '../../components/products/ProductCard';
import { Drawer } from '../../components/ui/Drawer';
import { Pagination } from '../../components/ui/Pagination';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/DropdownMenu';
import NotFoundPage from './NotFoundPage';
import useAuth from '../../hooks/useAuth';
import {
  buildCategoryPath,
  buildCategoryTrail,
  buildBrandUrl,
} from '../../utils/categoryUrls';
import {
  Filter,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  CheckSquare,
  Square,
  SlidersHorizontal,
  PackageCheck,
  Layers,
  Cpu,
  Check,
} from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'name_asc', label: 'Name (A - Z)' },
  { value: 'name_desc', label: 'Name (Z - A)' },
  { value: 'price_asc', label: 'Price (Low > High)' },
  { value: 'price_desc', label: 'Price (High > Low)' },
  { value: 'model_asc', label: 'Model (A - Z)' },
  { value: 'model_desc', label: 'Model (Z - A)' },
];

export const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = useParams();
  const { headerSlug, param2, param3, brandSlug } = params;

  // Target category slug from hierarchical route (header / main / sub)
  const targetCategorySlug = !brandSlug ? (param3 || param2 || headerSlug || '') : '';

  // URL Query Parameters
  const { user } = useAuth();
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('categoryId') || searchParams.get('category') || '';
  const initialBrand = searchParams.get('brand') || '';

  // Local state
  const searchTerm = initialSearch;


  const [selectedSpecs, setSelectedSpecs] = useState({}); // { "Wattage": ["65w"], ... }
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortOption, setSortOption] = useState('default');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 28;
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Accordion toggle states in sidebar
  const [openSections, setOpenSections] = useState({
    categories: true,
    brands: true,
    availability: true,
    specs: true,
  });

  // Data states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [categoryError, setCategoryError] = useState(null);
  const [facets, setFacets] = useState({ brands: [], specs: [] });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch complete category tree for breadcrumb & sidebar hierarchy
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryService.getCategoryTree();
        const list = res.data?.categories || res.categories || [];
        setCategories(list);
      } catch {
        setCategoryError('Unable to load categories. Please retry.');
      } finally {
        setCategoriesLoaded(true);
      }
    };
    fetchCategories();
  }, []);

  // Validate the entire URL chain, not just the last slug. A laptop child
  // cannot be resolved under a different header such as /security/....
  const routeCategory = useMemo(() => {
    if (!targetCategorySlug) return null;
    let parentId = null;
    let current = null;
    for (const slug of [headerSlug, param2, param3].filter(Boolean)) {
      current = categories.find((category) => category.slug === slug.toLowerCase()
        && String(category.parentId?._id || category.parentId || '') === String(parentId || ''));
      if (!current) return null;
      parentId = current._id;
    }
    return current;
  }, [categories, headerSlug, param2, param3, targetCategorySlug]);
  const queryCategory = categories.find((category) => category._id === initialCategory || category.slug === initialCategory);
  const selectedCategoryId = targetCategorySlug ? (routeCategory?._id || '') : (queryCategory?._id || initialCategory);
  const resolvedBrand = initialBrand || (brandSlug ? brandSlug.replace(/-/g, ' ').toUpperCase() : null);
  const selectedBrands = useMemo(() => resolvedBrand ? [resolvedBrand.toUpperCase()] : [], [resolvedBrand]);
  const activeBrandParam = resolvedBrand || '';

  // 3. Fetch products from API
  const fetchProducts = useCallback(async (signal) => {
    if (!categoriesLoaded || categoryError || (targetCategorySlug && !routeCategory)) return;
    setIsLoading(true);
    setError(null);

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
      } else if (sortOption === 'name_desc') {
        sortBy = 'name';
        sortOrder = 'desc';
      } else if (sortOption === 'model_asc') {
        sortBy = 'modelNumber';
        sortOrder = 'asc';
      } else if (sortOption === 'model_desc') {
        sortBy = 'modelNumber';
        sortOrder = 'desc';
      } else if (sortOption === 'newest') {
        sortBy = 'createdAt';
        sortOrder = 'desc';
      } else {
        sortBy = 'createdAt';
        sortOrder = 'desc';
      }

      const query = {
        page: currentPage,
        limit: itemsPerPage,
        isActive: true,
        sortBy,
        sortOrder,
      };

      if (searchTerm.trim()) {
        query.search = searchTerm.trim();
      }

      if (selectedCategoryId && /^[0-9a-fA-F]{24}$/.test(selectedCategoryId)) {
        query.categoryId = selectedCategoryId;
      } else if (initialCategory) {
        query.category = initialCategory;
      }

      if (brandSlug && !initialBrand) query.brandSlug = brandSlug;
      else if (initialBrand) query.brand = initialBrand;
      if (inStockOnly) query.inStock = 'true';
      if (Object.values(selectedSpecs).some((values) => values.length)) query.specs = JSON.stringify(selectedSpecs);
      const response = await productService.getProducts(query, { signal });
      if (signal?.aborted) return;
      setFacets(response.data?.facets || { brands: [], specs: [] });
      const productList = response.data?.products || response.products || [];
      const pageInfo = response.data?.pagination || response.pagination || {
        page: 1,
        totalPages: 1,
        total: productList.length,
      };

      setProducts(productList);
      setPagination(pageInfo);
    } catch (err) {
      if (signal?.aborted || err.code === 'ERR_CANCELED') return;
      setProducts([]);
      console.error('Catalog products fetch error:', err);
      setError('Unable to load catalog products. Please check your connection.');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, selectedCategoryId, targetCategorySlug, sortOption, initialCategory, initialBrand, brandSlug, inStockOnly, selectedSpecs, categoriesLoaded, categoryError, routeCategory, user?.id, user?.dealerStatus]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  const availableBrands = facets.brands;
  const dynamicSpecs = facets.specs;
  // Filtering and pagination are performed together by MongoDB.
  const displayedProducts = products;

  // Current Active Category Object
  const activeCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categories.find((c) => c._id === selectedCategoryId) || null;
  }, [selectedCategoryId, categories]);

  // Compute Breadcrumb Trail (Supports Brand view like "Home > Brands > ACER" & Category hierarchy like "Home > Laptop > Branded Laptop")
  const breadcrumbTrail = useMemo(() => {
    const brandName = resolvedBrand || (selectedBrands.length === 1 && !selectedCategoryId ? selectedBrands[0] : '');

    // Brand view: Home > Brands > ACER
    if (brandName && !selectedCategoryId) {
      return [
        { label: 'Home', path: '/' },
        { label: 'Brands', path: '/brands' },
        { label: brandName, path: null },
      ];
    }

    // Brand + Category: Home > Brands > ACER > Laptop
    if (brandName && selectedCategoryId && activeCategory) {
      return [
        { label: 'Home', path: '/' },
        { label: 'Brands', path: '/brands' },
        { label: brandName, path: buildBrandUrl(brandName) },
        { label: activeCategory.name, path: null },
      ];
    }

    // Category hierarchy view: Home > Laptop > Branded Laptop (matching Mega Jaipur screenshot)
    if (activeCategory) {
      return buildCategoryTrail(activeCategory, categories);
    }

    return [
      { label: 'Home', path: '/' },
      { label: 'All Products', path: null },
    ];
  }, [resolvedBrand, selectedBrands, selectedCategoryId, activeCategory, categories]);

  // Related categories for sidebar (siblings or children)
  const categoryNavigation = useMemo(() => {
    if (!activeCategory) {
      return {
        type: 'root',
        items: categories.filter((c) => !c.parentId),
      };
    }

    const directChildren = categories.filter(
      (c) => (c.parentId?._id || c.parentId)?.toString() === activeCategory._id.toString()
    );

    if (directChildren.length > 0) {
      return {
        type: 'children',
        parent: activeCategory,
        items: directChildren,
      };
    }

    const parentId = activeCategory.parentId?._id || activeCategory.parentId;
    if (parentId) {
      const parentCat = categories.find((c) => c._id === parentId.toString());
      const siblings = categories.filter(
        (c) => (c.parentId?._id || c.parentId)?.toString() === parentId.toString()
      );
      return {
        type: 'siblings',
        parent: parentCat,
        items: siblings,
      };
    }

    return {
      type: 'root',
      items: categories.filter((c) => !c.parentId),
    };
  }, [activeCategory, categories]);

  // Keep search and category constraints when changing a brand.
  const handleToggleBrand = (brandName) => {
    const next = new URLSearchParams(searchParams);
    if (selectedBrands.includes(brandName)) next.delete('brand');
    else next.set('brand', brandName);
    if (brandSlug) navigate(`/search?${next}`);
    else setSearchParams(next);
  };

  // Toggle spec filter
  const handleToggleSpec = (key, val) => {
    setCurrentPage(1);
    setSelectedSpecs((prev) => {
      const currentList = prev[key] || [];
      const updatedList = currentList.includes(val)
        ? currentList.filter((v) => v !== val)
        : [...currentList, val];
      return { ...prev, [key]: updatedList };
    });
  };

  // Preserve search/brand when navigating to a different category.
  const handleSelectCategory = (catId) => {
    const next = new URLSearchParams(searchParams);
    next.delete('category');
    next.delete('categoryId');
    if (resolvedBrand) next.set('brand', resolvedBrand);
    const category = categories.find((item) => String(item._id) === String(catId));
    const path = catId && category ? buildCategoryPath(category, categories) : (activeCategory ? buildCategoryPath(activeCategory, categories) : '/');
    navigate(`${path}${next.size ? `?${next}` : ''}`);
    setIsMobileFilterOpen(false);
  };

  const handleResetFilters = () => {
    setSelectedSpecs({});
    setInStockOnly(false);
    setSortOption('default');
    setCurrentPage(1);
    setIsMobileFilterOpen(false);
    navigate(activeCategory ? buildCategoryPath(activeCategory, categories) : '/');
  };

  // Compute Page Header Title (Matching Mega Jaipur: "Branded Laptop", "Laptop Hinges", "ACER")
  const pageTitle = useMemo(() => {
    const brandName = resolvedBrand || (selectedBrands.length === 1 && !selectedCategoryId ? selectedBrands[0] : '');
    if (brandName && !selectedCategoryId) {
      return brandName;
    }
    if (brandName && selectedCategoryId && activeCategory) {
      return `${brandName} - ${activeCategory.name}`;
    }
    return activeCategory?.name || (searchTerm ? `Search: "${searchTerm}"` : 'Product Catalog');
  }, [resolvedBrand, selectedBrands, selectedCategoryId, activeCategory, searchTerm]);

  // Sidebar Filter Content (used in both desktop sidebar & mobile drawer)
  const renderSidebarFilters = () => (
    <div className="space-y-4">
      {/* 1. Header with Filters title & Reset All */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
          <Filter className="w-4 h-4 text-primary" />
          <span>Filters</span>
        </div>
        {(selectedCategoryId || selectedBrands.length > 0 || inStockOnly || searchTerm || Object.keys(selectedSpecs).some(k => selectedSpecs[k]?.length > 0)) && (
          <button
            onClick={handleResetFilters}
            className="text-xs font-semibold text-primary hover:underline transition-colors cursor-pointer"
          >
            Reset All
          </button>
        )}
      </div>

      {/* 2. Categories Accordion (matching Screenshot) */}
      <div className="border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() =>
            setOpenSections((prev) => ({ ...prev, categories: !prev.categories }))
          }
          className="w-full flex items-center justify-between font-bold text-xs uppercase tracking-wider text-gray-800 py-1.5 hover:text-primary transition-colors select-none"
        >
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" />
            <span>Categories</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
              openSections.categories ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSections.categories && (
          <div className="mt-2.5 space-y-2">
            {/* If a category is selected and we are NOT in brand view, show checked box */}
            {activeCategory && !activeBrandParam && (
              <div className="p-2 rounded bg-primary/5 border border-primary/20 space-y-1.5">
                <label
                  onClick={() => handleSelectCategory(activeCategory._id)}
                  className="flex items-center gap-2 text-xs font-bold text-primary cursor-pointer select-none"
                >
                  <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{activeCategory.name}</span>
                </label>
                {activeCategory.parentId && (
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectCategory(
                        activeCategory.parentId?._id || activeCategory.parentId
                      )
                    }
                    className="text-[11px] text-gray-500 hover:text-primary hover:underline flex items-center gap-1 pl-6 transition-colors"
                  >
                    <span>↑ Back to {activeCategory.parentId?.name || 'Parent'}</span>
                  </button>
                )}
              </div>
            )}

            {/* List items (e.g. Laptop (8) in brand view matching reference screenshot) */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {categoryNavigation.items.map((cat) => {
                const isSelected = selectedCategoryId === cat._id;
                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => handleSelectCategory(cat._id)}
                    className={`w-full flex items-center justify-between text-xs px-2 py-1.5 rounded transition-all text-left group cursor-pointer ${
                      isSelected
                        ? 'font-bold text-primary bg-primary/10'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 shrink-0" />
                      )}
                      <span className="truncate">{cat.name}</span>
                    </div>
                    {cat.count !== undefined && (
                      <span className="text-[11px] text-gray-400 font-medium ml-1 shrink-0">
                        {cat.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Brands Accordion */}
      <div className="border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() =>
            setOpenSections((prev) => ({ ...prev, brands: !prev.brands }))
          }
          className="w-full flex items-center justify-between font-bold text-xs uppercase tracking-wider text-gray-800 py-1.5 hover:text-primary transition-colors select-none"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span>Brands</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
              openSections.brands ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSections.brands && (
          <div className="mt-2.5 space-y-2 max-h-60 overflow-y-auto pr-1">
            {availableBrands.length > 0 ? (
              availableBrands.map((brand) => {
                const isChecked = selectedBrands.includes(brand.name.toUpperCase());
                return (
                  <label
                    key={brand.name}
                    className="flex items-center justify-between text-xs text-gray-700 hover:text-gray-900 cursor-pointer select-none py-0.5 group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleBrand(brand.name)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-[#800020] cursor-pointer"
                      />
                      <span
                        className={`truncate ${
                          isChecked ? 'font-bold text-gray-900' : 'group-hover:text-primary'
                        }`}
                      >
                        {brand.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 font-medium ml-2 shrink-0">
                      {brand.count}
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="text-xs text-gray-400 italic py-1">No brand tags found</p>
            )}
          </div>
        )}
      </div>

      {/* 4. Dynamic Specification Accordions (matching Wattage & Pin Size in screenshot) */}
      {dynamicSpecs.map((specGroup) => (
        <div key={specGroup.key} className="border-b border-gray-200 pb-3">
          <button
            type="button"
            onClick={() =>
              setOpenSections((prev) => ({
                ...prev,
                [`spec_${specGroup.key}`]: !prev[`spec_${specGroup.key}`],
              }))
            }
            className="w-full flex items-center justify-between font-bold text-xs uppercase tracking-wider text-gray-800 py-1.5 hover:text-primary transition-colors select-none"
          >
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              <span className="truncate">{specGroup.label || specGroup.key}{specGroup.unit ? ` (${specGroup.unit})` : ''}</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                openSections[`spec_${specGroup.key}`] !== false ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openSections[`spec_${specGroup.key}`] !== false && (
            <div className="mt-2.5 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {specGroup.values.map(({ val, count }) => {
                const isChecked = (selectedSpecs[specGroup.key] || []).includes(val);
                return (
                  <label
                    key={val}
                    className="flex items-center justify-between text-xs text-gray-700 hover:text-gray-900 cursor-pointer select-none py-0.5 group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSpec(specGroup.key, val)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-[#800020] cursor-pointer"
                      />
                      <span
                        className={`truncate ${
                          isChecked ? 'font-bold text-gray-900' : 'group-hover:text-primary'
                        }`}
                      >
                        {val}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 font-medium ml-2 shrink-0">
                      {count}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* 5. Availability Accordion (In Stock checkbox) */}
      <div>
        <button
          type="button"
          onClick={() =>
            setOpenSections((prev) => ({ ...prev, availability: !prev.availability }))
          }
          className="w-full flex items-center justify-between font-bold text-xs uppercase tracking-wider text-gray-800 py-1.5 hover:text-primary transition-colors select-none"
        >
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-primary" />
            <span>Availability</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
              openSections.availability ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSections.availability && (
          <div className="mt-2.5">
            <label className="flex items-center justify-between text-xs text-gray-700 hover:text-gray-900 cursor-pointer select-none py-1 group">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => { setInStockOnly(e.target.checked); setCurrentPage(1); }}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-[#800020] cursor-pointer"
                />
                <span
                  className={
                    inStockOnly ? 'font-bold text-gray-900' : 'group-hover:text-primary'
                  }
                >
                  In Stock
                </span>
              </div>
              <span className="text-[11px] text-gray-400 font-medium">
                {products.length}
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );

  if (categoryError) return <ErrorState title="Categories unavailable" description={categoryError} onRetry={() => window.location.reload()} />;

  // If a category was requested in the URL path but does not exist
  if (targetCategorySlug && categoriesLoaded && !routeCategory) {
    return <NotFoundPage />;
  }

  // If a brand was requested in /brands/:brandSlug but does not exist
  if (brandSlug && !resolvedBrand) {
    return <NotFoundPage />;
  }

  return (
    <div className="w-full bg-[#f8f9fa]">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-0 space-y-5">
        {/* 1. BREADCRUMBS & CENTERED BRAND/CATEGORY TITLE (matching Screenshot) */}
        <div className="flex flex-col items-center justify-center relative space-y-2 pb-2">
          {/* Breadcrumb row */}
          <nav
            aria-label="Breadcrumb"
            className="w-full flex items-center flex-wrap gap-1.5 text-xs text-gray-500 font-medium mb-1"
          >
            {breadcrumbTrail.map((crumb, idx) => (
              <React.Fragment key={crumb.label + idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                {crumb.path ? (
                  <Link
                    to={crumb.path}
                    className="hover:text-primary hover:underline transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-800 font-semibold">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Centered Large Title (matching Screenshot: e.g. "ACER") */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#800020] tracking-tight text-center">
            {pageTitle}
          </h1>

          <div className="w-full sm:w-auto sm:absolute sm:right-0 sm:bottom-2 flex items-center justify-between sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:border-[#800020] transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              <span>Filters</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Sort products"
                  className="w-48 flex items-center justify-between gap-3 text-sm font-semibold text-gray-800 bg-white border border-[#800020] rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#800020]/20 cursor-pointer shadow-2xs"
                >
                  <span>{SORT_OPTIONS.find((option) => option.value === sortOption)?.label || 'Default'}</span>
                  <ChevronDown className="w-4 h-4 text-[#800020]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-[#800020]/25">
                {SORT_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => {
                      setSortOption(option.value);
                      setCurrentPage(1);
                    }}
                    className={sortOption === option.value
                      ? 'bg-[#800020] text-white focus:bg-[#800020] focus:text-white'
                      : 'text-gray-800 focus:bg-[#800020]/10 focus:text-[#800020]'}
                  >
                    <span className="flex-1">{option.label}</span>
                    {sortOption === option.value && <Check className="w-4 h-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 2. TWO-COLUMN LAYOUT: SIDEBAR (lg:col-span-3) + PRODUCT GRID (lg:col-span-9) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* DESKTOP SIDEBAR FILTERS (matching Screenshot) */}
          <aside className="hidden lg:block lg:col-span-3 xl:col-span-3 2xl:col-span-2 bg-white rounded-lg border border-gray-200 p-4 shadow-2xs sticky top-36">
            {renderSidebarFilters()}
          </aside>

          {/* MAIN PRODUCT CATALOG CONTENT */}
          <main className="lg:col-span-9 xl:col-span-9 2xl:col-span-10 space-y-4">
            {/* Active Filter Chips */}
            {(selectedBrands.length > 0 || inStockOnly || Object.keys(selectedSpecs).some(k => selectedSpecs[k]?.length > 0)) && (
              <div className="flex items-center flex-wrap gap-2 pt-1">
                {selectedBrands.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    <span>Brand: {b}</span>
                    <button
                      onClick={() => handleToggleBrand(b)}
                      className="hover:text-red-600 font-bold ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {Object.entries(selectedSpecs).flatMap(([key, vals]) =>
                  (vals || []).map((val) => (
                    <span
                      key={key + val}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      <span>{key}: {val}</span>
                      <button
                        onClick={() => handleToggleSpec(key, val)}
                        className="hover:text-blue-900 font-bold ml-0.5 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
                {inStockOnly && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span>In Stock Only</span>
                    <button
                      onClick={() => { setInStockOnly(false); setCurrentPage(1); }}
                      className="hover:text-emerald-900 font-bold ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete('brand');
                    if (brandSlug) navigate(`/search?${next}`);
                    else setSearchParams(next);
                    setCurrentPage(1);
                    setSelectedSpecs({});
                    setInStockOnly(false);
                  }}
                  className="text-xs text-gray-500 hover:text-primary hover:underline ml-1 cursor-pointer"
                >
                  Clear filter tags
                </button>
              </div>
            )}

            {/* PRODUCT CARDS HIGH-DENSITY GRID (matching Screenshot: 4-5 cards per row on large displays) */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3 sm:gap-3.5">
                {[...Array(8)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : error ? (
              <ErrorState title="Catalog Error" description={error} onRetry={() => fetchProducts()} />
            ) : displayedProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3 sm:gap-3.5">
                  {displayedProducts.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      onCartUpdated={() => fetchProducts()}
                    />
                  ))}
                </div>

                {/* BACKEND PAGINATION */}
                <div className="pt-5">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    pageSize={itemsPerPage}
                    variant="catalog"
                    onPageChange={(page) => {
                      setCurrentPage(page);
                      window.scrollTo({ top: 120, behavior: 'smooth' });
                    }}
                  />
                </div>
              </>
            ) : (
              <EmptyState
                title="No Products Found"
                description={
                  activeBrandParam
                    ? `No products found under brand "${activeBrandParam}".`
                    : activeCategory
                    ? `No products found under "${activeCategory.name}".`
                    : 'No products match your current search or category filter criteria.'
                }
                actionLabel="Reset All Filters"
                onAction={handleResetFilters}
              />
            )}
          </main>
        </div>
      </div>

      {/* MOBILE FILTER DRAWER */}
      <Drawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        position="left"
        title="Filter Products"
      >
        <div className="p-4 overflow-y-auto max-h-[85vh]">{renderSidebarFilters()}</div>
      </Drawer>
    </div>
  );
};

// URL changes start a fresh query and reset pagination/spec filters.
const CatalogRoutePage = () => {
  const location = useLocation();
  return <ProductsPage key={location.pathname + location.search} />;
};
export default CatalogRoutePage;
