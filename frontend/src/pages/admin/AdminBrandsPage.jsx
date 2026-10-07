import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Tags,
  ImagePlus,
  UploadCloud,
  X,
  Sparkles,
  Lock,
} from 'lucide-react';
import { slugify } from '../../utils/categoryUrls';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import FilterBar from '../../components/admin/FilterBar';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Modal from '../../components/ui/Modal';
import FormField from '../../components/ui/FormField';
import FormError from '../../components/ui/FormError';
import Toast from '../../components/ui/Toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  isActive: true,
  sortOrder: 0,
};

const cleanBrandSlug = (brand) => {
  if (!brand) return '';
  const raw = (brand.slug || '').toString().trim();
  if (!raw || /https?:|\/|www\./i.test(raw)) {
    return slugify(brand.name || '');
  }
  return slugify(raw) || slugify(brand.name || '');
};

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // Logo upload state
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const fileInputRef = useRef(null);

  // Modal & Dialog state
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Delete Confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('sortOrder');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load all brands
  const loadBrands = async () => {
    setLoading(true);
    try {
      const res = await adminService.getBrandsAdmin();
      setBrands(res.data?.brands || []);
    } catch (err) {
      console.error('Failed to load brands:', err);
      setToast({ message: 'Failed to load brand directory', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  // Open Add/Edit Modal
  const showForm = (brand = null) => {
    setEditing(brand);
    if (brand) {
      setForm({
        name: brand.name || '',
        slug: cleanBrandSlug(brand),
        description: brand.description || '',
        isActive: brand.isActive !== undefined ? brand.isActive : true,
        sortOrder: brand.sortOrder !== undefined ? brand.sortOrder : 0,
      });
      setLogoPreview(brand.logo?.url || '');
    } else {
      setForm(emptyForm);
      setLogoPreview('');
    }
    setLogoFile(null);
    setError('');
    setOpen(true);
  };

  // Handle Logo File Selection
  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, SVG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo image must be smaller than 5MB.');
      return;
    }

    setLogoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
    setError('');
  };

  // Remove Logo
  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save Brand (Create or Update)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Brand name is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let logoPayload = editing?.logo || null;

      // If user selected a new file, upload it
      if (logoFile) {
        const uploaded = await adminService.uploadCmsImage(logoFile, 'vinexus/brands');
        logoPayload = {
          url: uploaded.data.url,
          publicId: uploaded.data.publicId,
        };
      } else if (!logoPreview) {
        // Logo was removed
        logoPayload = null;
      }

      const computedSlug = slugify(form.name) || cleanBrandSlug({ name: form.name, slug: form.slug });
      const payload = {
        name: form.name.trim(),
        slug: computedSlug,
        description: form.description.trim() || '',
        isActive: Boolean(form.isActive),
        sortOrder: Number(form.sortOrder) || 0,
        logo: logoPayload,
      };

      if (editing) {
        await adminService.updateBrandAdmin(editing._id, payload);
        setToast({ message: `Brand "${payload.name}" updated successfully.`, type: 'success' });
      } else {
        await adminService.createBrandAdmin(payload);
        setToast({ message: `Brand "${payload.name}" created successfully.`, type: 'success' });
      }

      setOpen(false);
      await loadBrands();
    } catch (err) {
      console.error('Save brand error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save brand.');
    } finally {
      setSaving(false);
    }
  };

  // Delete / Deactivate Brand
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await adminService.deleteBrandAdmin(deleteTarget._id);
      setToast({
        message: res.message || `Brand "${deleteTarget.name}" processed successfully.`,
        type: 'success',
      });
      setDeleteTarget(null);
      await loadBrands();
    } catch (err) {
      console.error('Delete brand error:', err);
      setToast({
        message: err.response?.data?.message || 'Failed to delete brand.',
        type: 'error',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered & Sorted brands
  const filteredBrands = useMemo(() => {
    let result = [...brands];

    // Search filter
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.name?.toLowerCase().includes(q) ||
          b.slug?.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter((b) => b.isActive);
    } else if (statusFilter === 'inactive') {
      result = result.filter((b) => !b.isActive);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'sortOrder') {
        const orderA = Number(a.sortOrder) || 0;
        const orderB = Number(b.sortOrder) || 0;
        return sortOrder === 'asc' ? orderA - orderB : orderB - orderA;
      }
      if (sortBy === 'name') {
        const comp = (a.name || '').localeCompare(b.name || '');
        return sortOrder === 'asc' ? comp : -comp;
      }
      if (sortBy === 'createdAt') {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });

    return result;
  }, [brands, debouncedSearch, statusFilter, sortBy, sortOrder]);

  // Paginated brands
  const paginatedBrands = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBrands.slice(start, start + pageSize);
  }, [filteredBrands, page, pageSize]);

  const totalPages = Math.ceil(filteredBrands.length / pageSize) || 1;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page Header (Import Existing button removed as requested) */}
      <AdminPageHeader
        title="Brand Management"
        subtitle="Create, organize and maintain manufacturer brands and storefront showcase logos"
        badge={`${brands.length} Total Brands`}
        action={
          <Button variant="primary" size="sm" onClick={() => showForm()}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Brand
          </Button>
        }
      />

      {/* Filter & Search Bar */}
      <FilterBar
        search={search}
        onSearchChange={(e) => setSearch(e.target.value)}
        searchPlaceholder="Search by brand name or URL slug..."
        filters={[
          {
            value: statusFilter,
            onChange: (val) => {
              setStatusFilter(val);
              setPage(1);
            },
            options: [
              { value: '', label: 'All Statuses' },
              { value: 'active', label: 'Active Brands Only' },
              { value: 'inactive', label: 'Inactive Brands Only' },
            ],
          },
        ]}
        sortOptions={[
          { value: 'sortOrder', label: 'Sort by Sort Order' },
          { value: 'name', label: 'Sort by Brand Name' },
          { value: 'createdAt', label: 'Sort by Creation Date' },
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
          setStatusFilter('');
          setSortBy('sortOrder');
          setSortOrder('asc');
          setPage(1);
        }}
      />

      {/* Table Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : filteredBrands.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No brands found"
          description={
            search || statusFilter
              ? 'No brand entries match your current search or filter criteria.'
              : 'There are no brands registered in the system yet.'
          }
          action={
            <Button variant="primary" size="sm" onClick={() => showForm()}>
              <Plus className="w-4 h-4 mr-1.5" /> Add First Brand
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head className="w-20">Logo</Table.Head>
                <Table.Head>Brand Name</Table.Head>
                <Table.Head>URL Slug</Table.Head>
                <Table.Head>Sort Order</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head className="text-right">Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {paginatedBrands.map((brand) => (
                <Table.Row key={brand._id}>
                  {/* Logo Thumbnail */}
                  <Table.Cell>
                    <div className="w-14 h-12 rounded-lg border border-border bg-white p-1 flex items-center justify-center overflow-hidden shadow-2xs">
                      {brand.logo?.url ? (
                        <img
                          src={brand.logo.url}
                          alt={brand.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Tags className="w-4 h-4 text-muted-foreground/60" />
                          <span className="text-[9px] font-bold mt-0.5 truncate max-w-[48px]">
                            {brand.name.slice(0, 4)}
                          </span>
                        </div>
                      )}
                    </div>
                  </Table.Cell>

                  {/* Brand Name & Description */}
                  <Table.Cell>
                    <div className="font-bold text-sm text-foreground">{brand.name}</div>
                    {brand.description ? (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-sm mt-0.5">
                        {brand.description}
                      </p>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60 italic">No description</span>
                    )}
                  </Table.Cell>

                  {/* URL Slug */}
                  <Table.Cell>
                    <span className="font-mono text-xs text-primary font-semibold bg-primary/5 px-2 py-0.5 rounded border border-primary/20">
                      /{cleanBrandSlug(brand)}
                    </span>
                  </Table.Cell>

                  {/* Sort Order */}
                  <Table.Cell>
                    <span className="font-mono text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                      #{brand.sortOrder ?? 0}
                    </span>
                  </Table.Cell>

                  {/* Status */}
                  <Table.Cell>
                    <StatusBadge status={brand.isActive ? 'active' : 'inactive'} />
                  </Table.Cell>

                  {/* Actions: Update & Delete icons */}
                  <Table.Cell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onClick={() => showForm(brand)}
                        title="Edit Brand"
                        className="hover:text-primary hover:bg-primary/10"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onClick={() => setDeleteTarget(brand)}
                        title="Delete Brand"
                        className="hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          {/* Pagination */}
          {filteredBrands.length > pageSize && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filteredBrands.length}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p)}
            />
          )}
        </div>
      )}

      {/* Add / Edit Brand Modal with Perfect Image Upload */}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit Brand: ${editing.name}` : 'Add New Brand'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormError message={error} />

          {/* Brand Name */}
          <FormField label="Brand Name" required hint="e.g. ASUS, HP, Hikvision, Dahua">
            <Input
              value={form.name}
              onChange={(e) => {
                const newName = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  name: newName,
                  slug: slugify(newName),
                }));
              }}
              placeholder="Enter brand name"
              required
            />
          </FormField>

          {/* URL Slug (Auto-Generated & Locked) */}
          <FormField
            label="URL Slug (Auto-Generated)"
            hint={
              form.slug
                ? `Storefront URL: /brands/${form.slug}`
                : 'Automatically generated from brand name'
            }
          >
            <div className="relative">
              <Input
                value={form.slug}
                readOnly
                disabled
                placeholder="auto-generated-slug"
                className="font-mono text-xs bg-muted/60 text-muted-foreground cursor-not-allowed select-none pr-9"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none">
                <Lock className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/80 mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3 text-muted-foreground/60 inline shrink-0" />
              <span>Slug is locked and automatically updated from Brand Name to prevent broken URLs.</span>
            </p>
          </FormField>

          {/* BRAND LOGO IMAGE SELECTION SECTION */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">
              Brand Logo Image
            </label>
            <p className="text-[11px] text-muted-foreground">
              Official brand emblem displayed on storefront homepage carousel and filter chips.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoFileChange}
            />

            {logoPreview ? (
              /* Logo Preview Card */
              <div className="flex items-center gap-4 p-3 bg-muted/30 border border-border rounded-xl">
                <div className="w-24 h-16 rounded-lg border border-border bg-white p-2 flex items-center justify-center shadow-xs overflow-hidden">
                  <img
                    src={logoPreview}
                    alt="Brand Logo Preview"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {logoFile ? logoFile.name : 'Current Brand Logo'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {logoFile ? `${(logoFile.size / 1024).toFixed(1)} KB` : 'Cloud Stored Logo'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs h-7 px-2.5"
                    >
                      <UploadCloud className="w-3.5 h-3.5 mr-1" /> Change Logo
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Remove
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty Dropzone Button */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary rounded-xl p-5 text-center cursor-pointer transition-colors bg-muted/10 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ImagePlus className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-primary block">
                    Click to select brand logo
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Supports PNG, SVG, JPG, WEBP (Max 5MB)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <FormField label="Description (Optional)" hint="Brief summary about the brand">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Global leading manufacturer of gaming hardware, laptops and motherboards..."
              rows={2}
              className="text-xs"
            />
          </FormField>

          {/* Sort Order & Active Status */}
          <div className="grid grid-cols-2 gap-4 items-end pt-2 border-t border-border">
            <FormField label="Sort Order" hint="Lower values appear first on carousel">
              <Input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                className="text-xs font-mono font-bold"
              />
            </FormField>

            <div className="pb-2">
              <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 accent-primary"
                />
                <span>Active on Storefront</span>
              </label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Displays on home carousel and filters
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              {editing ? 'Update Brand' : 'Create Brand'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete / Deactivate Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Brand"
        message={
          deleteTarget
            ? `Are you sure you want to remove "${deleteTarget.name}"? If products are attached to this brand, it will be safely deactivated to protect catalog integrity.`
            : ''
        }
        confirmText="Confirm Delete"
        isLoading={deleteLoading}
        variant="danger"
      />
    </div>
  );
}
