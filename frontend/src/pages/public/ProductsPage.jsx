import CategoryFilters from '../../components/products/CategoryFilters';
import { CATEGORY_FILTER_KEYS, readCategorySelections, readSpecificationSelections, splitFilterValues, specificationFilterValues } from '../../../../shared/categoryFiltering.js';
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  useSearchParams,
  Link,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import productService from "../../services/productService";
import categoryService from "../../services/categoryService";
import ProductCard from "../../components/products/ProductCard";
import { Drawer } from "../../components/ui/Drawer";
import { Pagination } from "../../components/ui/Pagination";
import {
  FilterSidebarSkeleton,
  ProductCardSkeleton,
} from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/DropdownMenu";
import NotFoundPage from "./NotFoundPage";
import useAuth from "../../hooks/useAuth";
import usePageSeo from "../../hooks/usePageSeo";
import {
  buildCategoryPath,
  buildCategoryTrail,
  buildBrandUrl,
  cleanBrandSlug,
} from "../../utils/categoryUrls";
import {
  Filter,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  SlidersHorizontal,
  PackageCheck,
  Layers,
  Cpu,
  Check,
  ArrowUpDown,
} from "lucide-react";

const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "newest", label: "Newest First" },
  { value: "stock_updated", label: "Stock Updated" },
  { value: "price_asc", label: "Price (Low > High)" },
  { value: "price_desc", label: "Price (High > Low)" },
];

const DEFAULT_AVAILABILITY = [
  "in-stock",
  "low-stock",
  "on-order",
  "out-of-stock",
];

