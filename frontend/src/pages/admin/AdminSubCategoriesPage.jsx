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
import { Plus, Edit2, Trash2, GitBranch, Search, Layers, FolderTree, Info } from 'lucide-react';

/**
 * Dedicated Sub Category Management Page (Tier 3 Categories - Optional)
 * Under Main Categories
 */
const AdminSubCategoriesPage = () => {
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [headerFilter, setHeaderFilter] = useState('');
  const [mainFilter, setMainFilter] = useState('');
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
      console.error('Failed to load sub categories:', err);
      setError(err.response?.data?.message || 'Failed to load sub categories');
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

  const headerIdsSet = useMemo(() => {
    return new Set(headerCategories.map((c) => String(c._id)));
  }, [headerCategories]);

  // 2. Main Categories: categories whose parent is in headerIdsSet
  const mainCategories = useMemo(() => {
    return allCategories.filter((cat) => {
      const pId = cat.parentId?._id || cat.parentId;
      return pId && headerIdsSet.has(String(pId));
    });
  }, [allCategories, headerIdsSet]);

  const mainIdsSet = useMemo(() => {
    return new Set(mainCategories.map((c) => String(c._id)));
  }, [mainCategories]);

  // 3. Sub Categories: categories whose parent is in mainIdsSet
  const subCategories = useMemo(() => {
    return allCategories.filter((cat) => {
      const pId = cat.parentId?._id || cat.parentId;
      return pId && mainIdsSet.has(String(pId));
    });
  }, [allCategories, mainIdsSet]);

  // Main Categories available for the selected Header Filter (for filter dropdown)
  const filteredMainOptions = useMemo(() => {
    if (!headerFilter) return mainCategories;
    return mainCategories.filter((m) => String(m.parentId?._id || m.parentId) === headerFilter);
  }, [mainCategories, headerFilter]);

  // Filtered Sub Categories
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredCategories = useMemo(() => {
    return subCategories.filter((cat) => {
      const matchesSearch =
        !searchTerm.trim() ||
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.slug.toLowerCase().includes(searchTerm.toLowerCase());

      const parentMainId = String(cat.parentId?._id || cat.parentId || '');
      const parentMain = mainCategories.find((m) => String(m._id) === parentMainId);
      const rootHeaderId = parentMain ? String(parentMain.parentId?._id || parentMain.parentId || '') : '';

      const matchesHeader = !headerFilter || rootHeaderId === headerFilter;
      const matchesMain = !mainFilter || parentMainId === mainFilter;

      const matchesStatus =
        statusFilter === '' ||
        (statusFilter === 'true' ? cat.isActive : !cat.isActive);

      return matchesSearch && matchesHeader && matchesMain && matchesStatus;
    });
  }, [subCategories, mainCategories, searchTerm, headerFilter, mainFilter, statusFilter]);

  const totalPages = Math.ceil(filteredCategories.length / pageSize) || 1;

  const paginatedCategories = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, page, pageSize]);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, headerFilter, mainFilter, statusFilter]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      parentId: '',
      image: '',
      description: '',
      isActive: true,
      sortOrder: (subCategories.length || 0) + 1,
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
      setFormError('Please select a parent Main Category for this Sub Category');
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
        setToast({ message: `Sub category "${formData.name}" updated successfully!`, type: 'success' });
      } else {
        await adminService.createCategory(payload);
        setToast({ message: `Sub category "${formData.name}" created successfully!`, type: 'success' });
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error('Sub category save error:', err);
      setFormError(err.response?.data?.message || 'Failed to save sub category');
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
        message: res.message || 'Sub category deleted successfully',
        type: 'success',
      });
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      console.error('Delete error:', err);
      setToast({
        message: err.response?.data?.message || 'Failed to delete sub category',
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
        title="Sub Categories"
        subtitle="Manage detailed product subcategories classified under Main Categories (Tier 3)"
        badge={`${subCategories.length} Categories`}
        action={
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Sub Category
          </Button>
        }
      />

      {/* Optional Hierarchy Notification Banner */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 sm:px-4 flex items-center gap-3 text-xs text-amber-900 shadow-xs">
        <Info className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="font-medium">
          <strong>Note:</strong> Sub Categories are <strong>optional</strong>. You can directly add and assign products inside <strong>Main Categories</strong> without creating subcategories if your catalog does not require deeper nesting.
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search sub categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Header Category Filter */}
          <Select
            value={headerFilter}
            onChange={(e) => {
              setHeaderFilter(e.target.value);
              setMainFilter(''); // reset main filter when header changes
            }}
            options={[
              { value: '', label: 'All Header Categories' },
              ...headerCategories.map((h) => ({
                value: h._id,
                label: `Header: ${h.name}`,
              })),
            ]}
            className="w-full sm:w-48 text-xs"
          />

          {/* Main Category Filter */}
          <Select
            value={mainFilter}
            onChange={(e) => setMainFilter(e.target.value)}
            options={[
              { value: '', label: 'All Main Categories' },
              ...filteredMainOptions.map((m) => ({
                value: m._id,
                label: `Main: ${m.name}`,
              })),
            ]}
            className="w-full sm:w-48 text-xs"
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
        <ErrorState title="Failed to load sub categories" message={error} onRetry={fetchCategories} />
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No Sub Categories found"
          description={
            headerFilter || mainFilter
              ? "No sub categories found matching your selected filters."
              : "No sub categories created yet. Click below to add a sub category."
          }
          action={
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Sub Category
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>Order</Table.Head>
              <Table.Head>Sub Category Name</Table.Head>
              <Table.Head>Slug</Table.Head>
              <Table.Head>Main Category (Parent)</Table.Head>
              <Table.Head>Header Category</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head className="text-right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {paginatedCategories.map((cat) => {
              const parentMain = mainCategories.find(
                (m) => m._id === (cat.parentId?._id || cat.parentId)
              );
              const rootHeader = parentMain
                ? headerCategories.find((h) => h._id === (parentMain.parentId?._id || parentMain.parentId))
                : null;

              return (
                <Table.Row key={cat._id}>
                  <Table.Cell className="font-mono text-xs text-muted-foreground font-bold">
                    #{cat.sortOrder || 0}
                  </Table.Cell>
                  <Table.Cell className="font-bold text-foreground text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <GitBranch className="w-4 h-4" />
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
                    {parentMain ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        <FolderTree className="w-3 h-3" />
                        <span>{parentMain.name}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 font-mono text-xs">—</span>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {rootHeader ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-[#800020] border border-rose-200">
                        <Layers className="w-3 h-3" />
                        <span>{rootHeader.name}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 font-mono text-xs">—</span>
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
                        title="Edit Sub Category"
                        className="bg-muted/80 hover:bg-primary/20 text-foreground hover:text-primary border border-border"
                      >
                        <Edit2 className="w-4 h-4 shrink-0" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onClick={() => setDeleteTarget(cat)}
                        title="Delete Sub Category"
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
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filteredCategories.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    )}

      {/* Add / Edit Sub Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Sub Category' : 'Create Sub Category'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <FormError message={formError} />

          <FormField label="Main Category (Parent)" required hint="Choose the Main Category this Sub Category belongs to">
            <Select
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              placeholder="Select a Main Category"
              options={mainCategories.map((m) => {
                const root = headerCategories.find((h) => h._id === (m.parentId?._id || m.parentId));
                return {
                  value: m._id,
                  label: `${m.name} (under ${root?.name || 'Header'})`,
                };
              })}
              required
            />
          </FormField>

          <FormField label="Sub Category Name" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Touchscreen Series, Intel Core i7 Series..."
              required
            />
          </FormField>

          <FormField label="URL Slug (Optional)" hint="Leave blank to auto-generate from name">
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="e.g. touchscreen-series"
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
              placeholder="Brief overview of this sub category..."
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
              {editingCategory ? 'Save Changes' : 'Create Sub Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Sub Category"
        message={`Are you sure you want to permanently delete sub category "${deleteTarget?.name}"? All associated products will also be permanently deleted. This action cannot be undone.`}
        confirmText="Delete"
        isLoading={deleteLoading}
        variant="danger"
      />
    </div>
  );
};

export default AdminSubCategoriesPage;
