import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link, useNavigate, useParams } from 'react-router-dom';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import ProductCard from '../../components/products/ProductCard';
import { Drawer } from '../../components/ui/Drawer';
import { Pagination } from '../../components/ui/Pagination';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import NotFoundPage from './NotFoundPage';
import { ALL_BRANDS } from './BrandsPage';
import {
  buildCategoryPath,
  buildCategoryTrail,
  buildBrandUrl,
  slugify,
} from '../../utils/categoryUrls';
import {
  Filter,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  CheckSquare,
  Square,
  SlidersHorizontal,
  PackageCheck,
  Layers,
  Cpu,
} from 'lucide-react';

export const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = useParams();
  const { headerSlug, param2, param3, brandSlug } = params;

  // Target category slug from hierarchical route (header / main / sub)
  const targetCategorySlug = !brandSlug ? (param3 || param2 || headerSlug || '') : '';

  // URL Query Parameters
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('categoryId') || searchParams.get('category') || '';
  const initialBrand = searchParams.get('brand') || '';

  // Local state
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedBrands, setSelectedBrands] = useState(() => (initialBrand ? [initialBrand.toUpperCase()] : []));
  const [selectedSpecs, setSelectedSpecs] = useState({}); // { "Wattage": ["65w"], ... }
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortOption, setSortOption] = useState('default'); // default | price_asc | price_desc | newest | name_asc
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
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
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch complete category tree for breadcrumb & sidebar hierarchy
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryService.getCategories({ limit: 500, isActive: true });
        const list = res.data?.categories || res.categories || [];
        setCategories(list);
      } catch (err) {
        console.warn('Failed to load categories for catalog filter:', err);
      } finally {
        setCategoriesLoaded(true);
      }
    };
    fetchCategories();
  }, []);

  // Resolve brand name from URL brandSlug or query parameter
  const resolvedBrand = useMemo(() => {
    const rawBrand = brandSlug || searchParams.get('brand');
    if (!rawBrand) return null;
    const s = slugify(rawBrand);
    const matched = ALL_BRANDS.find((b) => slugify(b.name) === s);
    if (matched) return matched.name;
    return brandSlug ? null : rawBrand.replace(/-/g, ' ').toUpperCase();
  }, [brandSlug, searchParams]);

  // Match category object from hierarchical route parameter
  const routeCategory = useMemo(() => {
    if (!targetCategorySlug || categories.length === 0) return null;
    const target = targetCategorySlug.toLowerCase();
    return (
      categories.find(
        (c) =>
          (c.slug && c.slug.toLowerCase() === target) ||
          slugify(c.name) === target ||
          c.name.toLowerCase() === target
      ) || null
    );
  }, [targetCategorySlug, categories]);

  // 2. Synchronize selectedCategoryId & brand from URL
  useEffect(() => {
    const querySearch = searchParams.get('search') || '';
    setSearchTerm(querySearch);

    // If on a Brand Route (/brands/:brandSlug)
    if (resolvedBrand) {
      setSelectedBrands([resolvedBrand.toUpperCase()]);
      setSelectedCategoryId('');
      return;
    }

    // If on a Category Route (/:headerSlug/...)
    if (routeCategory) {
      setSelectedCategoryId(routeCategory._id);
      setSelectedBrands([]);
      return;
    }

    // If query params (/products?categoryId=...&brand=...)
    const queryBrand = searchParams.get('brand') || '';
    if (queryBrand) {
      setSelectedBrands([queryBrand.toUpperCase()]);
    } else if (!brandSlug) {
      setSelectedBrands([]);
    }

    const rawCategory = searchParams.get('categoryId') || searchParams.get('category') || '';
    if (rawCategory && !/^[0-9a-fA-F]{24}$/.test(rawCategory) && categories.length > 0) {
      const matched = categories.find(
        (c) => c.slug === rawCategory.toLowerCase() || slugify(c.name) === rawCategory.toLowerCase()
      );
      if (matched) {
        setSelectedCategoryId(matched._id);
        return;
      }
    }
    if (!targetCategorySlug) {
      setSelectedCategoryId(rawCategory);
    }
  }, [searchParams, categories, resolvedBrand, routeCategory, brandSlug, targetCategorySlug]);

  // Helper to extract brand name from product specs or name
  const getProductBrand = useCallback((p) => {
    const specBrand = p.specifications?.find(
      (s) => s.key?.toLowerCase() === 'brand' || s.key?.toLowerCase() === 'manufacturer'
    )?.value;
    if (specBrand && specBrand.trim()) return specBrand.trim().toUpperCase();

    const upperName = (p.name || '').toUpperCase();
    const commonBrands = [
      'ACER',
      'HP',
      'DELL',
      'MSI',
      'ASUS',
      'LENOVO',
      'SAMSUNG',
      'LOGITECH',
      'WD',
      'WESTERN DIGITAL',
      'HIKVISION',
      'CP PLUS',
      'DAHUA',
      'D-LINK',
      'TPLINK',
      'ZEBRONICS',
    ];

    for (const b of commonBrands) {
      if (upperName.includes(b)) {
        return b;
      }
    }
    return 'OTHER';
  }, []);

  // Active Brand filter from URL or state
  const activeBrandParam = searchParams.get('brand') || (selectedBrands.length === 1 && !selectedCategoryId ? selectedBrands[0] : '');

  // 3. Fetch products from API
  const fetchProducts = useCallback(async () => {
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
      } else if (targetCategorySlug) {
        query.category = targetCategorySlug;
      }

      const brandToQuery = resolvedBrand || searchParams.get('brand') || (selectedBrands.length === 1 ? selectedBrands[0] : '');
      if (brandToQuery) {
        query.brand = brandToQuery;
      }

      const response = await productService.getProducts(query);
      const productList = response.data?.products || response.products || [];
      const pageInfo = response.data?.pagination || response.pagination || {
        page: 1,
        totalPages: 1,
        total: productList.length,
      };

      setProducts(productList);
      setPagination(pageInfo);
    } catch (err) {
      console.error('Catalog products fetch error:', err);
      setError('Unable to load catalog products. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, selectedCategoryId, targetCategorySlug, sortOption, searchParams, selectedBrands, resolvedBrand]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Compute Brand Counts from fetched products
  const availableBrands = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      const b = getProductBrand(p);
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [products, getProductBrand]);

  // Dynamic Specifications filters (e.g., Wattage, Pin Size) extracted from products
  const dynamicSpecs = useMemo(() => {
    const specMap = {};
    products.forEach((p) => {
      (p.specifications || []).forEach((spec) => {
        if (!spec.key || !spec.value) return;
        const key = spec.key.trim();
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'brand' || lowerKey === 'manufacturer') return;

        specMap[key] = specMap[key] || {};
        specMap[key][spec.value] = (specMap[key][spec.value] || 0) + 1;
      });
    });

    return Object.entries(specMap)
      .map(([key, vals]) => ({
        key,
        values: Object.entries(vals).map(([val, count]) => ({ val, count })),
      }))
      .filter((s) => s.values.length > 0 && s.values.length <= 15);
  }, [products]);

  // Filter products by selected brands, spec attributes, and in-stock checkbox
  const displayedProducts = useMemo(() => {
    return products.filter((p) => {
      // Brand filter
      if (selectedBrands.length > 0) {
        const b = getProductBrand(p);
        if (!selectedBrands.includes(b)) return false;
      }
      // Dynamic specs filter
      for (const [specKey, selectedVals] of Object.entries(selectedSpecs)) {
        if (selectedVals && selectedVals.length > 0) {
          const productSpecVal = p.specifications?.find(
            (s) => s.key?.toLowerCase() === specKey.toLowerCase()
          )?.value;
          if (!productSpecVal || !selectedVals.includes(productSpecVal)) {
            return false;
          }
        }
      }
      // Stock filter
      if (inStockOnly) {
        const isAvailable = p.isActive !== false;
        if (!isAvailable) return false;
      }
      return true;
    });
  }, [products, selectedBrands, selectedSpecs, inStockOnly, getProductBrand]);

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

  // Categories under this Brand or Standard hierarchy
  const brandCategories = useMemo(() => {
    const activeBrand = searchParams.get('brand') || (selectedBrands.length === 1 ? selectedBrands[0] : '');
    if (!activeBrand) return null;

    const catMap = {};
    products.forEach((p) => {
      const catObj = p.categoryId;
      if (!catObj) return;
      const cId = typeof catObj === 'object' ? catObj._id : catObj;
      const found = categories.find((c) => c._id === cId?.toString());
      if (found) {
        // Group by Header/Root Category if found, or direct category
        const pId = found.parentId?._id || found.parentId;
        const rootCat = pId ? categories.find((c) => c._id === pId.toString()) : found;
        const targetId = rootCat?._id || found._id;
        const targetName = rootCat?.name || found.name;
        catMap[targetId] = catMap[targetId] || { _id: targetId, name: targetName, count: 0 };
        catMap[targetId].count += 1;
      }
    });

    return Object.values(catMap);
  }, [searchParams, selectedBrands, products, categories]);

  // Related categories for sidebar (siblings or children)
  const categoryNavigation = useMemo(() => {
    if (brandCategories && brandCategories.length > 0) {
      return {
        type: 'brand',
        items: brandCategories,
      };
    }

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
  }, [brandCategories, activeCategory, categories]);

  // Toggle brand selection
  const handleToggleBrand = (brandName) => {
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (selectedBrands.includes(brandName)) {
      setSelectedBrands([]);
      newParams.delete('brand');
      setSearchParams(newParams);
      if (brandSlug) {
        navigate('/brands');
      }
    } else {
      setSelectedBrands([brandName]);
      if (!activeCategory) {
        navigate(buildBrandUrl(brandName));
      } else {
        newParams.set('brand', brandName);
        setSearchParams(newParams);
      }
    }
  };

  // Toggle spec filter
  const handleToggleSpec = (key, val) => {
    setSelectedSpecs((prev) => {
      const currentList = prev[key] || [];
      const updatedList = currentList.includes(val)
        ? currentList.filter((v) => v !== val)
        : [...currentList, val];
      return { ...prev, [key]: updatedList };
    });
  };

  // Switch category
  const handleSelectCategory = (catId) => {
    setCurrentPage(1);
    if (selectedCategoryId === catId || !catId) {
      setSelectedCategoryId('');
      if (resolvedBrand) {
        navigate(buildBrandUrl(resolvedBrand));
      } else {
        navigate('/products');
      }
    } else {
      const cat = categories.find((c) => String(c._id) === String(catId));
      if (cat) {
        navigate(buildCategoryPath(cat, categories));
      } else {
        navigate(`/products?categoryId=${catId}`);
      }
    }
    setIsMobileFilterOpen(false);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedBrands([]);
    setSelectedSpecs({});
    setInStockOnly(false);
    setSelectedCategoryId('');
    setSortOption('default');
    setCurrentPage(1);
    setSearchParams({});
    setIsMobileFilterOpen(false);
    navigate('/products');
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
      {dynamicSpecs.slice(0, 3).map((specGroup) => (
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
              <span className="truncate">{specGroup.key}</span>
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
                  onChange={(e) => setInStockOnly(e.target.checked)}
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

  // If a category was requested in the URL path but does not exist
  if (targetCategorySlug && categoriesLoaded && !routeCategory) {
    return <NotFoundPage />;
  }

  // If a brand was requested in /brands/:brandSlug but does not exist
  if (brandSlug && !resolvedBrand) {
    return <NotFoundPage />;
  }

  return (
    <div className="w-full bg-[#f8f9fa] min-h-screen pb-12">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight text-center uppercase">
            {pageTitle}
          </h1>
        </div>

        {/* 2. TWO-COLUMN LAYOUT: SIDEBAR (lg:col-span-3) + PRODUCT GRID (lg:col-span-9) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* DESKTOP SIDEBAR FILTERS (matching Screenshot) */}
          <aside className="hidden lg:block lg:col-span-3 xl:col-span-3 2xl:col-span-2 bg-white rounded-lg border border-gray-200 p-4 shadow-2xs sticky top-36">
            {renderSidebarFilters()}
          </aside>

          {/* MAIN PRODUCT CATALOG CONTENT */}
          <main className="lg:col-span-9 xl:col-span-9 2xl:col-span-10 space-y-4">
            {/* Top Bar: Results Count + Mobile Filter Button + Sort Dropdown */}
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between gap-3 shadow-2xs flex-wrap">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                  <span>Filters</span>
                </button>

                <div className="text-xs text-gray-500 font-medium">
                  Showing{' '}
                  <span className="font-bold text-gray-900">{displayedProducts.length}</span>{' '}
                  item(s)
                  {activeBrandParam && (
                    <span>
                      {' '}
                      for brand "<span className="text-primary font-bold">{activeBrandParam}</span>"
                    </span>
                  )}
                  {searchTerm && (
                    <span>
                      {' '}
                      for search "<span className="text-primary font-bold">{searchTerm}</span>"
                    </span>
                  )}
                </div>
              </div>

              {/* Controls: Per Page & Sort */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 font-medium hidden sm:inline">Per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#800020] cursor-pointer hover:border-gray-400 transition-colors shadow-2xs"
                  >
                    <option value={8}>8 / page</option>
                    <option value={12}>12 / page</option>
                    <option value={24}>24 / page</option>
                    <option value={48}>48 / page</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 font-medium hidden sm:inline">Sort:</span>
                  <select
                    value={sortOption}
                    onChange={(e) => {
                      setSortOption(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#800020] cursor-pointer hover:border-gray-400 transition-colors shadow-2xs"
                  >
                    <option value="default">Default</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="newest">Newest Arrivals</option>
                    <option value="name_asc">Name: A-Z</option>
                  </select>
                </div>
              </div>
            </div>

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
                      onClick={() => setInStockOnly(false)}
                      className="hover:text-emerald-900 font-bold ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedBrands([]);
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
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5">
                {[...Array(8)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : error ? (
              <ErrorState title="Catalog Error" description={error} onRetry={fetchProducts} />
            ) : displayedProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5">
                  {displayedProducts.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      onCartUpdated={fetchProducts}
                    />
                  ))}
                </div>

                {/* BACKEND PAGINATION */}
                <div className="pt-6 border-t border-gray-200">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    pageSize={itemsPerPage}
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

export default ProductsPage;