export const ProductsPage = ({ lowStockOnly = false, trendingOnly = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { headerSlug, param2, param3, brandSlug } = params;

  // Target category slug from hierarchical route (header / main / sub)
  const targetCategorySlug = !brandSlug
    ? param3 || param2 || headerSlug || ""
    : "";

  // URL Query Parameters
  const { user } = useAuth();
  const initialSearch = searchParams.get("search") || "";
  const initialCategory =
    searchParams.get("categoryId") || searchParams.get("category") || "";
  const initialBrand = searchParams.get("brand") || "";

  // Local state
  const searchTerm = initialSearch;

  const specsParam = searchParams.get("specs") || "";
  const availabilityParam = searchParams.get("availability");
  const selectedSpecs = useMemo(() => readSpecificationSelections(specsParam), [specsParam]);
  const selectedAvailability = useMemo(() => availabilityParam === null ? [...DEFAULT_AVAILABILITY] : splitFilterValues(availabilityParam).filter(value => DEFAULT_AVAILABILITY.includes(value)), [availabilityParam]);
  const [sortOption, setSortOption] = useState("default");
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
  const [facets, setFacets] = useState({
    categories: [],
    brands: [],
    availability: [],
    specs: [],
  });
  const facetKeyRef = useRef(null);
  const [facetsLoaded, setFacetsLoaded] = useState(false);
  // Set when the server found no exact matches and searched corrected words.
  const [correctedSearch, setCorrectedSearch] = useState("");
  const [resolvedRouteBrand, setResolvedRouteBrand] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

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
        setCategoryError("Unable to load categories. Please retry.");
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
      current = categories.find(
        (category) =>
          category.slug === slug.toLowerCase() &&
          String(category.parentId?._id || category.parentId || "") ===
            String(parentId || ""),
      );
      if (!current) return null;
      parentId = current._id;
    }
    return current;
  }, [categories, headerSlug, param2, param3, targetCategorySlug]);
  const queryCategory = categories.find(
    (category) =>
      category._id === initialCategory || category.slug === initialCategory,
  );
  const selectedCategoryId = targetCategorySlug
    ? routeCategory?._id || ""
    : queryCategory?._id || initialCategory;
  const categorySelections = useMemo(() => readCategorySelections(searchParams, categories, routeCategory), [searchParams, categories, routeCategory]);
  const routeBrand = brandSlug
    ? resolvedRouteBrand || (facets.brands || []).find(brand => cleanBrandSlug(brand.name) === cleanBrandSlug(brandSlug))?.name?.toUpperCase() || brandSlug.replace(/-/g, " ").toUpperCase()
    : "";
  const selectedBrands = useMemo(() => {
    const names = initialBrand
      ? initialBrand.split(",")
      : routeBrand
        ? [routeBrand]
        : [];
    return [
      ...new Set(
        names.map((name) => name.trim().toUpperCase()).filter(Boolean),
      ),
    ];
  }, [initialBrand, routeBrand]);
  const resolvedBrand = selectedBrands.length === 1 ? selectedBrands[0] : "";

  // 3. Fetch products from API
  const fetchProducts = useCallback(
    async (signal) => {
      if (
        !categoriesLoaded ||
        categoryError ||
        (targetCategorySlug && !routeCategory)
      )
        return;
      setIsLoading(true);
      setError(null);

      try {
        let sortBy = "createdAt";
        let sortOrder = "desc";

        if (sortOption === "price_asc") {
          sortBy = "standardPrice";
          sortOrder = "asc";
        } else if (sortOption === "price_desc") {
          sortBy = "standardPrice";
          sortOrder = "desc";
        } else if (sortOption === "stock_updated") {
          sortBy = "stockUpdatedAt";
          sortOrder = "desc";
        } else if (sortOption === "newest") {
          sortBy = "createdAt";
          sortOrder = "desc";
        } else {
          sortBy = "categoryPriority";
          sortOrder = "asc";
        }

        const query = {
          page: currentPage,
          limit: itemsPerPage,
          isActive: true,
          sortBy,
          sortOrder,
        };

        if (trendingOnly) query.isTrending = true;

        if (searchTerm.trim()) {
          query.search = searchTerm.trim();
        }

        for (const key of CATEGORY_FILTER_KEYS) if (categorySelections[key].length) query[key] = categorySelections[key].join(',');
        // Invalid legacy category links must remain empty instead of broadening to every product.
        if (initialCategory && !splitFilterValues(initialCategory).every(value => categories.some(category => String(category._id) === value || category.slug === value))) query.category = initialCategory;
        if (brandSlug && !initialBrand) query.brandSlug = brandSlug;
        else if (initialBrand) query.brand = initialBrand;
        if (selectedAvailability.length < DEFAULT_AVAILABILITY.length) query.availability = selectedAvailability.join(",") || "none";
        if (lowStockOnly) {
          query.lowStock = true;
          query.availability = "low-stock";
        }
        if (Object.values(selectedSpecs).some((values) => values.length))
          query.specs = JSON.stringify(selectedSpecs);
        // Facets depend on the filters, not the page. When only the page (or a
        // user-driven refetch) changes, reuse the facets already on screen.
        const { page: _page, sortBy: _sortBy, sortOrder: _sortOrder, ...facetQuery } = query;
        const facetKey = JSON.stringify({
          ...facetQuery,
          user: user?._id || user?.id || null,
          role: user?.role || null,
          kycStatus: user?.kycStatus || null,
          dealerStatus: user?.dealerStatus || null,
        });
        const reuseFacets = facetKeyRef.current === facetKey;
        if (reuseFacets) query.includeFacets = false;
        const response = await productService.getProducts(query, {
          signal,
          skipGlobalLoader: true,
        });
        if (signal?.aborted) return;
        if (!reuseFacets) {
          setFacets(
            response.data?.facets || {
              brands: [],
              availability: [],
              specs: [],
            },
          );
          facetKeyRef.current = facetKey;
          setFacetsLoaded(true);
        }
        const productList = response.data?.products || response.products || [];
        const pageInfo = response.data?.pagination ||
          response.pagination || {
            page: 1,
            totalPages: 1,
            total: productList.length,
          };

        setResolvedRouteBrand(response.data?.resolvedBrand || "");
        setProducts(productList);
        setPagination(pageInfo);
        setCorrectedSearch(
          response.data?.searchMode === "fuzzy"
            ? response.data?.correctedSearch || ""
            : "",
        );
      } catch (err) {
        if (signal?.aborted || err.code === "ERR_CANCELED") return;
        setProducts([]);
        console.error("Catalog products fetch error:", err);
        setError(
          "Unable to load catalog products. Please check your connection.",
        );
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [
      lowStockOnly,
      trendingOnly,
      currentPage,
      itemsPerPage,
      searchTerm,
      categorySelections,
      categories,
      targetCategorySlug,
      sortOption,
      initialCategory,
      initialBrand,
      brandSlug,
      selectedAvailability,
      selectedSpecs,
      categoriesLoaded,
      categoryError,
      routeCategory,
      user,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  const isAllProductsRoute = lowStockOnly || trendingOnly || location.pathname.startsWith("/products");

  const availableBrands = useMemo(() => {
    const result = [...(facets.brands || [])];
    for (const name of selectedBrands) if (!result.some(brand => brand.name.toUpperCase() === name)) result.push({ name, count: 0 });
    return result;
  }, [facets.brands, selectedBrands]);
  const specsToRender = useMemo(() => {
    const result = (facets.specs || []).map(spec => ({ ...spec, values: [...spec.values] }));
    for (const [key, values] of Object.entries(selectedSpecs)) {
      let spec = result.find(item => item.key.toLowerCase() === key.toLowerCase());
      if (!spec && values.length) { spec = { key, label: key, values: [] }; result.push(spec); }
      if (spec) for (const val of values) if (!spec.values.some(item => item.val === val)) spec.values.push({ val, count: 0 });
    }
    return result;
  }, [facets.specs, selectedSpecs]);
  const availabilityFacets = facets.availability || [];
  // Filtering and pagination are performed together by MongoDB.
  const displayedProducts = products;

  const writeFilters = (next, leaveCategoryRoute = false) => {
    next.delete("page");
    setCurrentPage(1);
    if (leaveCategoryRoute && targetCategorySlug) navigate(`/products${next.size ? `?${next}` : ""}`);
    else setSearchParams(next);
  };
  const handleToggleCategory = (category, key) => {
    const next = new URLSearchParams(searchParams);
    const selections = Object.fromEntries(CATEGORY_FILTER_KEYS.map(group => [group, [...categorySelections[group]]]));
    if (category) {
      const id = String(category._id);
      selections[key] = selections[key].includes(id) ? selections[key].filter(value => value !== id) : [...selections[key], id];
    } else for (const group of CATEGORY_FILTER_KEYS) selections[group] = [];
    next.delete("category"); next.delete("categoryId");
    for (const group of CATEGORY_FILTER_KEYS) {
      if (selections[group].length) next.set(group, selections[group].join(','));
      else next.delete(group);
    }
    writeFilters(next, true);
  };

  // Current Active Category Object
  const activeCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categories.find((c) => c._id === selectedCategoryId) || null;
  }, [selectedCategoryId, categories]);

  // Compute Breadcrumb Trail (Supports Brand view like "Home > Brands > ACER" & Category hierarchy like "Home > Laptop > Branded Laptop")
  const breadcrumbTrail = useMemo(() => {
    if (lowStockOnly) return [{ label: "Home", path: "/" }, { label: "Low Stock", path: null }];
    if (trendingOnly) return [{ label: "Home", path: "/" }, { label: "Trending", path: null }];
    const brandName =
      resolvedBrand ||
      (selectedBrands.length === 1 && !selectedCategoryId
        ? selectedBrands[0]
        : "");

    // Brand view: Home > Brands > ACER
    if (brandName && !selectedCategoryId) {
      return [
        { label: "Home", path: "/" },
        { label: "Brands", path: "/brands" },
        { label: brandName, path: null },
      ];
    }

    // Brand + Category: Home > Brands > ACER > Laptop
    if (brandName && selectedCategoryId && activeCategory) {
      return [
        { label: "Home", path: "/" },
        { label: "Brands", path: "/brands" },
        { label: brandName, path: buildBrandUrl(brandName) },
        { label: activeCategory.name, path: null },
      ];
    }

    // Category hierarchy view: Home > Laptop > Branded Laptop (matching Mega Jaipur screenshot)
    if (activeCategory) {
      return buildCategoryTrail(activeCategory, categories);
    }

    return [
      { label: "Home", path: "/" },
      { label: "All Products", path: null },
    ];
  }, [
    lowStockOnly,
    trendingOnly,
    resolvedBrand,
    selectedBrands,
    selectedCategoryId,
    activeCategory,
    categories,
  ]);

  // Keep search and category constraints when changing a brand.
  const handleToggleBrand = (brandName) => {
    const next = new URLSearchParams(searchParams);
    next.delete("page");
    const normalized = brandName.toUpperCase();
    const updated = selectedBrands.includes(normalized)
      ? selectedBrands.filter((name) => name !== normalized)
      : [...selectedBrands, normalized];
    if (updated.length) next.set("brand", updated.join(","));
    else next.delete("brand");
    setCurrentPage(1);
    if (brandSlug) navigate(`/search?${next}`);
    else setSearchParams(next);
  };

  const handleToggleSpec = (key, value) => {
    const next = new URLSearchParams(searchParams);
    const specs = { ...selectedSpecs };
    const current = specificationFilterValues(specs, key);
    for (const name of Object.keys(specs)) if (name.toLowerCase() === key.toLowerCase()) delete specs[name];
    const values = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
    if (values.length) specs[key] = values; else delete specs[key];
    if (Object.keys(specs).length) next.set('specs', JSON.stringify(specs)); else next.delete('specs');
    writeFilters(next);
  };
  const handleToggleAvailability = status => {
    const next = new URLSearchParams(searchParams);
    const values = selectedAvailability.includes(status) ? selectedAvailability.filter(item => item !== status) : [...selectedAvailability, status];
    if (values.length === DEFAULT_AVAILABILITY.length) next.delete('availability');
    else next.set('availability', values.join(',') || 'none');
    writeFilters(next);
  };
  const handleResetFilters = () => {
    setSortOption('default'); setCurrentPage(1);
    const next = new URLSearchParams();
    if (searchTerm.trim()) next.set('search', searchTerm.trim());
    const destination = lowStockOnly ? '/low-stock' : trendingOnly ? '/trending' : brandSlug ? `/brands/${brandSlug}` : targetCategorySlug ? buildCategoryPath(routeCategory, categories) : location.pathname.startsWith('/products') ? '/products' : '/search';
    navigate(`${destination}${next.size ? `?${next}` : ''}`);
  };
  // Search/navigation/back-forward changes start a fresh first page.
  const filterLocation = searchParams.toString();
  useEffect(() => { setCurrentPage(1); }, [location.pathname, filterLocation]);

  // Compute Page Header Title (Matching Mega Jaipur: "Branded Laptop", "Laptop Hinges", "ACER")
  const pageTitle = useMemo(() => {
    if (lowStockOnly) return "Low Stock Products";
    if (trendingOnly) return "Trending Products";
    if (isAllProductsRoute) {
      if (searchTerm) return `Search: "${searchTerm}"`;
      return "All Products";
    }
    if (activeCategory?.name) {
      return activeCategory.name;
    }
    if (brandSlug) {
      return routeBrand || brandSlug.replace(/-/g, " ").toUpperCase();
    }
    if (searchTerm) {
      return `Search: "${searchTerm}"`;
    }
    return "All Products";
  }, [lowStockOnly, trendingOnly, isAllProductsRoute, activeCategory, brandSlug, routeBrand, searchTerm]);

  // Dynamic SEO metadata targeting Networking & IT Search Ranking
  const seoTitle = useMemo(() => {
    if (lowStockOnly) return "Low Stock Products | Vinexus";
    if (trendingOnly) return "Trending Products | Vinexus";
    if (headerSlug === "networking" || activeCategory?.slug === "networking") {
      return "Networking Products, Enterprise PoE Switches, Routers & Racks | Vinexus";
    }
    if (headerSlug === "security" || activeCategory?.slug === "security") {
      return "CCTV Cameras, DVRs, NVRs & Security Systems | Vinexus";
    }
    if (brandSlug) {
      const bName = routeBrand || brandSlug.replace(/-/g, " ").toUpperCase();
      return `${bName} Networking & IT Products | Buy at Best Price - Vinexus`;
    }
    if (activeCategory?.name) {
      return `${activeCategory.name} — Buy Online at Best Price | Vinexus`;
    }
    if (searchTerm) {
      return `Search: "${searchTerm}" — Products | Vinexus`;
    }
    return "All Products — Enterprise Networking, CCTV & IT Hardware | Vinexus";
  }, [lowStockOnly, trendingOnly, headerSlug, activeCategory, brandSlug, routeBrand, searchTerm]);

  const seoDescription = useMemo(() => {
    if (headerSlug === "networking" || activeCategory?.slug === "networking") {
      return "Explore high-performance enterprise networking products, managed PoE switches, routers, optical transceivers, and patch panels at wholesale dealer prices in India on Vinexus.";
    }
    if (headerSlug === "security" || activeCategory?.slug === "security") {
      return "Buy high-definition CCTV cameras, NVRs, DVRs, surveillance systems, and security equipment at wholesale dealer rates on Vinexus. Official warranty & GST invoices.";
    }
    if (brandSlug) {
      const bName = routeBrand || brandSlug.replace(/-/g, " ").toUpperCase();
      return `Shop authentic ${bName} networking, surveillance, and computing products on Vinexus. Bulk dealer discounts, GST billing, and express shipping across India.`;
    }
    return "Browse India's top B2B catalog of enterprise networking products, CCTV cameras, servers, laptops, and IT hardware on Vinexus.";
  }, [headerSlug, activeCategory, brandSlug, routeBrand]);

  usePageSeo({
    title: seoTitle,
    description: seoDescription,
    keywords:
      "networking products, enterprise switches, managed PoE switch, WiFi 6 router, Cat6 cable, CCTV cameras India, Vinexus Kota",
  });


  // Sidebar Filter Content (used in both desktop sidebar & mobile drawer)
  const renderSidebarFilters = () => (
    <div className="space-y-4">
      {/* 1. Header with Filters title & Reset All */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--store-border)]">
        <div className="flex items-center gap-2 font-bold text-[var(--store-text)] text-sm">
          <Filter className="w-4 h-4 text-primary" />
          <span>Filters</span>
        </div>
        <button
          type="button"
          onClick={handleResetFilters}
          className="text-xs font-bold text-primary hover:underline transition-colors cursor-pointer">
          Reset
        </button>
      </div>
      <p className="text-xs text-[var(--store-muted)]">Choose multiple options in a group to include any of them. Combine groups to narrow your search.</p>

      {/* 2. Categories Accordion (matching Availability checkbox pattern) */}
      <div className="border-b border-[var(--store-border)] pb-3">
        <button
          type="button"
          onClick={() =>
            setOpenSections((prev) => ({
              ...prev,
              categories: !prev.categories,
            }))
          }
          className="w-full flex items-center justify-between font-bold text-xs uppercase tracking-wider text-[var(--store-text)] py-1.5 hover:text-primary transition-colors select-none">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" />
            <span>Categories</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[var(--store-muted)] transition-transform duration-200 ${
              openSections.categories ? "rotate-180" : ""
            }`}
          />
        </button>

        {openSections.categories && (
          <div className="mt-2.5 space-y-1.5">
            <CategoryFilters categories={categories} facets={facets.categories} selections={categorySelections} onToggle={handleToggleCategory} onClear={() => handleToggleCategory(null)} />
          </div>
        )}
      </div>

      {/* Brand options remain available as other groups narrow the results. */}
      {availableBrands.length > 0 && (
          <div className="border-b border-[var(--store-border)] pb-3">
            <button
              type="button"
              onClick={() =>
                setOpenSections((prev) => ({ ...prev, brands: !prev.brands }))
              }
              className="w-full flex items-center justify-between font-bold text-xs uppercase tracking-wider text-[var(--store-text)] py-1.5 hover:text-primary transition-colors select-none">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Brands</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[var(--store-muted)] transition-transform duration-200 ${
                  openSections.brands ? "rotate-180" : ""
                }`}
              />
            </button>

            {openSections.brands && (
              <div className="mt-2.5 space-y-1.5">
                {availableBrands.map((brand) => {
                  const isChecked = selectedBrands.includes(
                    brand.name.toUpperCase(),
                  );
                  return (
                    <label
                      key={brand.name}
                      className="flex items-center justify-between text-xs text-[var(--store-muted)] hover:text-[var(--store-text)] cursor-pointer select-none py-0.5 group">
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          aria-label={`Brand: ${brand.name}`}
                          checked={isChecked}
                          onChange={() => handleToggleBrand(brand.name)}
                          className="w-4 h-4 rounded border-[var(--store-border)] text-primary focus:ring-primary accent-[var(--store-primary)] cursor-pointer"
                        />
                        <span
                          className={`truncate ${
                            isChecked
                              ? "font-bold text-[var(--store-text)]"
                              : "group-hover:text-primary"
                          }`}>
                          {brand.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--store-muted)] font-medium ml-2 shrink-0">
                        {brand.count}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

      {/* Specification options remain available for small and empty result sets. */}
      {specsToRender.length > 0 &&
        specsToRender.map((spec) => (
          <div key={spec.key} className="border-b border-[var(--store-border)] pb-3">
            <button
              type="button"
              onClick={() =>
                setOpenSections((prev) => ({
                  ...prev,
                  [`spec_${spec.key}`]:
                    prev[`spec_${spec.key}`] === false ? true : false,
                }))
              }
              className="w-full flex items-center justify-between font-bold text-xs uppercase tracking-wider text-[var(--store-text)] py-1.5 hover:text-primary transition-colors select-none">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                <span className="truncate">
                  {spec.label || spec.key}
                  {spec.unit ? ` (${spec.unit})` : ""}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[var(--store-muted)] transition-transform duration-200 ${
                  openSections[`spec_${spec.key}`] !== false ? "rotate-180" : ""
                }`}
              />
            </button>

            {openSections[`spec_${spec.key}`] !== false && (
              <div className="mt-2.5 space-y-1.5">
                {spec.values.map(({ val, count }) => {
                  const isChecked = specificationFilterValues(selectedSpecs, spec.key).includes(
                    val,
                  );
                  return (
                    <label
                      key={val}
                      className="flex items-center justify-between text-xs text-[var(--store-muted)] hover:text-[var(--store-text)] cursor-pointer select-none py-0.5 group">
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          aria-label={`${spec.label || spec.key}: ${val}`}
                          checked={isChecked}
                          onChange={() => handleToggleSpec(spec.key, val)}
                          className="w-4 h-4 rounded border-[var(--store-border)] text-primary focus:ring-primary accent-[var(--store-primary)] cursor-pointer"
                        />
                        <span
                          className={`truncate ${
                            isChecked
                              ? "font-bold text-[var(--store-text)]"
                              : "group-hover:text-primary"
                          }`}>
                          {val}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--store-muted)] font-medium ml-2 shrink-0">
                        {count}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}

      {/* 4. Availability (last filter: as is) */}
      {!lowStockOnly && <div className="border-b border-[var(--store-border)] pb-3">
        <button
          type="button"
          onClick={() =>
            setOpenSections((prev) => ({
              ...prev,
              availability: !prev.availability,
            }))
          }
          className="w-full flex items-center justify-between font-bold text-xs uppercase tracking-wider text-[var(--store-text)] py-1.5 hover:text-primary transition-colors select-none">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-primary" />
            <span>Availability</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[var(--store-muted)] transition-transform duration-200 ${openSections.availability ? "rotate-180" : ""}`}
          />
        </button>

        {openSections.availability && (
          <div className="mt-2.5 space-y-1.5">
            {[
              ["in-stock", "In Stock"],
              ["low-stock", "Low Stock"],
              ["on-order", "On Order"],
              ["out-of-stock", "Out of Stock"],
            ].map(([status, label]) => {
              const checked = selectedAvailability.includes(status);
              const count = availabilityFacets
                .filter((item) => item.status === status)
                .reduce((total, item) => total + (item.count || 0), 0);
              return (
                <label
                  key={status}
                  className="flex items-center justify-between text-xs text-[var(--store-muted)] hover:text-[var(--store-text)] cursor-pointer select-none py-0.5 group">
                  <span className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      aria-label={`Availability: ${label}`}
                      checked={checked}
                      onChange={() => handleToggleAvailability(status)}
                      className="w-4 h-4 rounded border-[var(--store-border)] text-primary focus:ring-primary accent-[var(--store-primary)] cursor-pointer"
                    />
                    <span
                      className={`truncate ${checked ? "font-bold text-[var(--store-text)]" : "group-hover:text-primary"}`}>
                      {label}
                    </span>
                  </span>
                  <span className="text-[11px] text-[var(--store-muted)] font-medium ml-2 shrink-0">
                    {count}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>}
    </div>
  );

  if (categoryError)
    return (
      <ErrorState
        title="Categories unavailable"
        description={categoryError}
        onRetry={() => window.location.reload()}
      />
    );

  // If a category was requested in the URL path but does not exist
  if (targetCategorySlug && categoriesLoaded && !routeCategory) {
    return <NotFoundPage />;
  }

  // If a brand was requested in /brands/:brandSlug but does not exist
  if (brandSlug && !resolvedBrand) {
    return <NotFoundPage />;
  }

  // Wait for category resolution before rendering the heading and breadcrumb.
  // Otherwise a category route briefly renders the generic catalog heading.
  if (!categoriesLoaded && (targetCategorySlug || initialCategory)) {
    return (
      <div className="w-full bg-[#f8f9fa]">
        <div className="storefront-container px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-0 space-y-2">
          <div className="min-h-12 flex items-center justify-center">
            <div
              className="h-8 w-48 rounded bg-gray-200 animate-pulse"
              aria-label="Loading category"
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <aside className="hidden lg:block lg:col-span-3 xl:col-span-3 2xl:col-span-2 bg-[var(--store-surface)] rounded-lg border border-[var(--store-border)] p-4">
              <FilterSidebarSkeleton />
            </aside>
            <div className="lg:col-span-9 xl:col-span-9 2xl:col-span-10 storefront-product-grid gap-3 sm:gap-3.5">
              {[...Array(12)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#f8f9fa]">
      <div className="storefront-container px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-0 space-y-2">
        {lowStockOnly && (
          <section className="relative overflow-hidden rounded-2xl border border-[var(--store-border)] bg-[var(--store-surface)] p-5 sm:p-7 my-3">
            <div className="absolute inset-y-0 right-0 w-1/3 pointer-events-none" style={{ background: 'linear-gradient(110deg, transparent, color-mix(in srgb, var(--store-primary) 8%, transparent))' }} />
            <div className="relative max-w-2xl space-y-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Limited availability</span>
              <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-[var(--store-text)]">Good finds. Limited availability.</h2>
              <p className="text-sm leading-relaxed text-[var(--store-muted)]">Explore low-stock products from trusted brands. Filter by category, brand or specification to find what you need.</p>
              <p className="text-xs font-semibold text-[var(--store-primary)]">{isLoading ? 'Updating selection…' : `${pagination.total || products.length} products in this selection`}</p>
            </div>
          </section>
        )}
        {/* 1. BREADCRUMBS & CENTERED BRAND/CATEGORY TITLE (matching Screenshot) */}
        <div className="relative flex min-h-12 items-center justify-between gap-2 lg:justify-center">
          {/* Breadcrumb row */}
          <nav
            aria-label="Breadcrumb"
            className="hidden md:flex w-full min-w-0 max-w-full items-center flex-nowrap gap-2 overflow-x-auto whitespace-nowrap text-sm sm:text-base text-[var(--store-primary)] font-medium lg:absolute lg:left-0 lg:w-auto lg:max-w-[35%]">
            {breadcrumbTrail.map((crumb, idx) => (
              <React.Fragment key={crumb.label + idx}>
                {idx > 0 && (
                  <ChevronRight className="w-4 h-4 text-[var(--store-primary)] shrink-0" />
                )}
                {crumb.path ? (
                  <Link
                    to={crumb.path}
                    className="shrink-0 hover:text-[#650019] transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="shrink-0 text-[var(--store-primary)] font-semibold">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Centered Large Title (matching Screenshot: e.g. "ACER") */}
          <h1 className="min-w-0 flex-1 truncate text-lg sm:text-2xl lg:flex-none lg:text-3xl font-black text-[var(--store-primary)] tracking-tight text-left lg:text-center">
            {pageTitle}
          </h1>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:absolute lg:right-0">
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="order-2 lg:hidden flex items-center gap-1.5 px-2.5 sm:px-3 py-2.5 rounded-full sm:rounded-lg border border-[var(--store-border)] bg-[var(--store-surface)] text-xs font-bold text-[var(--store-muted)] hover:border-[var(--store-primary)] transition-colors cursor-pointer">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              <span>Filters</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Sort products"
                  className="order-1 flex w-auto sm:w-48 items-center justify-between gap-1.5 sm:gap-3 text-xs sm:text-sm font-semibold text-[var(--store-text)] bg-[var(--store-surface)] border border-[var(--store-primary)] rounded-full sm:rounded-lg px-2.5 sm:px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--store-primary)]/20 cursor-pointer shadow-2xs">
                  <ArrowUpDown className="h-3.5 w-3.5 text-[var(--store-primary)] sm:hidden" />
                  <span className="sm:hidden">Sort</span>
                  <span className="hidden sm:inline">
                    {SORT_OPTIONS.find((option) => option.value === sortOption)
                      ?.label || "Default"}
                  </span>
                  <ChevronDown className="hidden sm:block w-4 h-4 text-[var(--store-primary)]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border-[var(--store-primary)]/25">
                {SORT_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => {
                      setSortOption(option.value);
                      setCurrentPage(1);
                    }}
                    className={
                      sortOption === option.value
                        ? "bg-[var(--store-primary)] text-white focus:bg-[var(--store-primary)] focus:text-white"
                        : "text-[var(--store-text)] focus:bg-[var(--store-primary)]/10 focus:text-[var(--store-primary)]"
                    }>
                    <span className="flex-1">{option.label}</span>
                    {sortOption === option.value && (
                      <Check className="w-4 h-4" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 2. TWO-COLUMN LAYOUT: SIDEBAR (lg:col-span-3) + PRODUCT GRID (lg:col-span-9) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start relative">
          {/* DESKTOP SIDEBAR FILTERS (Sticky & Independently Scrollable) */}
          <aside className="hidden lg:block lg:col-span-3 xl:col-span-3 2xl:col-span-2 sticky top-[148px] self-start select-none">
            <div
              className="bg-[var(--store-surface)] rounded-lg border border-[var(--store-border)] p-4 shadow-2xs max-h-[calc(100vh-165px)] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 transparent',
              }}
            >
              {isLoading && !facetsLoaded ? (
                <FilterSidebarSkeleton />
              ) : (
                renderSidebarFilters()
              )}
            </div>
          </aside>

          {/* MAIN PRODUCT CATALOG CONTENT */}
          <main className="relative lg:col-span-9 xl:col-span-9 2xl:col-span-10 space-y-4 min-h-80">
            {/* PRODUCT CARDS HIGH-DENSITY GRID (matching Screenshot: 4-5 cards per row on large displays) */}
            {isLoading && displayedProducts.length === 0 ? (
              <div className="storefront-product-grid gap-3 sm:gap-3.5">
                {[...Array(12)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <ErrorState
                title="Catalog Error"
                description={error}
                onRetry={() => fetchProducts()}
              />
            ) : displayedProducts.length > 0 ? (
              <>
                {correctedSearch && searchTerm.trim() && (
                  <p
                    role="status"
                    className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
                    No exact matches for &ldquo;{searchTerm.trim()}&rdquo;.
                    Showing results for{" "}
                    <span className="font-semibold">
                      &ldquo;{correctedSearch}&rdquo;
                    </span>
                    .
                  </p>
                )}
                <div className="storefront-product-grid gap-3 sm:gap-3.5">
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
                      window.scrollTo({ top: 120, behavior: "smooth" });
                    }}
                  />
                </div>
              </>
            ) : (
              <EmptyState
                title="No Products Found"
                description={
                  selectedBrands.length > 0
                    ? `No products found under ${selectedBrands.join(", ")}.`
                    : activeCategory
                      ? `No products found under "${activeCategory.name}".`
                      : "No products match your current search or category filter criteria."
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
        className="!max-w-[min(90vw,380px)]"
        contentClassName="!p-3">
        <div>{renderSidebarFilters()}</div>
      </Drawer>
    </div>
  );
};

// Keep controls open while refining URL filters; reset UI only when changing catalog routes.
const CatalogRoutePage = ({ lowStockOnly = false, trendingOnly = false }) => {
  const location = useLocation();
  return <ProductsPage key={location.pathname} lowStockOnly={lowStockOnly} trendingOnly={trendingOnly} />;
};
export default CatalogRoutePage;
