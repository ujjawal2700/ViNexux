import React, { useState, useEffect, useMemo } from 'react';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import FormField from '../../components/ui/FormField';
import FormError from '../../components/ui/FormError';
import { StatusBadge } from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import Pagination from '../../components/ui/Pagination';
import { Plus, Edit2, Trash2, Layers, Search, ArrowUpDown } from 'lucide-react';
import CategoryIcon from '../../components/ui/CategoryIcon';

/**
 * Dedicated Header Category Management Page (Tier 1 Root Categories)
 */
const AdminHeaderCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    image: '',
    description: '',
    isActive: true,
    sortOrder: 0,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getCategories({
        limit: 500,
        sortBy: 'sortOrder',
        sortOrder: 'asc',
      });
      const list = res.data?.categories || [];
      setAllCategories(list);
      setCategories(list.filter((c) => !c.parentId));
    } catch (err) {
      console.error('Failed to load header categories:', err);
      setError(err.response?.data?.message || 'Failed to load header categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Compute count of main categories under each header category
  const mainCountsMap = useMemo(() => {
    const map = new Map();
    for (const cat of allCategories) {
      const pId = cat.parentId?._id || cat.parentId;
      if (pId) {
        const key = String(pId);
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
    return map;
  }, [allCategories]);

  // Filtered List
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        !searchTerm.trim() ||
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.slug.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === '' ||
        (statusFilter === 'true' ? cat.isActive : !cat.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [categories, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredCategories.length / pageSize) || 1;

  const paginatedCategories = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, page, pageSize]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      image: '',
      description: '',
      isActive: true,
      sortOrder: (categories.length || 0) + 1,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      slug: category.slug || '',
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
        parentId: null, // Always root / Header Category
        image: formData.image.trim() || undefined,
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
        sortOrder: Number(formData.sortOrder) || 0,
      };

      if (editingCategory) {
        await adminService.updateCategory(editingCategory._id, payload);
        setToast({ message: `Header category "${formData.name}" updated successfully!`, type: 'success' });
      } else {
        await adminService.createCategory(payload);
        setToast({ message: `Header category "${formData.name}" created successfully!`, type: 'success' });
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error('Header category save error:', err);
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
        message: res.message || 'Header category deleted successfully',
        type: 'success',
      });
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      console.error('Delete error:', err);
      setToast({
        message: err.response?.data?.message || 'Failed to delete header category',
        type: 'error',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <AdminPageHeader
        title="Header Categories"
        subtitle="Manage all top-level root categories (Tier 1)"
        badge={`${categories.length} Categories`}
        action={
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Header Category
          </Button>
        }
      />

      {/* Search & Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search header categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'true', label: 'Active Only' },
              { value: 'false', label: 'Inactive Only' },
            ]}
            className="w-full sm:w-40 text-xs"
          />
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg bg-card border border-border" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Failed to load header categories" message={error} onRetry={fetchCategories} />
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Header Categories found"
          description="Create your first top-level header category."
          action={
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Header Category
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>Order</Table.Head>
              <Table.Head>Header Category Name</Table.Head>
              <Table.Head>Slug</Table.Head>
              <Table.Head>Main Categories</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head className="text-right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {paginatedCategories.map((cat) => {
              const mainCount = mainCountsMap.get(String(cat._id)) || 0;

              return (
                <Table.Row key={cat._id}>
                  <Table.Cell className="font-mono text-xs text-muted-foreground font-bold">
                    #{cat.sortOrder || 0}
                  </Table.Cell>
                  <Table.Cell className="font-bold text-foreground text-xs">
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon name={cat.name} containerClassName="w-8 h-8 rounded-lg" className="w-4 h-4" />
                      <div>
                        <div className="font-bold text-foreground text-xs">{cat.name}</div>
                        {cat.description && (
                          <div className="text-[10px] text-muted-foreground font-normal truncate max-w-xs">
                            {cat.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="font-mono text-[11px] text-muted-foreground">
                    {cat.slug}
                  </Table.Cell>
                  <Table.Cell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-[#800020] border border-rose-200">
                      {mainCount} Main {mainCount === 1 ? 'Category' : 'Categories'}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge status={cat.isActive ? 'active' : 'inactive'} />
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onClick={() => handleOpenEdit(cat)}
                        title="Edit Header Category"
                        className="bg-muted/80 hover:bg-primary/20 text-foreground hover:text-primary border border-border"
                      >
                        <Edit2 className="w-4 h-4 shrink-0" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onClick={() => setDeleteTarget(cat)}
                        title="Delete Header Category"
                        className="bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200"
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

        <div className="pt-4 border-t border-border">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filteredCategories.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      </div>
    )}

      {/* Add / Edit Header Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Header Category' : 'Create Header Category'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <FormError message={formError} />

          <FormField label="Header Category Name" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Desktop, Laptop, Security..."
              required
            />
          </FormField>

          <FormField label="URL Slug (Optional)" hint="Leave blank to auto-generate from name">
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="e.g. desktop"
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
              placeholder="Brief overview of this header category..."
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

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={formSubmitting}>
              {editingCategory ? 'Save Changes' : 'Create Header Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Header Category"
        message={`Are you sure you want to permanently delete header category "${deleteTarget?.name}"? All associated main categories, subcategories, and products will also be permanently deleted. This action cannot be undone.`}
        confirmText="Delete"
        isLoading={deleteLoading}
        variant="danger"
      />
    </div>
  );
};

export default AdminHeaderCategoriesPage;
