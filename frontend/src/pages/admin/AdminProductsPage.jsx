import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
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
  Star,
  Image as ImageIcon,
} from 'lucide-react';

const AdminProductsPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoryIdFilter, setCategoryIdFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [isFeaturedFilter, setIsFeaturedFilter] = useState('');
  const [page, setPage] = useState(1);
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
      if (search.trim()) params.search = search.trim();
      if (categoryIdFilter) params.categoryId = categoryIdFilter;
      if (isActiveFilter !== '') params.isActive = isActiveFilter;
      if (isFeaturedFilter !== '') params.isFeatured = isFeaturedFilter;

      const res = await adminService.getProducts(params);
      setProducts(res.data?.products || []);
      setPagination(res.data?.pagination || { page: 1, limit: 20, totalPages: 1, total: 0 });

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
  }, [page, categoryIdFilter, isActiveFilter, isFeaturedFilter, sortBy, sortOrder]);

  const handleSearchSubmit = () => {
    setPage(1);
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
        action={
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/products/new')}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Product
          </Button>
        }
      />

      {/* Filter & Search Bar */}
      <FilterBar
        search={search}
        onSearchChange={(e) => setSearch(e.target.value)}
        searchPlaceholder="Search by SKU or Product Name..."
        filters={[
          {
            value: categoryIdFilter,
            onChange: (val) => {
              setCategoryIdFilter(val);
              setPage(1);
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
              setPage(1);
            },
            options: [
              { value: '', label: 'All Statuses' },
              { value: 'true', label: 'Active Products Only' },
              { value: 'false', label: 'Inactive Products Only' },
            ],
          },
          {
            value: isFeaturedFilter,
            onChange: (val) => {
              setIsFeaturedFilter(val);
              setPage(1);
            },
            options: [
              { value: '', label: 'All Products' },
              { value: 'true', label: 'Featured Products Only' },
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
          setCategoryIdFilter('');
          setIsActiveFilter('');
          setIsFeaturedFilter('');
          setPage(1);
          setSortBy('createdAt');
          setSortOrder('desc');
        }}
      >
        <Button variant="outline" size="sm" onClick={handleSearchSubmit} className="text-xs shrink-0">
          Apply Search
        </Button>
      </FilterBar>

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
            <Button variant="primary" size="sm" onClick={() => navigate('/admin/products/new')}>
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
                <Table.Head>SKU / Name</Table.Head>
                <Table.Head>Category</Table.Head>
                <Table.Head>Standard Price</Table.Head>
                <Table.Head>Dealer Price</Table.Head>
                <Table.Head>Featured</Table.Head>
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
                    onClick={() => navigate(`/admin/products/${prod._id}`)}
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
                    <Table.Cell>
                      {prod.isFeatured ? (
                        <Badge variant="warning" className="gap-1">
                          <Star className="w-3 h-3 fill-current" /> Featured
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Standard</span>
                      )}
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
                          onClick={() => navigate(`/admin/products/${prod._id}`)}
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
              onPageChange={(newPage) => setPage(newPage)}
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
