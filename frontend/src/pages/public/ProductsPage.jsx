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
import {
  buildCategoryPath,
  buildCategoryTrail,
  buildBrandUrl,
} from "../../utils/categoryUrls";
import {
  Filter,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  CheckSquare,
  SlidersHorizontal,
  PackageCheck,
  Layers,
  Cpu,
  Check,
  ArrowUpDown,
} from "lucide-react";

const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "name_asc", label: "Name (A - Z)" },
  { value: "name_desc", label: "Name (Z - A)" },
  { value: "price_asc", label: "Price (Low > High)" },
  { value: "price_desc", label: "Price (High > Low)" },
];

const DEFAULT_AVAILABILITY = [
  "in-stock",
  "low-stock",
  "on-order",
  "out-of-stock",
];

export const ProductsPage = () => {
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

  const [selectedSpecs, setSelectedSpecs] = useState({}); // { "Wattage": ["65w"], ... }
  const [selectedAvailability, setSelectedAvailability] = useState(() => [
    ...DEFAULT_AVAILABILITY,
  ]);
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
  // Set when the server found no exact matches and searched corrected words.
  const [correctedSearch, setCorrectedSearch] = useState("");
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
  const routeBrand = brandSlug
    ? brandSlug.replace(/-/g, " ").toUpperCase()
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
        } else if (sortOption === "name_asc") {
          sortBy = "name";
          sortOrder = "asc";
        } else if (sortOption === "name_desc") {
          sortBy = "name";
          sortOrder = "desc";
        } else if (sortOption === "newest") {
          sortBy = "createdAt";
          sortOrder = "desc";
        } else {
          sortBy = "createdAt";
          sortOrder = "desc";
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

        if (
          selectedCategoryId &&
          /^[0-9a-fA-F]{24}$/.test(selectedCategoryId)
        ) {
          query.categoryId = selectedCategoryId;
        } else if (initialCategory) {
          query.category = initialCategory;
        }

        if (brandSlug && !initialBrand) query.brandSlug = brandSlug;
        else if (initialBrand) query.brand = initialBrand;
        if (selectedAvailability.length && selectedAvailability.length < 4) {
          query.availability = selectedAvailability.join(",");
        }
        if (Object.values(selectedSpecs).some((values) => values.length))
          query.specs = JSON.stringify(selectedSpecs);
        // Facets depend on the filters, not the page. When only the page (or a
        // user-driven refetch) changes, reuse the facets already on screen.
        const { page: _page, ...facetQuery } = query;
        const facetKey = JSON.stringify({
          ...facetQuery,
          user: user?.id || null,
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
        }
        const productList = response.data?.products || response.products || [];
        const pageInfo = response.data?.pagination ||
          response.pagination || {
            page: 1,
            totalPages: 1,
            total: productList.length,
          };

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
      currentPage,
      itemsPerPage,
      searchTerm,
      selectedCategoryId,
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
      user?.id,
      user?.dealerStatus,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  const isAllProductsRoute = location.pathname.startsWith("/products");

  const availableCategories = facets.categories || [];
  const displayCategories = useMemo(() => {
    if (availableCategories.length > 0) return availableCategories;
    return categories
      .filter((c) => !c.parentId)
      .map((c) => ({
        _id: c._id,
        name: c.name,
        slug: c.slug,
        count: c.productCount || 0,
      }));
  }, [availableCategories, categories]);

  // When on /products, show only header categories with rolled-up product counts
  const headerCategoriesList = useMemo(() => {
    if (!isAllProductsRoute) return null;
    const roots = categories.filter((c) => !c.parentId);
    const parentMap = new Map(
      categories.map((c) => [
        String(c._id),
        c.parentId?._id
          ? String(c.parentId._id)
          : c.parentId
            ? String(c.parentId)
            : null,
      ]),
    );
    const getRootId = (catId) => {
      let curr = String(catId);
      let p = parentMap.get(curr);
      while (p) {
        curr = p;
        p = parentMap.get(curr);
      }
      return curr;
    };
    const counts = new Map();
    for (const item of facets.categories || []) {
      const rootId = getRootId(item._id);
      counts.set(rootId, (counts.get(rootId) || 0) + (item.count || 0));
    }
    return roots.map((root) => ({
      _id: root._id,
      name: root.name,
      slug: root.slug,
      count: counts.get(String(root._id)) || 0,
    }));
  }, [isAllProductsRoute, categories, facets.categories]);

  const categoriesToRender = isAllProductsRoute
    ? headerCategoriesList || []
    : displayCategories;
  const availableBrands = facets.brands;
  const dynamicSpecs = facets.specs;
  const availabilityFacets = facets.availability || [];
  // Filtering and pagination are performed together by MongoDB.
  const displayedProducts = products;

  // Current category (resolved from hierarchical route or query category)
  const currentCategory = useMemo(() => {
    if (routeCategory) return routeCategory;
    if (initialCategory && !initialCategory.includes(",")) {
      return (
        categories.find(
          (c) => c._id === initialCategory || c.slug === initialCategory,
        ) || null
      );
    }
    return null;
  }, [routeCategory, initialCategory, categories]);

  // If products are few (<= 12 products, 1-2 rows): only Categories, Brands, Availability.
  // If products are multiple rows (> 12 products): show specs according to products!
  const totalProductCount = pagination.total || products.length;
  const hasMultipleRows = totalProductCount > 12;
  const specsToRender =
    hasMultipleRows && dynamicSpecs && dynamicSpecs.length > 0
      ? dynamicSpecs.slice(0, 6)
      : [];

  // Selected category slugs / IDs
  const selectedCategorySlugs = useMemo(() => {
    if (targetCategorySlug) return [targetCategorySlug.toLowerCase()];
    if (!initialCategory) return [];
    return initialCategory
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }, [targetCategorySlug, initialCategory]);

  const isAllCategoriesChecked = selectedCategorySlugs.length === 0;

  const isCategoryChecked = useCallback(
    (cat) => {
      if (!cat) return isAllCategoriesChecked;
      const catSlug = (cat.slug || "").toLowerCase();
      const catId = String(cat._id || "").toLowerCase();
      return (
        (Boolean(catSlug) && selectedCategorySlugs.includes(catSlug)) ||
        (Boolean(catId) && selectedCategorySlugs.includes(catId))
      );
    },
    [isAllCategoriesChecked, selectedCategorySlugs],
  );

  // Handle category selection in filter sidebar using checkboxes
  const handleToggleCategory = (cat) => {
    setCurrentPage(1);
    setSelectedSpecs({});
    const next = new URLSearchParams(searchParams);

    if (!cat) {
      // Clicked "All Categories": clear specific category filters
      next.delete("category");
      next.delete("categoryId");
      if (targetCategorySlug) {
        navigate("/products");
      } else {
        setSearchParams(next);
      }
      return;
    }

    const catSlug = (cat.slug || cat._id).toLowerCase();
    const checked = isCategoryChecked(cat);

    let updatedSlugs;
    if (checked) {
      updatedSlugs = selectedCategorySlugs.filter(
        (s) => s !== catSlug && s !== String(cat._id || "").toLowerCase(),
      );
    } else {
      updatedSlugs = [...selectedCategorySlugs, cat.slug || cat._id];
    }

    if (updatedSlugs.length === 0) {
      next.delete("category");
      next.delete("categoryId");
    } else {
      next.set("category", updatedSlugs.join(","));
      next.delete("categoryId");
    }

    if (targetCategorySlug) {
      navigate(`/products${next.toString() ? `?${next.toString()}` : ""}`);
    } else {
      setSearchParams(next);
    }
  };

  // Current Active Category Object
  const activeCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categories.find((c) => c._id === selectedCategoryId) || null;
  }, [selectedCategoryId, categories]);

  // Compute Breadcrumb Trail (Supports Brand view like "Home > Brands > ACER" & Category hierarchy like "Home > Laptop > Branded Laptop")
  const breadcrumbTrail = useMemo(() => {
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
    resolvedBrand,
    selectedBrands,
    selectedCategoryId,
    activeCategory,
    categories,
  ]);

  // Keep search and category constraints when changing a brand.
  const handleToggleBrand = (brandName) => {
    const next = new URLSearchParams(searchParams);
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

  const handleToggleAvailability = (status) => {
    setCurrentPage(1);
    setSelectedAvailability((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    );
  };

  const handleResetFilters = () => {
    setSelectedSpecs({});
    setSelectedAvailability([...DEFAULT_AVAILABILITY]);
    setSortOption("default");
    setCurrentPage(1);
    setIsMobileFilterOpen(false);
    if (brandSlug) {
      navigate(`/brands/${brandSlug}`);
      return;
    }
    const destination = location.pathname.startsWith("/products")
      ? "/products"
      : activeCategory
        ? buildCategoryPath(activeCategory, categories)
        : "/search";
    const preserved = new URLSearchParams();
    if (searchTerm.trim()) preserved.set("search", searchTerm.trim());
    navigate(`${destination}${preserved.size ? `?${preserved}` : ""}`);
  };

  // Compute Page Header Title (Matching Mega Jaipur: "Branded Laptop", "Laptop Hinges", "ACER")
  const pageTitle = useMemo(() => {
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
  }, [isAllProductsRoute, activeCategory, brandSlug, routeBrand, searchTerm]);


  // Sidebar Filter Content (used in both desktop sidebar & mobile drawer)
  const renderSidebarFilters = () => (
    <div className="space-y-4">
      {/* 1. Header with Filters title & Reset All */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
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

      {/* 2. Categories Accordion (matching Availability checkbox pattern) */}
      <div className="border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() =>
            setOpenSections((prev) => ({
              ...prev,
              categories: !prev.categories,
            }))
          }
          className="w-full flex items-center justify-between font-bold text-xs uppercase tracking-wider text-gray-800 py-1.5 hover:text-primary transition-colors select-none">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" />
            <span>Categories</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
              openSections.categories ? "rotate-180" : ""
            }`}
          />
        </button>

        {openSections.categories && (
          <div className="mt-2.5 space-y-1.5">
            {currentCategory ? (
              /* When inside a specific category page: show ONLY the current category, already ticked */
              <label className="flex items-center justify-between text-xs text-gray-700 hover:text-gray-900 cursor-pointer select-none py-0.5 group">
                <span className="flex items-center gap-2 truncate">
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => navigate("/products")}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-[#800020] cursor-pointer"
                  />
                  <span className="truncate font-bold text-gray-900">
                    {currentCategory.name}
                  </span>
                </span>
                {pagination.total > 0 && (
                  <span className="text-[11px] text-gray-400 font-medium ml-2 shrink-0">
                    {pagination.total}
                  </span>
                )}
              </label>
            ) : categoriesToRender.length > 0 ? (
              /* On general /products page: show All Categories + Header categories */
              <>
                <label className="flex items-center justify-between text-xs text-gray-700 hover:text-gray-900 cursor-pointer select-none py-0.5 group">
                  <span className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={isAllCategoriesChecked}
                      onChange={() => handleToggleCategory(null)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-[#800020] cursor-pointer"
                    />
                    <span
                      className={`truncate ${
                        isAllCategoriesChecked
                          ? "font-bold text-gray-900"
                          : "group-hover:text-primary"
                      }`}>
                      All Categories
                    </span>
                  </span>
                </label>
                {categoriesToRender.map((cat) => {
                  const isChecked = isCategoryChecked(cat);
                  return (
                    <label
                      key={cat._id}
                      className="flex items-center justify-between text-xs text-gray-700 hover:text-gray-900 cursor-pointer select-none py-0.5 group">
                      <span className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCategory(cat)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-[#800020] cursor-pointer"
                        />
                        <span
                          className={`truncate ${
                            isChecked
                              ? "font-bold text-gray-900"
                              : "group-hover:text-primary"
                          }`}>
                          {cat.name}
                        </span>
                      </span>
                      {cat.count !== undefined && cat.count > 0 && (
                        <span className="text-[11px] text-gray-400 font-medium ml-2 shrink-0">
                          {cat.count}
                        </span>
                      )}
                    </label>
                  );
                })}
              </>
            ) : (
              <div className="flex items-center gap-2 rounded bg-primary/5 border border-primary/20 p-2 text-xs font-bold text-primary select-none">
                <CheckSquare className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {activeCategory?.name || "All Products"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Brands Accordion (below Categories: shows only brands that have products available in this category) */}
      {(Boolean(currentCategory) || (!isAllProductsRoute && !brandSlug)) &&
        availableBrands.length > 0 && (
          <div className="border-b border-gray-200 pb-3">
            <button
              type="button"
              onClick={() =>
                setOpenSections((prev) => ({ ...prev, brands: !prev.brands }))
              }
              className="w-full flex items-center justify-between font-bold text-xs uppercase tracking-wider text-gray-800 py-1.5 hover:text-primary transition-colors select-none">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Brands</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
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
                      className="flex items-center justify-between text-xs text-gray-700 hover:text-gray-900 cursor-pointer select-none py-0.5 group">
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleBrand(brand.name)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-[#800020] cursor-pointer"
                        />
                        <span
                          className={`truncate ${
                            isChecked
                              ? "font-bold text-gray-900"
                              : "group-hover:text-primary"
                          }`}>
                          {brand.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 font-medium ml-2 shrink-0">
                        {brand.count}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

      {/* 3. Category-specific specification filters (Shown when multiple rows of products exist: > 12 products) */}
      {(Boolean(currentCategory) || !isAllProductsRoute) &&
        specsToRender.length > 0 &&
        specsToRender.map((spec) => (
          <div key={spec.key} className="border-b border-gray-200 pb-3">
            <button
              type="button"
              onClick={() =>
                setOpenSections((prev) => ({
                  ...prev,
                  [`spec_${spec.key}`]:
                    prev[`spec_${spec.key}`] === false ? true : false,
                }))
              }
              className="w-full flex items-center justify-between font-bold text-xs uppercase tracking-wider text-gray-800 py-1.5 hover:text-primary transition-colors select-none">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                <span className="truncate">
                  {spec.label || spec.key}
                  {spec.unit ? ` (${spec.unit})` : ""}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                  openSections[`spec_${spec.key}`] !== false ? "rotate-180" : ""
                }`}
              />
            </button>

            {openSections[`spec_${spec.key}`] !== false && (
              <div className="mt-2.5 space-y-1.5">
                {spec.values.map(({ val, count }) => {
                  const isChecked = (selectedSpecs[spec.key] || []).includes(
                    val,
                  );
                  return (
                    <label
                      key={val}
                      className="flex items-center justify-between text-xs text-gray-700 hover:text-gray-900 cursor-pointer select-none py-0.5 group">
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSpec(spec.key, val)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-[#800020] cursor-pointer"
                        />
                        <span
                          className={`truncate ${
                            isChecked
                              ? "font-bold text-gray-900"
                              : "group-hover:text-primary"
                          }`}>
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

      {/* 4. Availability (last filter: as is) */}
      <div className="border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() =>
            setOpenSections((prev) => ({
              ...prev,
              availability: !prev.availability,
            }))
          }
          className="w-full flex items-center justify-between font-bold text-xs uppercase tracking-wider text-gray-800 py-1.5 hover:text-primary transition-colors select-none">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-primary" />
            <span>Availability</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${openSections.availability ? "rotate-180" : ""}`}
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
              const count =
                availabilityFacets.find((item) => item.status === status)
                  ?.count || 0;
              return (
                <label
                  key={status}
                  className="flex items-center justify-between text-xs text-gray-700 hover:text-gray-900 cursor-pointer select-none py-0.5 group">
                  <span className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleAvailability(status)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-[#800020] cursor-pointer"
                    />
                    <span
                      className={`truncate ${checked ? "font-bold text-gray-900" : "group-hover:text-primary"}`}>
                      {label}
                    </span>
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium ml-2 shrink-0">
                    {count}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
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
            <aside className="hidden lg:block lg:col-span-3 xl:col-span-3 2xl:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
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
        {/* 1. BREADCRUMBS & CENTERED BRAND/CATEGORY TITLE (matching Screenshot) */}
        <div className="relative flex min-h-12 items-center justify-between gap-2 lg:justify-center">
          {/* Breadcrumb row */}
          <nav
            aria-label="Breadcrumb"
            className="hidden md:flex w-full min-w-0 max-w-full items-center flex-nowrap gap-2 overflow-x-auto whitespace-nowrap text-sm sm:text-base text-[#800020] font-medium lg:absolute lg:left-0 lg:w-auto lg:max-w-[35%]">
            {breadcrumbTrail.map((crumb, idx) => (
              <React.Fragment key={crumb.label + idx}>
                {idx > 0 && (
                  <ChevronRight className="w-4 h-4 text-[#800020] shrink-0" />
                )}
                {crumb.path ? (
                  <Link
                    to={crumb.path}
                    className="shrink-0 hover:text-[#650019] transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="shrink-0 text-[#800020] font-semibold">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Centered Large Title (matching Screenshot: e.g. "ACER") */}
          <h1 className="min-w-0 flex-1 truncate text-lg sm:text-2xl lg:flex-none lg:text-3xl font-black text-[#800020] tracking-tight text-left lg:text-center">
            {pageTitle}
          </h1>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:absolute lg:right-0">
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="order-2 lg:hidden flex items-center gap-1.5 px-2.5 sm:px-3 py-2.5 rounded-full sm:rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:border-[#800020] transition-colors cursor-pointer">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              <span>Filters</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Sort products"
                  className="order-1 flex w-auto sm:w-48 items-center justify-between gap-1.5 sm:gap-3 text-xs sm:text-sm font-semibold text-gray-800 bg-white border border-[#800020] rounded-full sm:rounded-lg px-2.5 sm:px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#800020]/20 cursor-pointer shadow-2xs">
                  <ArrowUpDown className="h-3.5 w-3.5 text-[#800020] sm:hidden" />
                  <span className="sm:hidden">Sort</span>
                  <span className="hidden sm:inline">
                    {SORT_OPTIONS.find((option) => option.value === sortOption)
                      ?.label || "Default"}
                  </span>
                  <ChevronDown className="hidden sm:block w-4 h-4 text-[#800020]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border-[#800020]/25">
                {SORT_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => {
                      setSortOption(option.value);
                      setCurrentPage(1);
                    }}
                    className={
                      sortOption === option.value
                        ? "bg-[#800020] text-white focus:bg-[#800020] focus:text-white"
                        : "text-gray-800 focus:bg-[#800020]/10 focus:text-[#800020]"
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
              className="bg-white rounded-lg border border-gray-200 p-4 shadow-2xs max-h-[calc(100vh-165px)] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 transparent',
              }}
            >
              {isLoading && displayedProducts.length === 0 ? (
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

// URL changes start a fresh query and reset pagination/spec filters.
const CatalogRoutePage = () => {
  const location = useLocation();
  return <ProductsPage key={location.pathname + location.search} />;
};
export default CatalogRoutePage;
