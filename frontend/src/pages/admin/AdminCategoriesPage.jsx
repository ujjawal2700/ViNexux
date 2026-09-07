import React, { useState, useEffect } from 'react';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import FilterBar from '../../components/admin/FilterBar';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import FormField from '../../components/ui/FormField';
import FormError from '../../components/ui/FormError';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import { Plus, Edit2, Trash2, FolderTree, RefreshCw } from 'lucide-react';

const AdminCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [parentCategoriesList, setParentCategoriesList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Sorting
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [parentIdFilter, setParentIdFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('sortOrder');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parentId: '',
    image: '',
    description: '',
    isActive: true,
    sortOrder: 0,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete/Deactivate Confirmation State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 20,
        sortBy,
        sortOrder,
      };
      if (isActiveFilter !== '') params.isActive = isActiveFilter;
      if (parentIdFilter !== '') params.parentId = parentIdFilter;

      const res = await adminService.getCategories(params);
      const categoryData = res.data?.categories || [];
      setCategories(categoryData);
      setPagination(res.data?.pagination || { page: 1, limit: 20, totalPages: 1, total: 0 });

      // Also fetch all categories for parentId dropdown selection
      if (parentCategoriesList.length === 0) {
        const allRes = await adminService.getCategories({ limit: 100 });
        setParentCategoriesList(allRes.data?.categories || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [page, isActiveFilter, parentIdFilter, sortBy, sortOrder]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      parentId: '',
      image: '',
      description: '',
      isActive: true,
      sortOrder: 0,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      slug: category.slug || '',
      parentId: category.parentId?._id || category.parentId || '',
      image: category.image || '',
      description: category.description || '',
      isActive: category.isActive !== undefined ? category.isActive : true,
      sortOrder: category.sortOrder || 0,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Category name is required');
      return;
    }

    setFormSubmitting(true);
    setFormError('');
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        parentId: formData.parentId || null,
        image: formData.image.trim() || undefined,
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
        sortOrder: Number(formData.sortOrder) || 0,
      };

      if (editingCategory) {
        await adminService.updateCategory(editingCategory._id, payload);
        setToast({ message: 'Category updated successfully!', type: 'success' });
      } else {
        await adminService.createCategory(payload);
        setToast({ message: 'Category created successfully!', type: 'success' });
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error('Category save error:', err);
      setFormError(err.response?.data?.message || 'Failed to save category');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await adminService.deleteCategory(deleteTarget._id);
      setToast({
        message: res.message || 'Category deactivated successfully',
        type: 'success',
      });
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      console.error('Category delete error:', err);
      setToast({
        message: err.response?.data?.message || 'Failed to deactivate category',
        type: 'error',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <AdminPageHeader
        title="Category Management"
        subtitle="Manage product categories, subcategories, sort order & hierarchy"
        badge={`${pagination.total} Categories`}
        action={
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Category
          </Button>
        }
      />

      {/* Filter Bar */}
      <FilterBar
        filters={[
          {
            value: isActiveFilter,
            onChange: (val) => {
              setIsActiveFilter(val);
              setPage(1);
            },
            options: [
              { value: '', label: 'All Statuses' },
              { value: 'true', label: 'Active Categories Only' },
              { value: 'false', label: 'Inactive Categories Only' },
            ],
          },
          {
            value: parentIdFilter,
            onChange: (val) => {
              setParentIdFilter(val);
              setPage(1);
            },
            options: [
              { value: '', label: 'All Hierarchy Levels' },
              { value: 'null', label: 'Root Categories Only' },
              ...parentCategoriesList.map((cat) => ({
                value: cat._id,
                label: `Subcategory of ${cat.name}`,
              })),
            ],
          },
        ]}
        sortOptions={[
          { value: 'sortOrder', label: 'Sort by Position Order' },
          { value: 'name', label: 'Sort by Name' },
          { value: 'createdAt', label: 'Sort by Created Date' },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        onReset={() => {
          setIsActiveFilter('');
          setParentIdFilter('');
          setPage(1);
          setSortBy('sortOrder');
          setSortOrder('asc');
        }}
      />

      {/* Content Section */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-14 rounded-lg bg-[#f4e7ea]" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Failed to load categories" message={error} onRetry={fetchCategories} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories found"
          description="Get started by creating your first product category hierarchy."
          action={
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-1.5" /> Create Category
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Order</Table.Head>
                <Table.Head>Category Name</Table.Head>
                <Table.Head>Slug</Table.Head>
                <Table.Head>Parent Category</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head className="text-right">Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {categories.map((cat) => {
                const parentName =
                  cat.parentId?.name ||
                  parentCategoriesList.find((p) => p._id === cat.parentId)?.name ||
                  'Root Category';

                return (
                  <Table.Row key={cat._id}>
                    <Table.Cell className="font-mono text-xs text-[#7c5c5f] font-bold">
                      #{cat.sortOrder || 0}
                    </Table.Cell>
                    <Table.Cell className="font-bold text-[#3d0a0d] text-xs">
                      {cat.name}
                      {cat.description && (
                        <div className="text-[10px] text-[#7c5c5f] font-normal truncate max-w-xs">
                          {cat.description}
                        </div>
                      )}
                    </Table.Cell>
                    <Table.Cell className="font-mono text-[11px] text-[#7c5c5f]">
                      {cat.slug}
                    </Table.Cell>
                    <Table.Cell className="text-xs text-[#7c5c5f]">
                      {parentName}
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={cat.isActive ? 'active' : 'inactive'} />
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(cat)}
                          className="h-8 w-8 p-0 text-[#7c5c5f] hover:text-[#800020]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(cat)}
                          className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>

          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={(newPage) => setPage(newPage)}
            />
          )}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <FormError message={formError} />

          <FormField label="Category Name" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. CCTV Cameras"
              required
            />
          </FormField>

          <FormField label="URL Slug (Optional)" hint="Leave blank to auto-generate from name">
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="e.g. cctv-cameras"
            />
          </FormField>

          <FormField label="Parent Category">
            <Select
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              options={[
                { value: '', label: 'None (Root Category)' },
                ...parentCategoriesList
                  .filter((p) => !editingCategory || p._id !== editingCategory._id)
                  .map((p) => ({ value: p._id, label: p.name })),
              ]}
            />
          </FormField>

          <FormField label="Category Image URL (Optional)">
            <Input
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://..."
            />
          </FormField>

          <FormField label="Description (Optional)">
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief overview of this product category..."
              rows={3}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Sort Order Position">
              <Input
                type="number"
                min="0"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
              />
            </FormField>

            <FormField label="Active Status">
              <Select
                value={formData.isActive ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                options={[
                  { value: 'true', label: 'Active' },
                  { value: 'false', label: 'Inactive' },
                ]}
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#e5d1d4]">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={formSubmitting}>
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete / Deactivate Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Deactivate Category"
        message={`Are you sure you want to deactivate category "${deleteTarget?.name}"? If products or child categories depend on it, backend will safely preserve relational integrity while setting status to inactive.`}
        confirmText="Deactivate"
        isLoading={deleteLoading}
        variant="danger"
      />
    </div>
  );
};

export default AdminCategoriesPage;
