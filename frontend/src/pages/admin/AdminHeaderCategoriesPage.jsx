import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import CategoryFilterBuilder from '../../components/admin/CategoryFilterBuilder';

/**
 * Dedicated Header Category Management Page (Tier 1 Root Categories)
 */
const AdminHeaderCategoriesPage = () => {
  const nameInputRef = useRef(null);
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
  const [categoryImageFile, setCategoryImageFile] = useState(null);
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
    setCategoryImageFile(null);
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      image: '',
      description: '',
      filterDefinitions: [],
      isActive: true,
      sortOrder: (categories.length || 0) + 1,
    });
    setFormError('');
    setIsModalOpen(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 120);
  };

  const handleOpenEdit = (category) => {
    setCategoryImageFile(null);
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      slug: category.slug || '',
      image: category.image || '',
      description: category.description || '',
      filterDefinitions: category.filterDefinitions || [],
      isActive: category.isActive !== undefined ? category.isActive : true,
      sortOrder: category.sortOrder || 0,
    });
    setFormError('');
    setIsModalOpen(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 120);
  };

  const handleFormSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Department name is required');
      setToast({ message: 'Please enter a Department Name.', type: 'error' });
      nameInputRef.current?.focus();
      return;
    }

    setFormSubmitting(true);
    setFormError('');
    try {
      const uploadedImage = categoryImageFile
        ? await adminService.uploadCmsImage(categoryImageFile, 'vinexus/categories')
        : null;
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        parentId: null, // Always root / Header Category
        image: uploadedImage?.data?.url || formData.image.trim() || undefined,
        description: formData.description.trim() || undefined,
        filterDefinitions: formData.filterDefinitions || [],
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
      const msg = err.response?.data?.message || err.message || 'Failed to save category';
      setFormError(msg);
      setToast({ message: msg, type: 'error' });
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
        title="Header Categories (Top Departments)"
        subtitle="Manage the primary shopping departments displayed on the top navigation bar of your website."
        badge={`${categories.length} Departments`}
        action={
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Header Department
          </Button>
        }
      />

      {/* Non-tech Friendly Explanatory Card */}
      <div className="rounded-xl border border-rose-200/80 bg-gradient-to-r from-rose-50/70 via-white to-white p-4 text-xs text-gray-700 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#800020]/10 text-[#800020] shrink-0 mt-0.5">
            <Layers className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-gray-900 text-sm">How Header Categories Work</h3>
            <p className="text-gray-600 leading-relaxed">
              <strong>Header Categories</strong> are the main shopping departments shown across the top navigation bar of your store (e.g. <em>Desktop, Laptop, Storage, Security</em>). Each department can contain <strong>Main Categories</strong> (e.g. under "Security" you can have "CCTV Cameras", "Biometrics"), which then contain specific <strong>Subcategories</strong>.
            </p>
          </div>
        </div>
      </div>

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
        title={editingCategory ? 'Edit Department (Header Category)' : 'Create New Department (Header Category)'}
        description="Top-level shopping departments displayed across your website's main navigation menu."
        size="xl"
        className="max-w-3xl sm:max-w-4xl"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleFormSubmit}
              isLoading={formSubmitting}
            >
              {editingCategory ? 'Save Changes' : 'Create Header Category'}
            </Button>
          </div>
        }
      >
        <form id="header-category-form" noValidate onSubmit={handleFormSubmit} className="space-y-4 pt-1">
          <FormError message={formError} />

          <FormField
            label="Department / Category Name"
            required
            error={formError && !formData.name.trim() ? formError : undefined}
            helperText="The primary name displayed in the top navigation bar (e.g. Laptops, Storage, CCTV Security)."
          >
            <input
              ref={nameInputRef}
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (formError) setFormError('');
              }}
              placeholder="e.g. Desktop Computers, Laptops, Security Systems"
              className={`w-full bg-card border ${
                formError && !formData.name.trim()
                  ? 'border-rose-500 ring-1 ring-rose-500'
                  : 'border-border focus:border-primary focus:ring-1 focus:ring-primary/20'
              } rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground/70 transition-all`}
            />
          </FormField>

          <FormField
            label="Web Address Link (URL Slug)"
            hint="Optional — leave blank to automatically create a clean web link from the name"
          >
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="e.g. laptops (or leave empty)"
            />
          </FormField>

          <FormField
            label="Department Photo or Banner (Optional)"
            helperText="Upload an image (PNG, JPG, WebP) or enter an external image URL."
          >
            <div className="space-y-2">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => setCategoryImageFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
              />
              <Input
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="Or paste external image URL (e.g. https://...)"
              />
            </div>
          </FormField>

          <FormField
            label="Department Description (Optional)"
            helperText="A brief overview of the products found in this department."
          >
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief overview of products in this category..."
              rows={3}
            />
          </FormField>

          <CategoryFilterBuilder
            value={formData.filterDefinitions || []}
            onChange={(filterDefinitions) => setFormData({ ...formData, filterDefinitions })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Menu Order Position"
              helperText="Lower numbers appear first on the menu (e.g. 1 is first on the left)."
            >
              <Input
                type="number"
                min="0"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
              />
            </FormField>

            <FormField
              label="Website Visibility"
              helperText="Control whether this category is active and visible to shoppers."
            >
              <Select
                value={formData.isActive ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                options={[
                  { value: 'true', label: 'Visible on Website' },
                  { value: 'false', label: 'Hidden (Draft)' },
                ]}
              />
            </FormField>
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
