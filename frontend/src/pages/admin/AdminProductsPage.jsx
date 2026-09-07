import React, { useState, useEffect } from 'react';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import FilterBar from '../../components/admin/FilterBar';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Drawer from '../../components/ui/Drawer';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import FormField from '../../components/ui/FormField';
import FormError from '../../components/ui/FormError';
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
  Upload, 
  X, 
  Star, 
  Check, 
  Tag, 
  Image as ImageIcon 
} from 'lucide-react';

const AdminProductsPage = () => {
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

  // Form Drawer State (Create / Edit)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    categoryId: '',
    description: '',
    standardPrice: 0,
    dealerPrice: 0,
    isFeatured: false,
    isActive: true,
    specifications: [],
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Temp spec input for dynamic key-value list
  const [specKey, setSpecKey] = useState('');
  const [specVal, setSpecVal] = useState('');

  // Image Upload Modal State
  const [imageModalProduct, setImageModalProduct] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageAltText, setImageAltText] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  // Delete/Deactivate Confirmation State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast Notifications
  const [toast, setToast] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 20,
        sortBy,
        sortOrder,
      };
      if (search.trim()) params.search = search.trim();
      if (categoryIdFilter) params.categoryId = categoryIdFilter;
      if (isActiveFilter !== '') params.isActive = isActiveFilter;
      if (isFeaturedFilter !== '') params.isFeatured = isFeaturedFilter;

      const res = await adminService.getProducts(params);
      setProducts(res.data?.products || []);
      setPagination(res.data?.pagination || { page: 1, limit: 20, totalPages: 1, total: 0 });

      // Fetch Categories dropdown list if not loaded yet
      if (categoriesList.length === 0) {
        const catRes = await adminService.getCategories({ limit: 100 });
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
  }, [page, categoryIdFilter, isActiveFilter, isFeaturedFilter, sortBy, sortOrder]);

  const handleSearchSubmit = () => {
    setPage(1);
    fetchProducts();
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      categoryId: categoriesList[0]?._id || '',
      description: '',
      standardPrice: 0,
      dealerPrice: 0,
      isFeatured: false,
      isActive: true,
      specifications: [],
    });
    setSpecKey('');
    setSpecVal('');
    setFormError('');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku || '',
      name: product.name || '',
      categoryId: product.categoryId?._id || product.categoryId || '',
      description: product.description || '',
      standardPrice: product.standardPrice || 0,
      dealerPrice: product.dealerPrice || 0,
      isFeatured: product.isFeatured || false,
      isActive: product.isActive !== undefined ? product.isActive : true,
      specifications: product.specifications || [],
    });
    setSpecKey('');
    setSpecVal('');
    setFormError('');
    setIsDrawerOpen(true);
  };

  const handleAddSpec = () => {
    if (!specKey.trim() || !specVal.trim()) return;
    setFormData({
      ...formData,
      specifications: [
        ...formData.specifications,
        { key: specKey.trim(), value: specVal.trim() },
      ],
    });
    setSpecKey('');
    setSpecVal('');
  };

  const handleRemoveSpec = (index) => {
    const updated = [...formData.specifications];
    updated.splice(index, 1);
    setFormData({ ...formData, specifications: updated });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.sku.trim() || !formData.name.trim() || !formData.categoryId) {
      setFormError('SKU, Product Name, and Category are required');
      return;
    }

    setFormSubmitting(true);
    setFormError('');
    try {
      const payload = {
        sku: formData.sku.trim().toUpperCase(),
        name: formData.name.trim(),
        categoryId: formData.categoryId,
        description: formData.description.trim() || undefined,
        standardPrice: Number(formData.standardPrice) || 0,
        dealerPrice: Number(formData.dealerPrice) || 0,
        isFeatured: formData.isFeatured,
        isActive: formData.isActive,
        specifications: formData.specifications,
      };

      if (editingProduct) {
        await adminService.updateProduct(editingProduct._id, payload);
        setToast({ message: 'Product updated successfully!', type: 'success' });
      } else {
        await adminService.createProduct(payload);
        setToast({ message: 'Product created successfully!', type: 'success' });
      }

      setIsDrawerOpen(false);
      fetchProducts();
    } catch (err) {
      console.error('Product save error:', err);
      setFormError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleImageUploadSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile || !imageModalProduct) return;

    setImageUploading(true);
    try {
      await adminService.uploadProductImage(imageModalProduct._id, imageFile, imageAltText);
      setToast({ message: 'Product image uploaded successfully!', type: 'success' });
      setImageModalProduct(null);
      setImageFile(null);
      setImageAltText('');
      fetchProducts();
    } catch (err) {
      console.error('Image upload error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to upload image', type: 'error' });
    } finally {
      setImageUploading(false);
    }
  };

  const handleDeleteProductImage = async (productId, publicId) => {
    try {
      await adminService.deleteProductImage(productId, publicId);
      setToast({ message: 'Product image removed!', type: 'success' });
      fetchProducts();
    } catch (err) {
      console.error('Delete image error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to remove image', type: 'error' });
    }
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
        subtitle="Manage camera models, SKUs, wholesale dealer pricing, specs & media galleries"
        badge={`${pagination.total} Total Products`}
        action={
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
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
              ...categoriesList.map((cat) => ({ value: cat._id, label: cat.name })),
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
            <Skeleton key={n} className="h-16 rounded-lg bg-slate-900" />
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
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
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
                  <Table.Row key={prod._id}>
                    <Table.Cell>
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                        {primaryImage ? (
                          <Image src={primaryImage} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="font-mono text-[11px] text-crimson-400 font-bold">{prod.sku}</div>
                      <div className="text-xs font-bold text-white max-w-xs truncate">{prod.name}</div>
                    </Table.Cell>
                    <Table.Cell className="text-xs text-slate-300">
                      {categoryName}
                    </Table.Cell>
                    <Table.Cell className="text-xs font-semibold text-slate-200">
                      ₹{Number(prod.standardPrice || 0).toLocaleString('en-IN')}
                    </Table.Cell>
                    <Table.Cell className="text-xs font-extrabold text-emerald-400">
                      ₹{Number(prod.dealerPrice || 0).toLocaleString('en-IN')}
                    </Table.Cell>
                    <Table.Cell>
                      {prod.isFeatured ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <Star className="w-3 h-3 fill-amber-400" /> Featured
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Standard</span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={prod.isActive ? 'active' : 'inactive'} />
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setImageModalProduct(prod)}
                          title="Manage Images"
                          className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-950/30"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(prod)}
                          title="Edit Product"
                          className="h-8 w-8 p-0 text-slate-300 hover:text-white"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(prod)}
                          title="Deactivate Product"
                          className="h-8 w-8 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
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

      {/* Add / Edit Product Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.sku}` : 'Create New Product'}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-5">
          <FormError message={formError} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Product SKU" required hint="Unique item identification code">
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. VNX-CAM-001"
                required
              />
            </FormField>

            <FormField label="Category" required>
              <Select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                options={[
                  { value: '', label: 'Select Product Category' },
                  ...categoriesList.map((c) => ({ value: c._id, label: c.name })),
                ]}
                required
              />
            </FormField>
          </div>

          <FormField label="Product Title / Name" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. TrueView 4MP Smart IP Outdoor Camera"
              required
            />
          </FormField>

          <FormField label="Product Description">
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed product features, lens specification, night vision distance..."
              rows={4}
            />
          </FormField>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <FormField label="Standard Retail Price (₹)" required hint="Price shown to retail/guest users">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.standardPrice}
                onChange={(e) => setFormData({ ...formData, standardPrice: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Dealer Wholesale Price (₹)" required hint="Unlocked exclusively for verified dealers">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.dealerPrice}
                onChange={(e) => setFormData({ ...formData, dealerPrice: e.target.value })}
                required
              />
            </FormField>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-crimson-600 focus:ring-crimson-500"
              />
              Featured Product
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
              />
              Active in Catalog
            </label>
          </div>

          {/* Specifications Key-Value Editor */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Technical Specifications ({formData.specifications.length})
            </h4>

            {/* Spec Builder Input */}
            <div className="flex gap-2">
              <Input
                value={specKey}
                onChange={(e) => setSpecKey(e.target.value)}
                placeholder="Spec Key (e.g. Resolution)"
                className="text-xs"
              />
              <Input
                value={specVal}
                onChange={(e) => setSpecVal(e.target.value)}
                placeholder="Value (e.g. 1080p 4MP)"
                className="text-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddSpec} className="shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Existing Specs List */}
            {formData.specifications.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {formData.specifications.map((sp, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-900 p-2 rounded-lg text-xs border border-slate-800">
                    <span className="font-semibold text-slate-300">{sp.key}: <strong className="text-white font-normal">{sp.value}</strong></span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSpec(idx)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={formSubmitting}>
              {editingProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Product Image Gallery Upload Modal */}
      <Modal
        isOpen={!!imageModalProduct}
        onClose={() => setImageModalProduct(null)}
        title={`Image Gallery: ${imageModalProduct?.sku || ''}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6">
          {/* Upload Form */}
          <form onSubmit={handleImageUploadSubmit} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Upload New Product Image</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <FormField label="Select File (JPEG, PNG, WebP)" required>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                  required
                />
              </FormField>

              <FormField label="Alt Text (Optional)">
                <Input
                  value={imageAltText}
                  onChange={(e) => setImageAltText(e.target.value)}
                  placeholder="e.g. Front View"
                  className="text-xs"
                />
              </FormField>
            </div>

            <Button variant="primary" size="sm" type="submit" isLoading={imageUploading} disabled={!imageFile}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Image
            </Button>
          </form>

          {/* Uploaded Gallery Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Current Gallery Images ({imageModalProduct?.images?.length || 0})
            </h4>

            {!imageModalProduct?.images || imageModalProduct.images.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No images uploaded for this product yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {imageModalProduct.images.map((img, idx) => (
                  <div key={idx} className="relative group rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                    <img src={img.url} alt={img.altText || 'Product'} className="w-full h-32 object-cover" />
                    {img.publicId && (
                      <button
                        onClick={() => handleDeleteProductImage(imageModalProduct._id, img.publicId)}
                        className="absolute top-2 right-2 p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg opacity-90 transition-opacity"
                        title="Delete Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

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
