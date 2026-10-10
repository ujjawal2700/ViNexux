import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import adminService from '../../services/adminService';
import useToast from '../../hooks/useToast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import FilterBar from '../../components/admin/FilterBar';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
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
} from 'lucide-react';

const AdminProductsPage = () => {
  const navigate = useNavigate();
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

  const [categoryIdFilter, setCategoryIdFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [trendingBusy, setTrendingBusy] = useState({});
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Delete/Deactivate Confirmation State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast Notifications
  const [toast, setToast] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 20, sortBy, sortOrder };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (categoryIdFilter) params.categoryId = categoryIdFilter;
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

      if (categoriesList.length === 0) {
        const catRes = await adminService.getCategories({ limit: 500, sortBy: 'sortOrder', sortOrder: 'asc' });
        setCategoriesList(catRes.data?.categories || []);
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
  }, [page, categoryIdFilter, isActiveFilter, sortBy, sortOrder, debouncedSearch]);

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

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <AdminPageHeader
        title="Product Catalog Management"
        subtitle="Manage hardware models, laptops, desktops, cameras, networking, SKUs, wholesale dealer pricing & specs"
        badge={`${pagination.total} Total Products`}
        action={<div className="flex flex-wrap items-center gap-2">
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
            value: categoryIdFilter,
            onChange: (val) => {
              setCategoryIdFilter(val);
              handlePageChange(1);
            },
            options: [
              { value: '', label: 'All Categories' },
              ...categoriesList.map((cat) => {
                const pId = cat.parentId?._id || cat.parentId;
                const parent = pId ? categoriesList.find((p) => p._id === pId) : null;
                const grandParentId = parent?.parentId?._id || parent?.parentId;
                const isSub = Boolean(grandParentId);
                const isMain = Boolean(pId && !grandParentId);

                let label = cat.name;
                if (isSub) {
                  label = `↳ [Sub] ${cat.name}`;
                } else if (isMain) {
                  label = `— [Main] ${cat.name}`;
                } else {
                  label = `[Header] ${cat.name}`;
                }
                return { value: cat._id, label };
              }),
            ],
          },
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
          setCategoryIdFilter('');
          setIsActiveFilter('');
          handlePageChange(1);
          setSortBy('createdAt');
          setSortOrder('desc');
        }}
      />

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
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Image</Table.Head>
                <Table.Head>SKU / Model / Name</Table.Head>
                <Table.Head>Category</Table.Head>
                <Table.Head>Standard Price</Table.Head>
                <Table.Head>Dealer Price</Table.Head>
                <Table.Head>Trending</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head className="text-right">Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {products.map((prod) => {
                const primaryImage = prod.images && prod.images.length > 0 ? prod.images[0].url : null;
                const categoryName = prod.categoryId?.name || 'Uncategorized';

                return (
                  <Table.Row
                    key={prod._id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/products/${prod._id}?returnPage=${page}`, { state: { returnPage: page } })}
                  >
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      <div className="w-11 h-11 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center">
                        {primaryImage ? (
                          <Image src={primaryImage} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="font-mono text-[11px] text-primary font-bold">{prod.sku}</div>
                      <div className="text-[10px] font-semibold text-muted-foreground">Model No: {prod.modelNumber || 'Not set'}</div>
                      <div className="text-[10px] text-muted-foreground">Model: {prod.model || 'Not set'}</div>
                      <div className="text-xs font-bold text-foreground max-w-xs truncate">{prod.name}</div>
                    </Table.Cell>
                    <Table.Cell className="text-xs text-muted-foreground">
                      {categoryName}
                    </Table.Cell>
                    <Table.Cell className="text-xs font-semibold text-foreground">
                      ₹{Number(prod.standardPrice || 0).toLocaleString('en-IN')}
                    </Table.Cell>
                    <Table.Cell className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{Number(prod.dealerPrice || 0).toLocaleString('en-IN')}
                    </Table.Cell>
                    <Table.Cell onClick={e => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Trending: ${prod.name}`} checked={Boolean(prod.isTrending)} disabled={Boolean(trendingBusy[prod._id])} onChange={e => toggleTrending(prod, e.target.checked)} className="h-4 w-4 cursor-pointer accent-primary disabled:opacity-50" />
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={prod.isActive ? 'active' : 'inactive'} />
                    </Table.Cell>
                    <Table.Cell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          onClick={() => setDeleteTarget(prod)}
                          title="Deactivate Product"
                          className="bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 dark:hover:bg-rose-600 text-rose-700 dark:text-rose-300 hover:text-white dark:hover:text-white border border-rose-200 dark:border-rose-800/60 transition-all shadow-xs"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
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
    </div>
  );
};

export default AdminProductsPage;
