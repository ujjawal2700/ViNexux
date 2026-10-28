import useAuth from '../../hooks/useAuth';
import { canAdmin } from '../../../../shared/adminAccess.js';
import { getAdminAccessState } from '../../utils/adminAccessState';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import adminService from '../../services/adminService';
import useToast from '../../hooks/useToast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import CategoryMultiSelect from '../../components/admin/CategoryMultiSelect';
import FilterBar from '../../components/admin/FilterBar';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StockUpdateDialog from '../../components/admin/StockUpdateDialog';
import ProductPriceDialog from '../../components/admin/ProductPriceDialog';
import Button from '../../components/ui/Button';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Image from '../../components/ui/Image';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  Image as ImageIcon,
  FileSpreadsheet,
  PackagePlus,
  Power,
} from 'lucide-react';

const AdminProductsPage = () => {
  const navigate = useNavigate();
  const { adminUser, user } = useAuth();
  const [canReadCategories, setCanReadCategories] = useState(() => canAdmin(adminUser || user, 'categories', 'read'));
  const categoriesLoaded = useRef(false);
  const toastApi = useToast();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Single source of truth for page from URL
  const urlPage = parseInt(searchParams.get('page'), 10);
  const page = urlPage > 0 ? urlPage : 1;

  const handlePageChange = useCallback((newPage) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPage <= 1) {
        next.delete('page');
      } else {
        next.set('page', String(newPage));
      }
      return next;
    });
    if (newPage > 1) {
      sessionStorage.setItem('admin_products_page', String(newPage));
    } else {
      sessionStorage.removeItem('admin_products_page');
    }
  }, [setSearchParams]);

  // If no page param exists in URL, check if location.state or sessionStorage has a returnPage
  useEffect(() => {
    if (!searchParams.has('page')) {
      const fallback = Number(location.state?.returnPage) || Number(sessionStorage.getItem('admin_products_page'));
      if (fallback > 1) {
        handlePageChange(fallback);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filters & Search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const prevSearchRef = useRef(search);

  // Only reset page to 1 when user actually types a new search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      if (prevSearchRef.current !== search) {
        prevSearchRef.current = search;
        handlePageChange(1);
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [search, handlePageChange]);

  const [categoryFilters, setCategoryFilters] = useState({ headerCategoryIds: [], mainCategoryIds: [], subCategoryIds: [] });
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [trendingBusy, setTrendingBusy] = useState({});
  const [lowStockBusy, setLowStockBusy] = useState({});
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Delete/Deactivate Confirmation State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [stockTarget, setStockTarget] = useState(null);
  const [priceTarget, setPriceTarget] = useState(null);
  const [categoryBusy, setCategoryBusy] = useState({});
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState(null);
  const [permanentDeleteLoading, setPermanentDeleteLoading] = useState(false);

  // Toast Notifications
  const [toast, setToast] = useState(null);

  const categoryById = useMemo(() => new Map(categoriesList.map((category) => [String(category._id), category])), [categoriesList]);
  const headerCategories = categoriesList.filter((category) => !category.parentId);
  const getHeaderCategoryId = (product) => {
    const ids = [product.categoryId, ...(product.categoryIds || [])];
    for (const id of ids) {
      let category = categoryById.get(String(id?._id || id || ''));
      const visited = new Set();
      while (category && !visited.has(String(category._id))) {
        visited.add(String(category._id));
        if (!category.parentId) return String(category._id);
        category = categoryById.get(String(category.parentId?._id || category.parentId));
      }
    }
    return '';
  };

  const updateHeaderCategory = async (product, headerId) => {
    if (!headerId || headerId === getHeaderCategoryId(product) || categoryBusy[product._id]) return;
    const header = categoryById.get(headerId);
    if (!header || header.parentId || header.isActive === false) return;
    setCategoryBusy((current) => ({ ...current, [product._id]: true }));
    try {
      // Moving headers clears branches from the old header's category tree.
      await adminService.updateProduct(product._id, { categoryId: headerId, categoryIds: [headerId] });
      setProducts((items) => items.map((item) => item._id === product._id ? { ...item, categoryId: header, categoryIds: [headerId] } : item));
      toastApi.success(`Header category updated to ${header.name}. Main and sub-category assignments cleared.`);
      if (Object.values(categoryFilters).some(ids => ids.length)) {
        if (products.length === 1 && page > 1) handlePageChange(page - 1);
        else fetchProducts();
      }
    } catch (err) {
      toastApi.error(err.response?.data?.message || 'Unable to update the header category.');
    } finally {
      setCategoryBusy((current) => ({ ...current, [product._id]: false }));
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 20, sortBy, sortOrder };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      for (const [key, ids] of Object.entries(categoryFilters)) if (ids.length) params[key] = ids.join(',');
      if (isActiveFilter !== '') params.isActive = isActiveFilter;

      const res = await adminService.getProducts(params);
      setProducts(res.data?.products || []);
      const p = res.data?.pagination || {};
      const total = p.total ?? p.totalItems ?? p.totalCount ?? 0;
      setPagination({
        page: p.currentPage || p.page || page,
        limit: p.limit || 20,
        totalPages: p.totalPages || Math.ceil(total / (p.limit || 20)) || 1,
        total,
        totalItems: total,
      });

      // Category management is a separate permission. Its optional lookup must
      // never turn a successful product request into a failed catalog screen.
      const categoryAccess = canAdmin(getAdminAccessState() || adminUser || user, 'categories', 'read');
      setCanReadCategories(categoryAccess);
      if (!categoryAccess) {
        setCategoriesList([]);
        categoriesLoaded.current = false;
      } else if (!categoriesLoaded.current) {
        try {
          const catRes = await adminService.getCategories({ limit: 500, sortBy: 'sortOrder', sortOrder: 'asc' });
          setCategoriesList(catRes.data?.categories || []);
          categoriesLoaded.current = true;
        } catch {
          setCategoriesList([]);
        }
      }
    } catch (err) {
      console.error('Error fetching admin products:', err);
      setError(err.response?.data?.message || 'Failed to load product catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, categoryFilters, isActiveFilter, sortBy, sortOrder, debouncedSearch]);

  const toggleTrending = async (product, isTrending) => {
    setTrendingBusy(current => ({ ...current, [product._id]: true }));
    setProducts(current => current.map(item => item._id === product._id ? { ...item, isTrending } : item));
    try {
      await adminService.updateProduct(product._id, { isTrending });
      toastApi.success(isTrending ? 'Product marked as trending.' : 'Product removed from trending.');
    } catch (err) {
      setProducts(current => current.map(item => item._id === product._id ? { ...item, isTrending: Boolean(product.isTrending) } : item));
      toastApi.error(err.response?.data?.message || 'Unable to update trending status.');
    } finally {
      setTrendingBusy(current => ({ ...current, [product._id]: false }));
    }
  };

  const toggleLowStock = async (product, isLowStock) => {
    setLowStockBusy(current => ({ ...current, [product._id]: true }));
    setProducts(current => current.map(item => item._id === product._id ? { ...item, isLowStock } : item));
    try {
      await adminService.updateProduct(product._id, { isLowStock });
      toastApi.success(isLowStock ? 'Product marked as low stock.' : 'Product removed from low stock.');
    } catch (err) {
      setProducts(current => current.map(item => item._id === product._id ? { ...item, isLowStock: Boolean(product.isLowStock) } : item));
      toastApi.error(err.response?.data?.message || 'Unable to update low stock status.');
    } finally {
      setLowStockBusy(current => ({ ...current, [product._id]: false }));
    }
  };

  const handleSearchSubmit = () => {
    handlePageChange(1);
    fetchProducts();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await adminService.deleteProduct(deleteTarget._id);
      setToast({ message: res.message || 'Product deactivated successfully', type: 'success' });
      setDeleteTarget(null);
      fetchProducts();
    } catch (err) {
      console.error('Product delete error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to deactivate product', type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePermanentDeleteConfirm = async () => {
    if (!permanentDeleteTarget || permanentDeleteLoading) return;
    setPermanentDeleteLoading(true);
    try {
      const res = await adminService.permanentlyDeleteProduct(permanentDeleteTarget._id);
      setToast({ message: res.message, type: 'success' });
      setPermanentDeleteTarget(null);
      if (products.length === 1 && page > 1) handlePageChange(page - 1);
      else fetchProducts();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to delete product.', type: 'error' });
      fetchProducts();
    } finally {
      setPermanentDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <AdminPageHeader
        title="Product Catalog Management"
        subtitle="Manage hardware models, laptops, desktops, cameras, networking, SKUs, wholesale dealer pricing & specs"
        badge={`${pagination.total} Total Products`}
        action={<div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/products/positioning')}>Product Positioning</Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/products/import')}>
            <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Bulk Import
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate(`/admin/products/new?returnPage=${page}`, { state: { returnPage: page } })}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Product
          </Button>
        </div>}
      />

      {/* Filter & Search Bar */}
      <FilterBar
        search={search}
        onSearchChange={(e) => setSearch(e.target.value)}
        onSearchSubmit={() => {
          setDebouncedSearch(search);
          prevSearchRef.current = search;
          handlePageChange(1);
        }}
        searchPlaceholder="Search by SKU or Product Name..."
        filters={[
          {
            value: isActiveFilter,
            onChange: (val) => {
              setIsActiveFilter(val);
              handlePageChange(1);
            },
            options: [
              { value: '', label: 'All Statuses' },
              { value: 'true', label: 'Active Products Only' },
              { value: 'false', label: 'Inactive Products Only' },
            ],
          },
        ]}
        sortOptions={[
          { value: 'createdAt', label: 'Sort by Creation Date' },
          { value: 'name', label: 'Sort by Name' },
          { value: 'sku', label: 'Sort by SKU' },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        onReset={() => {
          setSearch('');
          setDebouncedSearch('');
          prevSearchRef.current = '';
          setCategoryFilters({ headerCategoryIds: [], mainCategoryIds: [], subCategoryIds: [] });
          setIsActiveFilter('');
          handlePageChange(1);
          setSortBy('createdAt');
          setSortOrder('desc');
        }}
      />

      {canReadCategories && categoriesList.length > 0 && <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['headerCategoryIds', 'Header categories', category => !category.parentId],
          ['mainCategoryIds', 'Main categories', category => { const parent = categoryById.get(String(category.parentId?._id || category.parentId)); return parent && !parent.parentId; }],
          ['subCategoryIds', 'Subcategories', category => { const parent = categoryById.get(String(category.parentId?._id || category.parentId)); return Boolean(parent?.parentId); }],
        ].map(([key, label, matches]) => <CategoryMultiSelect key={key} label={label} options={categoriesList.filter(matches)} value={categoryFilters[key]} onChange={ids => { setCategoryFilters(current => ({ ...current, [key]: ids })); handlePageChange(1); }} />)}
        <p className="text-xs text-muted-foreground sm:col-span-3">Select multiple categories at each level. Filters across levels are combined.</p>
      </div>}

      {/* Table & Catalog Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Failed to load product catalog" message={error} onRetry={fetchProducts} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description="There are no product entries matching your current search or filter rules."
          action={
            <Button variant="primary" size="sm" onClick={() => navigate(`/admin/products/new?returnPage=${page}`, { state: { returnPage: page } })}>
              <Plus className="w-4 h-4 mr-1.5" /> Add First Product
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <Table className="[&_th]:px-3 [&_th]:py-2.5 [&_td]:px-3 [&_td]:py-2">
            <Table.Header>
              <Table.Row>
                <Table.Head>Image</Table.Head>
                <Table.Head>SKU / Model Number / Name</Table.Head>
                <Table.Head>Header Category</Table.Head>
                <Table.Head>Standard Price</Table.Head>
                <Table.Head>Dealer Price</Table.Head>
                <Table.Head>Trending</Table.Head>
                <Table.Head>Low Stock</Table.Head>
                <Table.Head>Stock</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head className="text-right">Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {products.map((prod) => {
                const primaryImage = prod.images && prod.images.length > 0 ? prod.images[0].url : null;
                const categoryName = prod.categoryId?.name || 'Uncategorized';
                const headerId = getHeaderCategoryId(prod);

                return (
                  <Table.Row
                    key={prod._id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/products/${prod._id}?returnPage=${page}`, { state: { returnPage: page } })}
                  >
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      <div className="w-9 h-9 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center">
                        {primaryImage ? (
                          <Image src={primaryImage} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="font-mono text-[11px] text-primary font-bold">{prod.sku}</div>
                      <div className="text-[10px] font-semibold text-muted-foreground">Model Number: {prod.modelNumber || 'Not set'}</div>
                      <div className="text-[10px] text-muted-foreground">Model Name: {prod.model || 'Not set'}</div>
                      <div className="text-xs font-bold text-foreground max-w-xs truncate">{prod.name}</div>
                    </Table.Cell>
                    <Table.Cell className="text-xs text-muted-foreground" onClick={(event) => event.stopPropagation()}>
                      {canReadCategories && headerCategories.length > 0 ? <select value={headerId} disabled={Boolean(categoryBusy[prod._id]) || headerCategories.length === 0}
                        aria-label={`Header category for ${prod.name}`}
                        title="Change header category. Main and sub-category assignments are cleared when changing headers."
                        onChange={(event) => updateHeaderCategory(prod, event.target.value)}
                        className="w-36 max-w-full rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground disabled:opacity-50 cursor-pointer">
                        <option value="" disabled>Select header</option>
                        {headerCategories.map((header) => <option key={header._id} value={header._id} disabled={header.isActive === false}>{header.name}{header.isActive === false ? ' (inactive)' : ''}</option>)}
                      </select> : <span>{prod.categoryId?.name || 'Unassigned'}</span>}
                      {canReadCategories && headerCategories.length > 0 && categoryName !== categoryById.get(headerId)?.name && <p className="mt-0.5 text-[10px]">{categoryName}</p>}
                    </Table.Cell>
                    <Table.Cell className="text-xs font-semibold text-foreground" onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span>₹{Number(prod.standardPrice || 0).toLocaleString('en-IN')}</span>
                        <button type="button" title="Update Standard Price" aria-label={`Update standard price for ${prod.name}`}
                          onClick={() => setPriceTarget({ product: prod, field: 'standardPrice' })}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border hover:border-primary hover:text-primary"><Edit2 className="h-3 w-3" /></button>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400" onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span>₹{Number(prod.dealerPrice || 0).toLocaleString('en-IN')}</span>
                        <button type="button" title="Update Dealer Price" aria-label={`Update dealer price for ${prod.name}`}
                          onClick={() => setPriceTarget({ product: prod, field: 'dealerPrice' })}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border hover:border-primary hover:text-primary"><Edit2 className="h-3 w-3" /></button>
                      </div>
                    </Table.Cell>
                    <Table.Cell onClick={e => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Trending: ${prod.name}`} checked={Boolean(prod.isTrending)} disabled={Boolean(trendingBusy[prod._id])} onChange={e => toggleTrending(prod, e.target.checked)} className="h-4 w-4 cursor-pointer accent-primary disabled:opacity-50" />
                    </Table.Cell>
                    <Table.Cell onClick={event => event.stopPropagation()}>
                      <input type="checkbox" aria-label={`Low stock: ${prod.name}`} checked={Boolean(prod.isLowStock)} disabled={Boolean(lowStockBusy[prod._id])} onChange={event => toggleLowStock(prod, event.target.checked)} className="h-4 w-4 cursor-pointer accent-primary disabled:opacity-50" />
                    </Table.Cell>
                    <Table.Cell className="font-semibold">{prod.stockQuantity || 0}</Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={prod.isActive ? 'active' : 'inactive'} />
                    </Table.Cell>
                    <Table.Cell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          onClick={() => navigate(`/admin/products/${prod._id}?returnPage=${page}`, { state: { returnPage: page } })}
                          title="Edit Product"
                          className="bg-muted/80 hover:bg-primary/20 text-foreground hover:text-primary border border-border hover:border-primary/40 transition-all shadow-xs"
                        >
                          <Edit2 className="w-4 h-4 shrink-0" />
                        </Button>
                        <Button variant="outline" size="sm" iconOnly className="h-7 w-7" onClick={() => setStockTarget(prod)} title="Update Stock" aria-label={`Update stock for ${prod.name}`}>
                          <PackagePlus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          onClick={() => setDeleteTarget(prod)}
                          title="Deactivate Product"
                          aria-label={`Deactivate ${prod.name}`}
                          disabled={!prod.isActive}
                          className="bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 dark:hover:bg-rose-600 text-rose-700 dark:text-rose-300 hover:text-white dark:hover:text-white border border-rose-200 dark:border-rose-800/60 transition-all shadow-xs"
                        >
                          <Power className="w-4 h-4 shrink-0" />
                        </Button>
                        <Button variant="ghost" size="sm" iconOnly onClick={() => setPermanentDeleteTarget(prod)}
                          title="Delete Product Permanently" aria-label={`Permanently delete ${prod.name}`}
                          className="border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>

          {pagination.total > 0 && (
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={pagination.limit || 20}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}

      {/* Delete / Deactivate Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Deactivate Product"
        message={`Are you sure you want to deactivate product SKU "${deleteTarget?.sku}" (${deleteTarget?.name})? The product will be hidden from the public catalog while preserving historical enquiry records.`}
        confirmText="Deactivate"
        isLoading={deleteLoading}
        variant="danger"
      />
      {stockTarget && <StockUpdateDialog product={stockTarget} onClose={() => setStockTarget(null)}
        onUpdated={(updated) => setProducts((items) => items.map((item) => item._id === updated._id ? { ...item, stockQuantity: updated.stockQuantity } : item))} />}
      {priceTarget && <ProductPriceDialog product={priceTarget.product} field={priceTarget.field} onClose={() => setPriceTarget(null)}
        onUpdated={(updated, field) => setProducts((items) => items.map((item) => item._id === updated._id ? { ...item, [field]: updated[field] } : item))} />}
      <ConfirmDialog isOpen={!!permanentDeleteTarget}
        onClose={() => { if (!permanentDeleteLoading) setPermanentDeleteTarget(null); }}
        onConfirm={handlePermanentDeleteConfirm} title="Delete Product Permanently"
        message={`Delete "${permanentDeleteTarget?.name}" (${permanentDeleteTarget?.sku})? Its catalog entry, images, cart items and dealer pricing will be removed. Historical enquiries will be preserved. This cannot be undone.`}
        confirmText="Delete Product" isLoading={permanentDeleteLoading} variant="danger" />
    </div>
  );
};

export default AdminProductsPage;
