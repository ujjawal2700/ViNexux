import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import FormField from '../../components/ui/FormField';
import FormError from '../../components/ui/FormError';
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
  Tag,
  Layers,
  FolderTree,
  Sparkles,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  Cpu,
  Truck,
  Battery,
  Monitor,
  Wifi,
  ChevronRight,
  UploadCloud,
  Check,
  HelpCircle,
  Link as LinkIcon,
} from 'lucide-react';

const POPULAR_BRANDS = [
  'ASUS',
  'DELL',
  'HP',
  'Lenovo',
  'Acer',
  'Apple',
  'SAMSUNG',
  'dahua',
  'HIKVISION',
  'CP PLUS',
  'tp-link',
  'CISCO',
  'D-Link',
  'Western Digital',
  'SEAGATE',
  'SanDisk',
  'Crucial',
  'Canon',
  'Epson',
  'Logitech',
  'Microsoft',
  'Quick Heal',
  'CORSAIR',
];

const PRESET_HIGHLIGHT_OPTIONS = [
  { label: 'High Performance', text: 'Ultra High Performance & Speed', icon: Zap },
  { label: '1 Year Warranty', text: '1 Year Manufacturer On-Site Warranty', icon: ShieldCheck },
  { label: '100% Genuine', text: '100% Genuine Brand Certified', icon: CheckCircle2 },
  { label: 'Bulk Wholesale Ready', text: 'Bulk Wholesale Ready for Dealers', icon: Package },
  { label: 'Enterprise Security', text: 'Enterprise Grade Hardware & Security', icon: Lock },
  { label: 'PoE Supported', text: 'Power over Ethernet (PoE) Ready', icon: Zap },
  { label: 'Fast Express Delivery', text: 'Fast Priority Dispatch', icon: Truck },
  { label: 'Long Battery Life', text: 'All-Day Extended Battery Life', icon: Battery },
  { label: 'High Refresh Display', text: 'Fast Refresh Rate IPS Display', icon: Monitor },
  { label: 'Wi-Fi 6 Enabled', text: 'Next-Gen Ultra Fast Wi-Fi 6', icon: Wifi },
];

const TABS = [
  { id: 'general', label: 'General Info', subtitle: 'Title, brand, SKU & overview', icon: Tag },
  { id: 'variants', label: 'Item Variants', subtitle: 'Prices, stock & media images', icon: Layers },
  { id: 'groups', label: 'Groups', subtitle: 'Main & sub category hierarchy', icon: FolderTree },
  { id: 'highlights', label: 'Highlights', subtitle: 'Badges & technical specs', icon: Sparkles },
];

const AdminProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isCreateMode = !id || id === 'new';

  const [activeTab, setActiveTab] = useState('general');
  const [product, setProduct] = useState(null);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(!isCreateMode);
  const [loadError, setLoadError] = useState(null);

  // --- Form State ---
  // General Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [brandName, setBrandName] = useState('');
  const [sku, setSku] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [warranty, setWarranty] = useState('1 Year Official Warranty');
  const [countryOfOrigin, setCountryOfOrigin] = useState('India');
  const [hsnCode, setHsnCode] = useState('');

  // Item Variants / Pricing & Stock
  const [variantName, setVariantName] = useState('Standard Model');
  const [standardPrice, setStandardPrice] = useState('');
  const [dealerPrice, setDealerPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('25');

  // Groups (3-tier hierarchy)
  const [selectedHeaderId, setSelectedHeaderId] = useState('');
  const [selectedMainId, setSelectedMainId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');

  // Status & Visibility
  const [status, setStatus] = useState('published'); // 'published' | 'draft'
  const [isFeatured, setIsFeatured] = useState(false);

  // Highlights (4 slots)
  const [highlights, setHighlights] = useState([
    { title: '100% Genuine Brand Certified', iconName: 'CheckCircle2' },
    { title: '1 Year Manufacturer On-Site Warranty', iconName: 'ShieldCheck' },
    { title: 'Bulk Wholesale Ready for Dealers', iconName: 'Package' },
    { title: 'Ultra High Performance & Speed', iconName: 'Zap' },
  ]);

  // Additional Specifications
  const [specifications, setSpecifications] = useState([]);
  const [specKey, setSpecKey] = useState('');
  const [specVal, setSpecVal] = useState('');

  // Media / Images
  const [imagesList, setImagesList] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imageAltText, setImageAltText] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [stagedImages, setStagedImages] = useState([]);
  const stagedImagesRef = React.useRef([]);
  const [imageDeleteTarget, setImageDeleteTarget] = useState(null);
  const [imageDeleteLoading, setImageDeleteLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Submission & Feedback
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    stagedImagesRef.current = stagedImages;
  }, [stagedImages]);

  useEffect(() => {
    return () => {
      stagedImagesRef.current.forEach((img) => img.previewUrl && URL.revokeObjectURL(img.previewUrl));
    };
  }, []);

  // --- Category Extraction ---
  const headerCategories = useMemo(() => {
    return categoriesList.filter((c) => !c.parentId);
  }, [categoriesList]);

  const mainCategories = useMemo(() => {
    if (!selectedHeaderId) return [];
    return categoriesList.filter((c) => {
      const pId = c.parentId?._id || c.parentId;
      return pId && String(pId) === String(selectedHeaderId);
    });
  }, [categoriesList, selectedHeaderId]);

  const subCategories = useMemo(() => {
    if (!selectedMainId) return [];
    return categoriesList.filter((c) => {
      const pId = c.parentId?._id || c.parentId;
      return pId && String(pId) === String(selectedMainId);
    });
  }, [categoriesList, selectedMainId]);

  // Load all categories
  const loadCategories = useCallback(async () => {
    try {
      const catRes = await adminService.getCategories({ limit: 500, sortBy: 'sortOrder', sortOrder: 'asc' });
      setCategoriesList(catRes.data?.categories || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  // Load product if editing
  const loadProduct = useCallback(async () => {
    if (isCreateMode) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await adminService.getProductById(id);
      const prod = res.data;
      setProduct(prod);

      setName(prod.name || '');
      setSku(prod.sku || '');
      setDescription(prod.description || '');
      setStandardPrice(prod.standardPrice !== undefined ? String(prod.standardPrice) : '');
      setDealerPrice(prod.dealerPrice !== undefined ? String(prod.dealerPrice) : '');
      setIsFeatured(!!prod.isFeatured);
      setStatus(prod.isActive ? 'published' : 'draft');
      setImagesList(prod.images || []);

      // Extract specs and structured fields
      if (prod.specifications && Array.isArray(prod.specifications)) {
        const remainingSpecs = [];
        const hlCopy = [
          { title: '', iconName: 'CheckCircle2' },
          { title: '', iconName: 'ShieldCheck' },
          { title: '', iconName: 'Package' },
          { title: '', iconName: 'Zap' },
        ];
        let hlIndex = 0;

        prod.specifications.forEach((sp) => {
          const keyLower = sp.key.toLowerCase().trim();
          if (keyLower === 'brand') {
            setBrandName(sp.value);
          } else if (keyLower === 'model number' || keyLower === 'model') {
            setModelNumber(sp.value);
          } else if (keyLower === 'warranty') {
            setWarranty(sp.value);
          } else if (keyLower === 'country of origin') {
            setCountryOfOrigin(sp.value);
          } else if (keyLower === 'hsn code' || keyLower === 'hsn') {
            setHsnCode(sp.value);
          } else if (keyLower === 'stock' || keyLower === 'inventory') {
            setStockQuantity(sp.value);
          } else if (keyLower === 'variant') {
            setVariantName(sp.value);
          } else if (keyLower.startsWith('highlight') && hlIndex < 4) {
            hlCopy[hlIndex].title = sp.value;
            hlIndex++;
          } else {
            remainingSpecs.push(sp);
          }
        });

        // Set highlights if found, otherwise keep defaults
        if (hlIndex > 0) {
          setHighlights(hlCopy);
        }
        setSpecifications(remainingSpecs);
      }
    } catch (err) {
      console.error('Failed to load product:', err);
      setLoadError(err.response?.data?.message || 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  }, [id, isCreateMode]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // Sync category mapping once categoriesList and product are ready
  useEffect(() => {
    if (!product || categoriesList.length === 0) return;

    const currentCatId = String(product.categoryId?._id || product.categoryId || '');
    if (!currentCatId) return;

    const currentCat = categoriesList.find((c) => String(c._id) === currentCatId);
    if (!currentCat) return;

    const pId = currentCat.parentId?._id || currentCat.parentId;
    if (!pId) {
      // It's a Header Category
      setSelectedHeaderId(String(currentCat._id));
      setSelectedMainId('');
      setSelectedSubId('');
    } else {
      const parentCat = categoriesList.find((c) => String(c._id) === String(pId));
      const grandParentId = parentCat?.parentId?._id || parentCat?.parentId;
      if (grandParentId) {
        // It's a Sub Category
        setSelectedSubId(String(currentCat._id));
        setSelectedMainId(String(parentCat._id));
        setSelectedHeaderId(String(grandParentId));
      } else {
        // It's a Main Category
        setSelectedSubId('');
        setSelectedMainId(String(currentCat._id));
        setSelectedHeaderId(String(parentCat._id));
      }
    }
  }, [product, categoriesList]);

  // Auto-generate SKU helper
  const handleAutoGenerateSku = () => {
    const brandPrefix = (brandName || 'VNX').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newSku = `${brandPrefix}-${randomSuffix}`;
    setSku(newSku);
  };

  // Add custom specification
  const handleAddSpec = () => {
    if (!specKey.trim() || !specVal.trim()) return;
    setSpecifications((prev) => [...prev, { key: specKey.trim(), value: specVal.trim() }]);
    setSpecKey('');
    setSpecVal('');
  };

  const handleRemoveSpec = (index) => {
    setSpecifications((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick preset spec chip clicked
  const handleQuickSpecKey = (keyName) => {
    setSpecKey(keyName);
  };

  // Staging / Adding Images
  const handleStageFile = (file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setStagedImages((prev) => [...prev, { file, altText: imageAltText || name || 'Product image', previewUrl }]);
    setImageFile(null);
    setImageAltText('');
    const fileInput = document.getElementById('variant-file-input');
    if (fileInput) fileInput.value = '';
  };

  const handleAddImageUrl = (e) => {
    e.preventDefault();
    if (!imageUrlInput.trim()) return;
    setImagesList((prev) => [
      ...prev,
      {
        url: imageUrlInput.trim(),
        altText: imageAltText || name || 'Product image',
        sortOrder: prev.length,
      },
    ]);
    setImageUrlInput('');
    setImageAltText('');
  };

  const handleRemoveStagedImage = (index) => {
    setStagedImages((prev) => {
      const item = prev[index];
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemoveUrlImage = (index) => {
    setImagesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageDeleteConfirm = async () => {
    if (!imageDeleteTarget) return;
    setImageDeleteLoading(true);
    try {
      const res = await adminService.deleteProductImage(id, imageDeleteTarget.publicId);
      setProduct(res.data);
      setImagesList(res.data?.images || []);
      setToast({ message: 'Image removed from gallery', type: 'success' });
      setImageDeleteTarget(null);
    } catch (err) {
      console.error('Image delete error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to remove image', type: 'error' });
    } finally {
      setImageDeleteLoading(false);
    }
  };

  // Edit Mode immediate file upload
  const handleEditModeUpload = async (file) => {
    if (!file || isCreateMode) return;
    setImageUploading(true);
    try {
      const res = await adminService.uploadProductImage(id, file, imageAltText || name);
      setProduct(res.data);
      setImagesList(res.data?.images || []);
      setToast({ message: 'Image uploaded successfully!', type: 'success' });
      setImageFile(null);
      setImageAltText('');
      const fileInput = document.getElementById('variant-file-input');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Image upload error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to upload image', type: 'error' });
    } finally {
      setImageUploading(false);
    }
  };

  // Save and Publish Handler
  const handleSaveAndPublish = async () => {
    setFormError('');

    // 1. Validate General Info
    if (!name.trim()) {
      setFormError('Please enter a Product Title in the General Info card.');
      setActiveTab('general');
      return;
    }
    if (!sku.trim()) {
      setFormError('Please enter a Product Code (SKU) in the General Info card.');
      setActiveTab('general');
      return;
    }

    // 2. Validate Category Hierarchy
    // Remember user requirement: Sub category is strictly optional!
    const effectiveCategoryId = selectedSubId || selectedMainId;
    if (!effectiveCategoryId) {
      setFormError('Please select at least a Main Group and Specific Category in the Groups card.');
      setActiveTab('groups');
      return;
    }

    // 3. Validate Pricing
    const sPrice = Number(standardPrice);
    const dPrice = Number(dealerPrice);
    if (isNaN(sPrice) || sPrice < 0) {
      setFormError('Please enter a valid Standard Retail Price in Item Variants.');
      setActiveTab('variants');
      return;
    }
    if (isNaN(dPrice) || dPrice < 0) {
      setFormError('Please enter a valid Dealer Sale Price in Item Variants.');
      setActiveTab('variants');
      return;
    }

    setFormSubmitting(true);
    try {
      // Assemble structured specifications array
      const allSpecs = [];
      if (brandName.trim()) allSpecs.push({ key: 'Brand', value: brandName.trim() });
      if (modelNumber.trim()) allSpecs.push({ key: 'Model Number', value: modelNumber.trim() });
      if (warranty.trim()) allSpecs.push({ key: 'Warranty', value: warranty.trim() });
      if (countryOfOrigin.trim()) allSpecs.push({ key: 'Country of Origin', value: countryOfOrigin.trim() });
      if (hsnCode.trim()) allSpecs.push({ key: 'HSN Code', value: hsnCode.trim() });
      if (variantName.trim()) allSpecs.push({ key: 'Variant', value: variantName.trim() });
      if (stockQuantity.trim()) allSpecs.push({ key: 'Stock', value: stockQuantity.trim() });

      // Add highlights
      highlights.forEach((hl, i) => {
        if (hl.title && hl.title.trim()) {
          allSpecs.push({ key: `Highlight ${i + 1}`, value: hl.title.trim() });
        }
      });

      // Add custom specs
      specifications.forEach((sp) => {
        if (sp.key && sp.value) {
          allSpecs.push({ key: sp.key.trim(), value: sp.value.trim() });
        }
      });

      const payload = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        categoryId: effectiveCategoryId,
        description: description.trim() || undefined,
        standardPrice: sPrice,
        dealerPrice: dPrice,
        isFeatured: Boolean(isFeatured),
        isActive: status === 'published',
        specifications: allSpecs,
        images: imagesList.map((img, i) => ({
          url: img.url,
          altText: img.altText || name.trim(),
          sortOrder: i,
        })),
      };

      if (isCreateMode) {
        const res = await adminService.createProduct(payload);
        const newId = res.data?._id;

        // Upload any staged files
        if (newId && stagedImages.length > 0) {
          for (const staged of stagedImages) {
            try {
              await adminService.uploadProductImage(newId, staged.file, staged.altText || name);
            } catch (imgErr) {
              console.error('Staged image upload error:', imgErr);
            }
          }
        }

        setToast({ message: 'Product created and published successfully!', type: 'success' });
        setTimeout(() => {
          navigate('/admin/products');
        }, 800);
      } else {
        await adminService.updateProduct(id, payload);
        setToast({ message: 'Product updated and published successfully!', type: 'success' });
        setTimeout(() => {
          navigate('/admin/products');
        }, 800);
      }
    } catch (err) {
      console.error('Product save error:', err);
      setFormError(err.response?.data?.message || 'Failed to save product. Please check required fields.');
    } finally {
      setFormSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4">
        <SkeletonCard />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <SkeletonCard className="lg:col-span-4" />
          <SkeletonCard className="lg:col-span-8" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return <ErrorState title="Failed to load product" message={loadError} onRetry={loadProduct} />;
  }

  // Selected names for hierarchy preview banner
  const currentHeaderObj = headerCategories.find((h) => String(h._id) === String(selectedHeaderId));
  const currentMainObj = mainCategories.find((m) => String(m._id) === String(selectedMainId));
  const currentSubObj = subCategories.find((s) => String(s._id) === String(selectedSubId));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Top Bar with Navigation & Actions */}
      <div className="bg-white border border-[#f0e6e8] rounded-2xl p-4 md:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#800020] transition-colors bg-gray-50 hover:bg-[#fdf2f4] px-3 py-2 rounded-xl border border-gray-200"
          >
            <ArrowLeft className="w-4 h-4 text-[#800020]" />
            <span>Back to Products</span>
          </button>
          <div className="h-5 w-px bg-gray-200 hidden sm:block" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>{isCreateMode ? 'Add New Product' : 'Edit Product'}</span>
              {sku && <span className="text-xs font-bold text-[#800020] bg-[#fdf2f4] px-2 py-0.5 rounded-md">({sku})</span>}
            </h1>
            <p className="text-[11px] text-gray-500 font-medium">Configure product information card-by-card, then Save & Publish</p>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/products')}
            disabled={formSubmitting}
            className="border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold px-4 text-xs h-10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSaveAndPublish}
            isLoading={formSubmitting}
            leftIcon={<Save className="w-4 h-4" />}
            className="bg-[#800020] hover:bg-[#68001a] text-white font-bold px-6 text-xs h-10 shadow-sm"
          >
            Save & Publish
          </Button>
        </div>
      </div>

      {formError && <FormError message={formError} />}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Navigation Tabs & Status Card (3 cols) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Vertical Navigation Tabs */}
          <div className="bg-white border border-[#f0e6e8] rounded-2xl p-2.5 shadow-xs space-y-1.5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all text-xs font-bold ${
                    isActive
                      ? 'bg-[#fdf2f4] text-[#800020] border border-[#f5d6dc] shadow-xs'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      isActive ? 'bg-[#800020] text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs">{tab.label}</div>
                    <div className="text-[10px] text-gray-400 font-normal truncate">{tab.subtitle}</div>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-[#800020] shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Status & Visibility Card */}
          <div className="bg-white border border-[#f0e6e8] rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-[#800020] block mb-2">
                Status
              </label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full appearance-none bg-white border border-[#f0e6e8] rounded-xl px-4 py-2.5 text-xs font-bold text-[#800020] focus:outline-none focus:ring-2 focus:ring-[#800020]/20"
                >
                  <option value="published">PUBLISHED</option>
                  <option value="draft">DRAFT / INACTIVE</option>
                </select>
              </div>
              <p className="text-[10px] text-gray-500 mt-1.5">
                {status === 'published' ? 'Active in catalog and visible for order inquiries' : 'Hidden from public storefront'}
              </p>
            </div>

            <div className="pt-3 border-t border-[#f0e6e8]">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Featured Product
                </span>
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-[#800020]"
                />
              </label>
              <p className="text-[10px] text-gray-400 mt-1">Highlighted on homepage showcases</p>
            </div>
          </div>
        </div>

        {/* Right Column: Active Card Content (9 cols) */}
        <div className="lg:col-span-9">
          {/* TAB 1: GENERAL INFO */}
          {activeTab === 'general' && (
            <div className="bg-white border border-[#f0e6e8] rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#800020]" />
                  General Information
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Basic title, brand identity, and catalog identifiers</p>
              </div>

              {/* Product Title */}
              <FormField label="PRODUCT TITLE" required hint="Full official name of the product">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. ASUS ROG Strix G16 Gaming Laptop, Dahua 4K IP Bullet Camera..."
                  required
                  className="text-sm font-medium"
                />
              </FormField>

              {/* Description */}
              <FormField label="ABOUT THIS ITEM" hint="Provide detailed highlights, tech overview, and capabilities">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the item specifications, build material, features and overview here..."
                  rows={4}
                  className="text-sm"
                />
              </FormField>

              {/* Brand & SKU Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormField label="BRAND NAME" required hint="Choose popular brand or enter custom name">
                    <div className="space-y-2">
                      <Input
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="e.g. ASUS, HP, Dell, Hikvision, CP PLUS..."
                        required
                      />
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                        {POPULAR_BRANDS.slice(0, 12).map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setBrandName(b)}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                              brandName === b
                                ? 'bg-[#800020] text-white border-[#800020]'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-[#800020]/40'
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  </FormField>
                </div>

                <div>
                  <FormField label="PRODUCT CODE (SKU)" required hint="Unique inventory code">
                    <div className="flex gap-2">
                      <Input
                        value={sku}
                        onChange={(e) => setSku(e.target.value.toUpperCase())}
                        placeholder="e.g. ROG-G16-RXG20"
                        required
                        className="font-mono uppercase font-bold"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAutoGenerateSku}
                        className="text-[11px] font-bold shrink-0 border-gray-300"
                        title="Auto-generate SKU"
                      >
                        Auto-Code
                      </Button>
                    </div>
                  </FormField>
                </div>
              </div>

              {/* Hardware Spec Attributes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
                <FormField label="MODEL NUMBER">
                  <Input
                    value={modelNumber}
                    onChange={(e) => setModelNumber(e.target.value)}
                    placeholder="e.g. G614JU-N3193WS"
                  />
                </FormField>

                <FormField label="WARRANTY">
                  <Input
                    value={warranty}
                    onChange={(e) => setWarranty(e.target.value)}
                    placeholder="e.g. 1 Year Brand Warranty"
                  />
                </FormField>

                <FormField label="COUNTRY OF ORIGIN">
                  <Input
                    value={countryOfOrigin}
                    onChange={(e) => setCountryOfOrigin(e.target.value)}
                    placeholder="e.g. India, Taiwan, China"
                  />
                </FormField>

                <FormField label="HSN / TAX CODE">
                  <Input
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    placeholder="e.g. 84713010"
                  />
                </FormField>
              </div>

              {/* Bottom Nav Bar */}
              <div className="flex justify-end pt-4 border-t border-[#f0e6e8]">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setActiveTab('variants')}
                  className="bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold px-6"
                >
                  Next: Item Variants →
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: ITEM VARIANTS & PRICING */}
          {activeTab === 'variants' && (
            <div className="bg-white border border-[#f0e6e8] rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#800020]" />
                  Product Variants, Pricing & Media
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Set retail and wholesale dealer pricing, stock count, and upload product gallery photos.
                </p>
              </div>

              {/* Pricing Grid matching Image 2 */}
              <div className="bg-[#fdfbfb] p-4 rounded-xl border border-[#f0e6e8] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
                  <div className="md:col-span-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-700 block mb-1">
                      Variant Name
                    </label>
                    <Input
                      value={variantName}
                      onChange={(e) => setVariantName(e.target.value)}
                      placeholder="e.g. Standard Model, 16GB RAM"
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-700 block mb-1">
                      Regular Price (₹) *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={standardPrice}
                      onChange={(e) => setStandardPrice(e.target.value)}
                      placeholder="e.g. 50000"
                      required
                      className="text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-emerald-700 block mb-1">
                      Dealer Sale (₹) *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={dealerPrice}
                      onChange={(e) => setDealerPrice(e.target.value)}
                      placeholder="e.g. 42000"
                      required
                      className="text-xs font-extrabold text-emerald-700 bg-emerald-50/40 border-emerald-200"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-700 block mb-1">
                      Stock Count
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                      placeholder="e.g. 25"
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-700 block mb-1">
                      Product Code
                    </label>
                    <Input
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase())}
                      placeholder="SKU"
                      className="text-xs font-mono uppercase bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Media Images Upload Section matching Image 2 */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">
                      Variant Images (Max 5-8)
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Click an empty slot or browse file to upload image photos for this product.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="variant-file-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (isCreateMode) {
                          handleStageFile(file);
                        } else {
                          handleEditModeUpload(file);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('variant-file-input')?.click()}
                      isLoading={imageUploading}
                      leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                      className="text-xs border-gray-300 font-bold"
                    >
                      Browse Files
                    </Button>
                  </div>
                </div>

                {/* 5-slot visual image gallery matching screenshot */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {/* Existing/Staged Images */}
                  {[...imagesList, ...stagedImages].map((img, idx) => {
                    const src = img.previewUrl || img.url;
                    const isStaged = Boolean(img.file);
                    return (
                      <div
                        key={idx}
                        className="group relative rounded-xl border border-gray-200 bg-gray-50 overflow-hidden aspect-square flex items-center justify-center shadow-xs"
                      >
                        <img src={src} alt={img.altText || 'Product'} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-[#800020] text-white text-[9px] font-bold uppercase tracking-wider shadow-sm">
                            Primary
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (isStaged) {
                              const stagedIndex = stagedImages.findIndex((s) => s.previewUrl === img.previewUrl);
                              handleRemoveStagedImage(stagedIndex);
                            } else if (img.publicId) {
                              setImageDeleteTarget(img);
                            } else {
                              const urlIndex = imagesList.findIndex((u) => u.url === img.url);
                              handleRemoveUrlImage(urlIndex);
                            }
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          title="Remove Image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Empty Slot Placeholder Tiles (up to 5) */}
                  {Array.from({ length: Math.max(0, 5 - (imagesList.length + stagedImages.length)) }).map((_, slotIdx) => (
                    <button
                      key={slotIdx}
                      type="button"
                      onClick={() => document.getElementById('variant-file-input')?.click()}
                      className="rounded-xl border-2 border-dashed border-gray-300 hover:border-[#800020] hover:bg-[#fdf2f4]/30 transition-all aspect-square flex flex-col items-center justify-center p-3 text-center gap-1.5 group cursor-pointer"
                    >
                      <ImagePlus className="w-6 h-6 text-gray-400 group-hover:text-[#800020] transition-colors" />
                      <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#800020]">
                        Add Image
                      </span>
                    </button>
                  ))}
                </div>

                {/* Optional Image URL Input */}
                <form onSubmit={handleAddImageUrl} className="flex gap-2 pt-2">
                  <Input
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Or paste external image URL (e.g. https://images.unsplash.com/...)"
                    className="text-xs"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    isDisabled={!imageUrlInput.trim()}
                    leftIcon={<LinkIcon className="w-3.5 h-3.5" />}
                    className="shrink-0 text-xs border-gray-300"
                  >
                    Add URL
                  </Button>
                </form>
              </div>

              {/* Bottom Nav Bar */}
              <div className="flex justify-between pt-4 border-t border-[#f0e6e8]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('general')}
                  className="text-xs font-semibold"
                >
                  ← Back: General Info
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setActiveTab('groups')}
                  className="bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold px-6"
                >
                  Next: Groups →
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: GROUPS (Category Hierarchy) */}
          {activeTab === 'groups' && (
            <div className="bg-white border border-[#f0e6e8] rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-[#800020]" />
                  Category Hierarchy & Groups
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select the main parent category. Sub-category is strictly optional.
                </p>
              </div>

              {/* 3-tier selection matching Image 3 */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* MAIN GROUP (Header Category) */}
                  <FormField
                    label="MAIN GROUP *"
                    required
                    hint="Top-level parent category (e.g. Laptop, Desktop, Storage)"
                  >
                    <Select
                      value={selectedHeaderId}
                      onChange={(e) => {
                        setSelectedHeaderId(e.target.value);
                        setSelectedMainId('');
                        setSelectedSubId('');
                      }}
                      placeholder="Select Main Group"
                      options={headerCategories.map((h) => ({
                        value: h._id,
                        label: `${h.name} (Header)`,
                      }))}
                      required
                      className="font-semibold text-xs"
                    />
                  </FormField>

                  {/* SPECIFIC CATEGORY (Main Category) */}
                  <FormField
                    label="SPECIFIC CATEGORY *"
                    required
                    hint="Primary product classification under the Main Group"
                  >
                    <Select
                      value={selectedMainId}
                      onChange={(e) => {
                        setSelectedMainId(e.target.value);
                        setSelectedSubId('');
                      }}
                      placeholder={selectedHeaderId ? 'Select Category' : 'Select Main Group First'}
                      isDisabled={!selectedHeaderId || mainCategories.length === 0}
                      options={mainCategories.map((m) => ({
                        value: m._id,
                        label: m.name,
                      }))}
                      required
                      className="font-semibold text-xs"
                    />
                  </FormField>
                </div>

                {/* SUB-CATEGORY (OPTIONAL) */}
                <div className="pt-2">
                  <FormField
                    label="SUB-CATEGORY (OPTIONAL)"
                    hint="Optional sub-series (e.g. RXG 20, RXG 30, Ultrabooks). Leave unselected to assign directly to Main Category."
                  >
                    <Select
                      value={selectedSubId}
                      onChange={(e) => setSelectedSubId(e.target.value)}
                      placeholder={
                        !selectedMainId
                          ? 'Select Specific Category First'
                          : subCategories.length === 0
                          ? 'No sub-categories available (Product will belong directly to Main Category)'
                          : 'Select Sub-Category (Optional)'
                      }
                      isDisabled={!selectedMainId || subCategories.length === 0}
                      options={subCategories.map((s) => ({
                        value: s._id,
                        label: s.name,
                      }))}
                      className="text-xs font-semibold"
                    />
                  </FormField>
                </div>
              </div>

              {/* Hierarchy Confirmation Badge Banner */}
              <div className="p-4 rounded-xl bg-[#fdf2f4] border border-[#f5d6dc] space-y-1.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#800020] flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  Catalog Hierarchy Placement:
                </div>
                <div className="text-xs font-semibold text-gray-800 flex flex-wrap items-center gap-2">
                  {currentHeaderObj ? (
                    <>
                      <span className="px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-900 font-bold">
                        {currentHeaderObj.name}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      {currentMainObj ? (
                        <span className="px-2.5 py-1 rounded-md bg-white border border-gray-200 text-[#800020] font-bold">
                          {currentMainObj.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Select Category...</span>
                      )}
                      {currentSubObj && (
                        <>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                          <span className="px-2.5 py-1 rounded-md bg-[#800020] text-white font-bold">
                            {currentSubObj.name} (Sub-Category)
                          </span>
                        </>
                      )}
                      {!currentSubObj && currentMainObj && (
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          ✓ Direct assignment to Main Category (Sub-category omitted)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-500 text-xs italic">
                      Please select a Main Group and Specific Category to establish catalog placement.
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Nav Bar */}
              <div className="flex justify-between pt-4 border-t border-[#f0e6e8]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('variants')}
                  className="text-xs font-semibold"
                >
                  ← Back: Item Variants
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setActiveTab('highlights')}
                  className="bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold px-6"
                >
                  Next: Highlights →
                </Button>
              </div>
            </div>
          )}

          {/* TAB 4: HIGHLIGHTS & SPECIFICATIONS */}
          {activeTab === 'highlights' && (
            <div className="bg-white border border-[#f0e6e8] rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#800020]" />
                  Product Highlight Badges (4 Slots)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select icons and enter custom text labels to display product highlights on the product page.
                </p>
              </div>

              {/* 4 Highlight Slots Grid matching Image 4 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {highlights.map((hl, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-gray-200 bg-[#fdfbfb] hover:border-[#800020]/40 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-gray-700">
                        Highlight #{idx + 1}
                      </span>
                      <span className="p-1 rounded-md bg-[#fdf2f4] text-[#800020]">
                        <Sparkles className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {/* Preset Option Chips */}
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                        Select Icon / Preset
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {PRESET_HIGHLIGHT_OPTIONS.map((opt) => {
                          const OptIcon = opt.icon;
                          const isSelected = hl.title === opt.text;
                          return (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => {
                                const copy = [...highlights];
                                copy[idx] = { title: opt.text, iconName: opt.label };
                                setHighlights(copy);
                              }}
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-all ${
                                isSelected
                                  ? 'bg-[#800020] text-white border-[#800020]'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-[#800020]/40'
                              }`}
                            >
                              <OptIcon className="w-3 h-3" />
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Heading / Title Text Input */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        Heading / Title Text
                      </label>
                      <Input
                        value={hl.title}
                        onChange={(e) => {
                          const copy = [...highlights];
                          copy[idx].title = e.target.value;
                          setHighlights(copy);
                        }}
                        placeholder="e.g. 100% Genuine, 1 Year Warranty..."
                        className="text-xs font-semibold"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Detailed Technical Specifications Section */}
              <div className="pt-4 border-t border-[#f0e6e8] space-y-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    Additional Technical Specifications ({specifications.length})
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Add detailed hardware specs (Processor, RAM, Resolution, Ports, Power, etc.)
                  </p>
                </div>

                {/* Quick Spec Presets */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Quick Add:</span>
                  {['Processor', 'RAM', 'Storage', 'Graphics', 'Display', 'Resolution', 'Ports', 'Weight'].map(
                    (k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => handleQuickSpecKey(k)}
                        className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 hover:bg-[#800020] hover:text-white text-gray-700 rounded-md transition-colors"
                      >
                        + {k}
                      </button>
                    )
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={specKey}
                    onChange={(e) => setSpecKey(e.target.value)}
                    placeholder="Spec Key (e.g. Processor)"
                    className="text-xs"
                  />
                  <Input
                    value={specVal}
                    onChange={(e) => setSpecVal(e.target.value)}
                    placeholder="Value (e.g. Intel Core i7 13th Gen)"
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddSpec}
                    className="shrink-0 text-xs font-bold border-gray-300"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Spec
                  </Button>
                </div>

                {specifications.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {specifications.map((sp, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-[#fdfbfb] px-3 py-2 rounded-lg text-xs border border-gray-200"
                      >
                        <span className="font-semibold text-gray-500">
                          {sp.key}: <strong className="text-gray-900 font-bold">{sp.value}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSpec(idx)}
                          className="text-rose-600 hover:text-rose-800 p-1"
                          title="Remove Spec"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Nav Bar */}
              <div className="flex justify-between pt-4 border-t border-[#f0e6e8]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('groups')}
                  className="text-xs font-semibold"
                >
                  ← Back: Groups
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSaveAndPublish}
                  isLoading={formSubmitting}
                  leftIcon={<Save className="w-4 h-4" />}
                  className="bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold px-8 shadow-sm"
                >
                  Save & Publish Product
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Delete Confirm Dialog */}
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
