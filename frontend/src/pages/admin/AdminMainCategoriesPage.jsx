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
import { Plus, Edit2, Trash2, FolderTree, Search, Layers } from 'lucide-react';
import CategoryIcon from '../../components/ui/CategoryIcon';

/**
 * Dedicated Main Category Management Page (Tier 2 Categories)
 * Under Header Categories
 */
const AdminMainCategoriesPage = () => {
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [headerFilter, setHeaderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
      setAllCategories(res.data?.categories || []);
    } catch (err) {
      console.error('Failed to load main categories:', err);
      setError(err.response?.data?.message || 'Failed to load main categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 1. Header Categories (roots)
  const headerCategories = useMemo(() => {
    return allCategories.filter((c) => !c.parentId);
  }, [allCategories]);

  // Set of Header Category IDs
  const headerIdsSet = useMemo(() => {
    return new Set(headerCategories.map((c) => String(c._id)));
  }, [headerCategories]);

  // 2. Main Categories: categories whose parentId is in headerIdsSet
  const mainCategories = useMemo(() => {
    return allCategories.filter((cat) => {
      const pId = cat.parentId?._id || cat.parentId;
      return pId && headerIdsSet.has(String(pId));
    });
  }, [allCategories, headerIdsSet]);

  // Map of categoryId -> count of sub categories
  const subCountsMap = useMemo(() => {
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

  // Filtered Main Categories
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredCategories = useMemo(() => {
    return mainCategories.filter((cat) => {
      const matchesSearch =
        !searchTerm.trim() ||
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.slug.toLowerCase().includes(searchTerm.toLowerCase());

      const catParentId = String(cat.parentId?._id || cat.parentId || '');
      const matchesHeader = !headerFilter || catParentId === headerFilter;

      const matchesStatus =
        statusFilter === '' ||
        (statusFilter === 'true' ? cat.isActive : !cat.isActive);

      return matchesSearch && matchesHeader && matchesStatus;
    });
  }, [mainCategories, searchTerm, headerFilter, statusFilter]);

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
      parentId: '', // unselected by default
      image: '',
      description: '',
      isActive: true,
      sortOrder: (mainCategories.length || 0) + 1,
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
    if (!formData.parentId) {
      setFormError('Please select a parent Header Category for this Main Category');
      return;
    }

    setFormSubmitting(true);
    setFormError('');
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        parentId: formData.parentId,
        image: formData.image.trim() || undefined,
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
        sortOrder: Number(formData.sortOrder) || 0,
      };

      if (editingCategory) {
        await adminService.updateCategory(editingCategory._id, payload);
        setToast({ message: `Main category "${formData.name}" updated successfully!`, type: 'success' });
      } else {
        await adminService.createCategory(payload);
        setToast({ message: `Main category "${formData.name}" created successfully!`, type: 'success' });
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error('Main category save error:', err);
      setFormError(err.response?.data?.message || 'Failed to save main category');
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
        message: res.message || 'Main category deleted successfully',
        type: 'success',
      });
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      console.error('Delete error:', err);
      setToast({
        message: err.response?.data?.message || 'Failed to delete main category',
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
        title="Main Categories"
        subtitle="Manage main categories classified under Header Categories (Tier 2)"
        badge={`${mainCategories.length} Categories`}
        action={
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Main Category
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search main categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Header Category Filter */}
          <Select
            value={headerFilter}
            onChange={(e) => setHeaderFilter(e.target.value)}
            options={[
              { value: '', label: 'All Header Categories' },
              ...headerCategories.map((h) => ({
                value: h._id,
                label: `Under ${h.name}`,
              })),
            ]}
            className="w-full sm:w-56 text-xs"
          />

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'true', label: 'Active Only' },
              { value: 'false', label: 'Inactive Only' },
            ]}
            className="w-full sm:w-36 text-xs"
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
        <ErrorState title="Failed to load main categories" message={error} onRetry={fetchCategories} />
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No Main Categories found"
          description={
            headerFilter
              ? "No main categories found under this header category."
              : "Get started by creating your first main category under a header category."
          }
          action={
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Main Category
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>Order</Table.Head>
              <Table.Head>Main Category Name</Table.Head>
              <Table.Head>Slug</Table.Head>
              <Table.Head>Header Category (Parent)</Table.Head>
              <Table.Head>Sub Categories</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head className="text-right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {paginatedCategories.map((cat) => {
              const parentHeader = headerCategories.find(
                (h) => h._id === (cat.parentId?._id || cat.parentId)
              );
              const subCount = subCountsMap.get(String(cat._id)) || 0;

              return (
                <Table.Row key={cat._id}>
                  <Table.Cell className="font-mono text-xs text-muted-foreground font-bold">
                    #{cat.sortOrder || 0}
                  </Table.Cell>
                  <Table.Cell className="font-bold text-foreground text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                        <FolderTree className="w-4 h-4" />
                      </div>
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
                    {parentHeader ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-[#800020] border border-rose-200">
                        <Layers className="w-3 h-3" />
                        <span>{parentHeader.name}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 font-mono text-xs">—</span>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {subCount > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {subCount} Sub {subCount === 1 ? 'Category' : 'Categories'}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">None (Direct Products)</span>
                    )}
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
                        title="Edit Main Category"
                        className="bg-muted/80 hover:bg-primary/20 text-foreground hover:text-primary border border-border"
                      >
                        <Edit2 className="w-4 h-4 shrink-0" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onClick={() => setDeleteTarget(cat)}
                        title="Delete Main Category"
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

      {/* Add / Edit Main Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Main Category' : 'Create Main Category'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <FormError message={formError} />

          <FormField label="Header Category (Parent)" required hint="Choose the Header Category this Main Category belongs to">
            <Select
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              placeholder="Select a Header Category"
              options={headerCategories.map((h) => ({
                value: h._id,
                label: `${h.name} (Header)`,
              }))}
              required
            />
          </FormField>

          <FormField label="Main Category Name" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. All-in-One PCs, Gaming Desktops, CCTV Cameras..."
              required
            />
          </FormField>

          <FormField label="URL Slug (Optional)" hint="Leave blank to auto-generate from name">
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="e.g. all-in-one-pcs"
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
              placeholder="Brief overview of this main category..."
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
              {editingCategory ? 'Save Changes' : 'Create Main Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Main Category"
        message={`Are you sure you want to permanently delete main category "${deleteTarget?.name}"? All associated subcategories and products will also be permanently deleted. This action cannot be undone.`}
        confirmText="Delete"
        isLoading={deleteLoading}
        variant="danger"
      />
    </div>
  );
};

export default AdminMainCategoriesPage;
