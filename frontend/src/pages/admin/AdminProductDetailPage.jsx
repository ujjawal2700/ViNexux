import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import FormField from '../../components/ui/FormField';
import FormError from '../../components/ui/FormError';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { SkeletonCard } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  Star,
  Package,
  ImagePlus,
  Trash2,
  ImageOff,
} from 'lucide-react';

const emptyForm = {
  sku: '',
  name: '',
  categoryId: '',
  description: '',
  standardPrice: 0,
  dealerPrice: 0,
  isFeatured: false,
  isActive: true,
  specifications: [],
};

const AdminProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isCreateMode = !id || id === 'new';

  const [product, setProduct] = useState(null);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(!isCreateMode);
  const [loadError, setLoadError] = useState(null);

  const [formData, setFormData] = useState(emptyForm);
  const [specKey, setSpecKey] = useState('');
  const [specVal, setSpecVal] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [imageFile, setImageFile] = useState(null);
  const [imageAltText, setImageAltText] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageDeleteTarget, setImageDeleteTarget] = useState(null);
  const [imageDeleteLoading, setImageDeleteLoading] = useState(false);

  const [toast, setToast] = useState(null);

  const loadCategories = useCallback(async () => {
    const catRes = await adminService.getCategories({ limit: 100 });
    setCategoriesList(catRes.data?.categories || []);
  }, []);

  const loadProduct = useCallback(async () => {
    if (isCreateMode) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await adminService.getProductById(id);
      const prod = res.data;
      setProduct(prod);
      setFormData({
        sku: prod.sku || '',
        name: prod.name || '',
        categoryId: prod.categoryId?._id || prod.categoryId || '',
        description: prod.description || '',
        standardPrice: prod.standardPrice || 0,
        dealerPrice: prod.dealerPrice || 0,
        isFeatured: !!prod.isFeatured,
        isActive: prod.isActive !== undefined ? prod.isActive : true,
        specifications: prod.specifications || [],
      });
    } catch (err) {
      console.error('Failed to load product:', err);
      setLoadError(err.response?.data?.message || 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  }, [id, isCreateMode]);

  useEffect(() => {
    loadCategories();
    loadProduct();
  }, [loadCategories, loadProduct]);

  const handleAddSpec = () => {
    if (!specKey.trim() || !specVal.trim()) return;
    setFormData((f) => ({
      ...f,
      specifications: [...f.specifications, { key: specKey.trim(), value: specVal.trim() }],
    }));
    setSpecKey('');
    setSpecVal('');
  };

  const handleRemoveSpec = (index) => {
    setFormData((f) => {
      const updated = [...f.specifications];
      updated.splice(index, 1);
      return { ...f, specifications: updated };
    });
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

      if (isCreateMode) {
        const res = await adminService.createProduct(payload);
        setToast({ message: 'Product created successfully!', type: 'success' });
        const newId = res.data?._id;
        if (newId) {
          navigate(`/admin/products/${newId}`, { replace: true });
        }
      } else {
        const res = await adminService.updateProduct(id, payload);
        setProduct(res.data);
        setToast({ message: 'Product updated successfully!', type: 'success' });
      }
    } catch (err) {
      console.error('Product save error:', err);
      setFormError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    if (!imageFile || isCreateMode) return;

    setImageUploading(true);
    try {
      const res = await adminService.uploadProductImage(id, imageFile, imageAltText);
      setProduct(res.data);
      setToast({ message: 'Image uploaded successfully!', type: 'success' });
      setImageFile(null);
      setImageAltText('');
      const fileInput = document.getElementById('product-image-input');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Image upload error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to upload image', type: 'error' });
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageDeleteConfirm = async () => {
    if (!imageDeleteTarget) return;
    setImageDeleteLoading(true);
    try {
      const res = await adminService.deleteProductImage(id, imageDeleteTarget.publicId);
      setProduct(res.data);
      setToast({ message: 'Image removed', type: 'success' });
      setImageDeleteTarget(null);
    } catch (err) {
      console.error('Image delete error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to remove image', type: 'error' });
    } finally {
      setImageDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonCard className="lg:col-span-2" />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (loadError) {
    return <ErrorState title="Failed to load product" message={loadError} onRetry={loadProduct} />;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Back link + header */}
      <div className="space-y-3">
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Product Catalog
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-muted border border-border flex items-center justify-center text-primary shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                {isCreateMode ? 'Create New Product' : product?.name || 'Edit Product'}
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                {isCreateMode ? 'Add a new item to the product catalog' : `SKU: ${product?.sku}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-xs">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/60 border border-border">
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
          </div>

          {/* Specifications */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-xs">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Technical Specifications ({formData.specifications.length})
            </h4>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={specKey}
                onChange={(e) => setSpecKey(e.target.value)}
                placeholder="Spec Key (e.g. Resolution)"
              />
              <Input
                value={specVal}
                onChange={(e) => setSpecVal(e.target.value)}
                placeholder="Value (e.g. 1080p 4MP)"
              />
              <Button type="button" variant="outline" onClick={handleAddSpec} className="shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {formData.specifications.length > 0 && (
              <div className="space-y-1.5">
                {formData.specifications.map((sp, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-muted/60 p-2.5 rounded-lg text-xs border border-border">
                    <span className="font-semibold text-muted-foreground">
                      {sp.key}: <strong className="text-foreground font-semibold">{sp.value}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSpec(idx)}
                      className="text-destructive hover:text-destructive/80 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-xs">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Visibility</h4>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500" /> Featured Product
              </span>
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-4 h-4 rounded border-border accent-primary"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-semibold text-foreground">Active in Catalog</span>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-border accent-primary"
              />
            </label>

            {!isCreateMode && (
              <div className="pt-3 border-t border-border flex flex-wrap gap-2">
                {formData.isFeatured && <Badge variant="warning">Featured</Badge>}
                <Badge variant={formData.isActive ? 'success' : 'secondary'}>
                  {formData.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            )}
          </div>

          <Button type="submit" variant="primary" fullWidth isLoading={formSubmitting} leftIcon={<Save className="w-4 h-4" />}>
            {isCreateMode ? 'Create Product' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {/* Image Gallery */}
      {!isCreateMode && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-foreground">Image Gallery</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {product?.images?.length || 0} image{(product?.images?.length || 0) === 1 ? '' : 's'} uploaded for this product
            </p>
          </div>

          <form onSubmit={handleImageUpload} className="p-4 rounded-xl bg-muted/60 border border-dashed border-border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <FormField label="Select File (JPEG, PNG, WebP)">
                <input
                  id="product-image-input"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
                />
              </FormField>

              <FormField label="Alt Text (Optional)">
                <Input
                  value={imageAltText}
                  onChange={(e) => setImageAltText(e.target.value)}
                  placeholder="e.g. Front View"
                />
              </FormField>

              <Button variant="primary" type="submit" isLoading={imageUploading} isDisabled={!imageFile} leftIcon={<ImagePlus className="w-4 h-4" />}>
                Upload
              </Button>
            </div>
          </form>

          {!product?.images || product.images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <ImageOff className="w-8 h-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">No images uploaded for this product yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {product.images.map((img, idx) => (
                <div key={idx} className="group relative rounded-xl border border-border bg-muted overflow-hidden aspect-square">
                  <img src={img.url} alt={img.altText || 'Product'} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-primary text-white text-[9px] font-bold uppercase tracking-wide shadow-sm">
                      Primary
                    </span>
                  )}
                  {img.publicId && (
                    <button
                      type="button"
                      onClick={() => setImageDeleteTarget(img)}
                      className="absolute top-2 right-2 p-1.5 bg-destructive/90 hover:bg-destructive text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
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
      )}

      <ConfirmDialog
        isOpen={!!imageDeleteTarget}
        onClose={() => setImageDeleteTarget(null)}
        onConfirm={handleImageDeleteConfirm}
        title="Remove Image"
        message="Are you sure you want to remove this image from the product gallery? This cannot be undone."
        confirmText="Remove"
        isLoading={imageDeleteLoading}
        variant="danger"
      />
    </div>
  );
};

export default AdminProductDetailPage;
