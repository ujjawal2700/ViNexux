import React, { useState, useEffect, useRef } from 'react';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import FormField from '../../components/ui/FormField';
import FormError from '../../components/ui/FormError';
import StatusBadge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import {
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Upload,
  ExternalLink,
  Monitor,
  Tablet,
  Smartphone,
  CheckCircle2,
  Crop,
  Info,
} from 'lucide-react';

/**
 * Standard Home Hero Banner Specifications
 * 1920 x 512 px (Ultra-wide 15:4 Aspect Ratio)
 */
const BANNER_SPEC = {
  width: 1920,
  height: 512,
  aspectRatio: 1920 / 512, // 3.75 : 1
  label: '1920 × 512 px (15:4 Ratio)',
};

/**
 * High-quality HTML5 Canvas auto-cropper that fits any image into the exact 1920x512 banner ratio
 */
const autoCropImageFile = (file, cropPosition = 'center') => {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const targetW = BANNER_SPEC.width;
      const targetH = BANNER_SPEC.height;
      const targetRatio = BANNER_SPEC.aspectRatio;
      const srcRatio = img.width / img.height;

      let srcX = 0;
      let srcY = 0;
      let srcW = img.width;
      let srcH = img.height;

      // Crop calculation based on aspect ratio difference
      if (srcRatio > targetRatio) {
        // Image is wider than 15:4 -> crop sides
        srcW = img.height * targetRatio;
        if (cropPosition === 'center') {
          srcX = (img.width - srcW) / 2;
        } else if (cropPosition === 'right' || cropPosition === 'bottom') {
          srcX = img.width - srcW;
        } else {
          srcX = 0;
        }
      } else {
        // Image is taller than 15:4 -> crop top/bottom
        srcH = img.width / targetRatio;
        if (cropPosition === 'center') {
          srcY = (img.height - srcH) / 2;
        } else if (cropPosition === 'bottom') {
          srcY = img.height - srcH;
        } else {
          srcY = 0;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            resolve({
              file,
              previewUrl: objectUrl,
              wasCropped: false,
              origW: img.width,
              origH: img.height,
            });
            return;
          }
          const croppedName = file.name.replace(/\.[^.]+$/, '') + '-vinexus-banner.webp';
          const croppedFile = new File([blob], croppedName, { type: 'image/webp' });
          const previewUrl = canvas.toDataURL('image/webp', 0.92);
          resolve({
            file: croppedFile,
            previewUrl,
            wasCropped: Math.abs(srcRatio - targetRatio) > 0.03,
            origW: img.width,
            origH: img.height,
          });
        },
        'image/webp',
        0.92
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to process image file.'));
    };
    img.src = objectUrl;
  });
};

const AdminCmsBannersPage = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    link: '',
    buttonText: 'Explore Range',
    isActive: true,
    sortOrder: 0,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Image & Cropper State
  const [rawImageFile, setRawImageFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [cropPosition, setCropPosition] = useState('center'); // 'center' | 'top' | 'bottom'
  const [wasCropped, setWasCropped] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'

  // Quick Image Upload Modal State
  const [uploadBannerTarget, setUploadBannerTarget] = useState(null);
  const [quickRawImageFile, setQuickRawImageFile] = useState(null);
  const [quickImageFile, setQuickImageFile] = useState(null);
  const [quickImagePreview, setQuickImagePreview] = useState('');
  const [quickCropPosition, setQuickCropPosition] = useState('center');
  const [quickWasCropped, setQuickWasCropped] = useState(false);
  const [quickDevice, setQuickDevice] = useState('desktop');
  const [imageUploading, setImageUploading] = useState(false);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);

  const fetchBanners = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getBannersAdmin();
      setBanners(res.data?.banners || res.data || []);
    } catch (err) {
      console.error('Error fetching admin banners:', err);
      setError(err.response?.data?.message || 'Failed to load hero banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleOpenCreate = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      subtitle: '',
      link: '',
      buttonText: 'Explore Range',
      isActive: true,
      sortOrder: 0,
    });
    setFormError('');
    setRawImageFile(null);
    setImageFile(null);
    setImagePreview('');
    setWasCropped(false);
    setCropPosition('center');
    setOriginalDimensions(null);
    setPreviewDevice('desktop');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      link: banner.link || '',
      buttonText: banner.buttonText || 'Explore Range',
      isActive: banner.isActive !== undefined ? banner.isActive : true,
      sortOrder: banner.sortOrder || 0,
    });
    setFormError('');
    setRawImageFile(null);
    setImageFile(null);
    setImagePreview(banner.image?.url || '');
    setWasCropped(false);
    setCropPosition('center');
    setOriginalDimensions(null);
    setPreviewDevice('desktop');
    setIsModalOpen(true);
  };

  // Process image selection with Auto-Crop
  const handleFileSelect = async (file, position = 'center') => {
    if (!file) return;
    try {
      setRawImageFile(file);
      const result = await autoCropImageFile(file, position);
      if (result) {
        setImageFile(result.file);
        setImagePreview(result.previewUrl);
        setWasCropped(result.wasCropped);
        setOriginalDimensions({ width: result.origW, height: result.origH });
        if (formError) setFormError('');
      }
    } catch (err) {
      console.error('Auto crop error:', err);
      setToast({ message: 'Could not process image for auto-crop.', type: 'error' });
    }
  };

  // Re-crop when user changes alignment
  const handleCropPositionChange = async (newPosition) => {
    setCropPosition(newPosition);
    if (rawImageFile) {
      await handleFileSelect(rawImageFile, newPosition);
    }
  };

  const handleFormSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingBanner && !imageFile) {
      setFormError('Please select a banner image from your device.');
      setToast({ message: 'Please select a banner image.', type: 'error' });
      return;
    }

    setFormSubmitting(true);
    setFormError('');
    let newlyUploadedPublicId = '';
    try {
      const payload = {
        title: formData.title.trim() || undefined,
        subtitle: formData.subtitle.trim() || undefined,
        link: formData.link.trim() || undefined,
        buttonText: formData.buttonText.trim() || undefined,
        isActive: formData.isActive,
        sortOrder: Number(formData.sortOrder) || 0,
      };

      if (editingBanner) {
        await adminService.updateBannerAdmin(editingBanner._id, payload);
        if (imageFile) {
          await adminService.uploadBannerImageAdmin(editingBanner._id, imageFile);
        }
        setToast({ message: 'Hero banner updated successfully!', type: 'success' });
      } else {
        const upload = await adminService.uploadCmsImage(imageFile, 'vinexus/banners');
        payload.image = { url: upload.data.url, publicId: upload.data.publicId };
        newlyUploadedPublicId = upload.data.publicId;
        await adminService.createBannerAdmin(payload);
        setToast({ message: 'Hero banner created and published!', type: 'success' });
      }

      setIsModalOpen(false);
      setRawImageFile(null);
      setImageFile(null);
      setImagePreview('');
      fetchBanners();
    } catch (err) {
      if (!editingBanner && newlyUploadedPublicId) {
        await adminService.deleteStoredImage(newlyUploadedPublicId).catch(() => {});
      }
      console.error('Save banner error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save hero banner';
      setFormError(msg);
      setToast({ message: msg, type: 'error' });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Quick Upload file selection with auto-crop
  const handleQuickFileSelect = async (file, position = 'center') => {
    if (!file) return;
    try {
      setQuickRawImageFile(file);
      const result = await autoCropImageFile(file, position);
      if (result) {
        setQuickImageFile(result.file);
        setQuickImagePreview(result.previewUrl);
        setQuickWasCropped(result.wasCropped);
      }
    } catch (err) {
      console.error('Quick auto-crop error:', err);
    }
  };

  const handleQuickCropPositionChange = async (newPos) => {
    setQuickCropPosition(newPos);
    if (quickRawImageFile) {
      await handleQuickFileSelect(quickRawImageFile, newPos);
    }
  };

  const handleImageUploadSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!quickImageFile || !uploadBannerTarget) return;

    setImageUploading(true);
    try {
      await adminService.uploadBannerImageAdmin(uploadBannerTarget._id, quickImageFile);
      setToast({ message: 'Banner image updated successfully!', type: 'success' });
      setUploadBannerTarget(null);
      setQuickRawImageFile(null);
      setQuickImageFile(null);
      setQuickImagePreview('');
      fetchBanners();
    } catch (err) {
      console.error('Banner image upload error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to upload image', type: 'error' });
    } finally {
      setImageUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminService.deleteBannerAdmin(deleteTarget._id);
      setToast({ message: 'Hero banner deleted!', type: 'success' });
      setDeleteTarget(null);
      fetchBanners();
    } catch (err) {
      console.error('Delete banner error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to delete banner', type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <AdminPageHeader
        title="CMS — Hero Banners Carousel"
        subtitle="Manage homepage top hero slides, background banners, call-to-action buttons & position ordering"
        badge={`${banners.length} Active Slides`}
        action={
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Banner Slide
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => <Skeleton key={n} className="h-20 rounded-lg bg-muted" />)}
        </div>
      ) : error ? (
        <ErrorState title="Failed to load hero banners" message={error} onRetry={fetchBanners} />
      ) : banners.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No hero banners configured"
          description="Create your first hero slide to showcase featured camera products on the homepage."
          action={
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-1.5" /> Create Hero Banner
            </Button>
          }
        />
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>Order</Table.Head>
              <Table.Head>Image Preview</Table.Head>
              <Table.Head>Title &amp; Subtitle</Table.Head>
              <Table.Head>Target Link</Table.Head>
              <Table.Head>Button Text</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head className="text-right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {banners.map((b) => (
              <Table.Row key={b._id}>
                <Table.Cell className="font-mono text-xs text-muted-foreground font-bold">
                  #{b.sortOrder || 0}
                </Table.Cell>
                <Table.Cell>
                  <div className="w-28 h-12 rounded-lg border border-border bg-card overflow-hidden">
                    {b.image?.url ? (
                      <img src={b.image.url} alt={b.title || 'Banner'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                        No image
                      </span>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="text-xs font-bold text-foreground">{b.title || 'Untitled Slide'}</div>
                  {b.subtitle && <div className="text-[10px] text-muted-foreground truncate max-w-xs">{b.subtitle}</div>}
                </Table.Cell>
                <Table.Cell className="font-mono text-[11px] text-muted-foreground">
                  {b.link ? (
                    <a href={b.link} target="_blank" rel="noopener noreferrer" className="hover:text-primary inline-flex items-center gap-1">
                      {b.link} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    'N/A'
                  )}
                </Table.Cell>
                <Table.Cell className="text-xs font-semibold text-foreground">
                  {b.buttonText || 'Explore'}
                </Table.Cell>
                <Table.Cell>
                  <StatusBadge status={b.isActive ? 'active' : 'inactive'} />
                </Table.Cell>
                <Table.Cell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => {
                        setUploadBannerTarget(b);
                        setQuickRawImageFile(null);
                        setQuickImageFile(null);
                        setQuickImagePreview(b.image?.url || '');
                        setQuickWasCropped(false);
                      }}
                      title="Replace Image (with Auto-Crop)"
                      className="bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 transition-all shadow-xs"
                    >
                      <Upload className="w-4 h-4 shrink-0" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => handleOpenEdit(b)}
                      title="Edit Banner Details"
                      className="bg-muted/80 hover:bg-primary/20 text-foreground hover:text-primary border border-border hover:border-primary/40 transition-all shadow-xs"
                    >
                      <Edit2 className="w-4 h-4 shrink-0" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => setDeleteTarget(b)}
                      title="Delete Banner"
                      className="bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 transition-all shadow-xs"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {/* Add / Edit Banner Modal Dialog */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBanner ? 'Edit Hero Banner' : 'Create New Hero Banner Slide'}
        size="xl"
        className="max-w-4xl"
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
              {editingBanner ? 'Save Banner Changes' : 'Publish Banner Slide'}
            </Button>
          </div>
        }
      >
        <form noValidate onSubmit={handleFormSubmit} className="space-y-4 pt-1">
          <FormError message={formError} />

          {/* Banner Specifications Card */}
          <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/80 border border-blue-200/80 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-blue-950">
                <ImageIcon className="w-4 h-4 text-blue-700" />
                <span>Hero Banner Specifications &amp; Auto-Crop</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Auto-Crop Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-white/90 p-2.5 rounded-xl border border-blue-100/80 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Required Resolution</span>
                <span className="text-sm font-black text-gray-900">{BANNER_SPEC.label}</span>
                <span className="text-[10px] text-gray-500 block">Desktop full-width standard</span>
              </div>
              <div className="bg-white/90 p-2.5 rounded-xl border border-blue-100/80 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Supported Formats</span>
                <span className="text-sm font-black text-gray-900">WebP, PNG, JPG</span>
                <span className="text-[10px] text-gray-500 block">Up to 5 MB file size</span>
              </div>
              <div className="bg-white/90 p-2.5 rounded-xl border border-blue-100/80 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Safe Content Zone</span>
                <span className="text-sm font-black text-gray-900">Center 60% Focus</span>
                <span className="text-[10px] text-gray-500 block">Never clipped on mobile / tablet</span>
              </div>
            </div>

            <p className="text-[11px] text-blue-900 leading-normal flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 text-blue-600 shrink-0" />
              <span>
                Upload any image from your computer. If the image is not 15:4, our built-in cropper will <strong>automatically crop and center it to 1920 × 512 px</strong> before uploading!
              </span>
            </p>
          </div>

          {/* Image Input & Crop Alignment */}
          <div className="p-4 bg-card border border-border rounded-2xl space-y-3">
            <FormField
              label={editingBanner ? 'Replace Slide Image (Optional)' : 'Select Banner Image'}
              required={!editingBanner}
              helperText="Select a high-resolution banner artwork or photo."
            >
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
                className="block w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-800 hover:file:bg-gray-200 cursor-pointer"
                required={!editingBanner}
              />
            </FormField>

            {/* Crop adjustment controls when image selected */}
            {imageFile && wasCropped && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs">
                <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                  <Crop className="w-3.5 h-3.5 text-amber-700" />
                  <span>
                    Auto-cropped from {originalDimensions?.width}×{originalDimensions?.height}px to <strong>1920 × 512 px</strong>. Choose focus:
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {['center', 'top', 'bottom'].map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => handleCropPositionChange(pos)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                        cropPosition === pos
                          ? 'bg-[#800020] text-white shadow-2xs'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Multi-Device Preview Switcher */}
            {imagePreview && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-[#800020]" />
                    Live Multi-Device Banner Preview
                  </span>

                  {/* Device tabs */}
                  <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        previewDevice === 'desktop'
                          ? 'bg-white text-[#800020] shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>Desktop (15:4)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('tablet')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        previewDevice === 'tablet'
                          ? 'bg-white text-[#800020] shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Tablet className="w-3.5 h-3.5" />
                      <span>Tablet (21:9)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        previewDevice === 'mobile'
                          ? 'bg-white text-[#800020] shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Mobile (16:9)</span>
                    </button>
                  </div>
                </div>

                {/* Device Frame Preview matching exact HeroBannerSlider proportions */}
                <div className="p-3 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-200">
                  <div
                    className={`w-full transition-all duration-300 ${
                      previewDevice === 'desktop'
                        ? 'max-w-full aspect-[15/4]'
                        : previewDevice === 'tablet'
                        ? 'max-w-[560px] aspect-[21/9]'
                        : 'max-w-[280px] aspect-[16/9]'
                    } relative rounded-xl overflow-hidden border border-gray-400/40 shadow-md bg-black`}
                  >
                    <img
                      src={imagePreview}
                      alt="Banner Preview"
                      className="w-full h-full object-cover object-center"
                    />

                    {/* Simulated live content matching the unobscured storefront banner */}
                    {(formData.title || formData.subtitle || formData.buttonText) && (
                      <div className="absolute inset-0 flex flex-col justify-center px-4 sm:px-6 text-white space-y-1">
                        {formData.title && (
                          <h4 className="text-xs sm:text-base md:text-lg font-black tracking-tight line-clamp-1 [text-shadow:0_2px_8px_rgba(0,0,0,0.9)]">
                            {formData.title}
                          </h4>
                        )}
                        {formData.subtitle && (
                          <p className="self-start rounded bg-black/30 px-1.5 py-0.5 text-[10px] sm:text-xs text-white line-clamp-1 backdrop-blur-[1px]">
                            {formData.subtitle}
                          </p>
                        )}
                        {formData.buttonText && (
                          <div className="pt-1">
                            <span className="inline-block px-2.5 py-0.5 rounded bg-[#800020] text-white text-[10px] font-bold shadow-xs">
                              {formData.buttonText}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Slide Headline / Title (Optional)" helperText="Main bold title overlay.">
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Next-Gen 4K CCTV Security Cameras"
              />
            </FormField>

            <FormField label="Subtitle / Tagline (Optional)" helperText="Secondary description line.">
              <Input
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="e.g. Color night vision with on-site warranty"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Destination Click Link (Optional)" helperText="URL opened when shopper clicks this banner.">
              <Input
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="e.g. /security/cctv or /products"
              />
            </FormField>

            <FormField label="Action Button Label" helperText="Text inside the call-to-action button.">
              <Input
                value={formData.buttonText}
                onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                placeholder="e.g. Explore Range"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Sort Position Order" helperText="Lower numbers appear first in the carousel.">
              <Input
                type="number"
                min="0"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
              />
            </FormField>

            <FormField label="Slide Visibility" helperText="Control whether this banner appears in the homepage carousel.">
              <Select
                value={formData.isActive ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                options={[
                  { value: 'true', label: 'Active (Visible on Homepage)' },
                  { value: 'false', label: 'Hidden / Inactive' },
                ]}
              />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* Quick Image Upload Modal (with Auto-Crop & Multi-Device Preview) */}
      <Modal
        isOpen={!!uploadBannerTarget}
        onClose={() => setUploadBannerTarget(null)}
        title={`Replace Slide Image: ${uploadBannerTarget?.title || 'Slide'}`}
        size="xl"
        className="max-w-3xl"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="outline" type="button" onClick={() => setUploadBannerTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleImageUploadSubmit}
              isLoading={imageUploading}
              disabled={!quickImageFile}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Upload &amp; Replace Image
            </Button>
          </div>
        }
      >
        <form noValidate onSubmit={handleImageUploadSubmit} className="space-y-4 pt-1">
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Standard Size: 1920 × 512 px (15:4 Ratio)</span>
            </div>
            <p>
              Choose any image file. It will automatically crop to the exact standard 1920 × 512 ratio.
            </p>
          </div>

          <FormField label="Select New Image" required helperText="JPEG, PNG, or WebP up to 5MB.">
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => handleQuickFileSelect(e.target.files?.[0])}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-800 hover:file:bg-gray-200 cursor-pointer"
              required
            />
          </FormField>

          {quickImageFile && quickWasCropped && (
            <div className="flex items-center justify-between gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs">
              <span className="text-amber-900 font-medium">Crop Alignment:</span>
              <div className="flex items-center gap-1">
                {['center', 'top', 'bottom'].map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => handleQuickCropPositionChange(pos)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${
                      quickCropPosition === pos
                        ? 'bg-[#800020] text-white'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          )}

          {quickImagePreview && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Device Preview</span>
                <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
                  <button
                    type="button"
                    onClick={() => setQuickDevice('desktop')}
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded ${
                      quickDevice === 'desktop' ? 'bg-white text-[#800020]' : 'text-gray-500'
                    }`}
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDevice('tablet')}
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded ${
                      quickDevice === 'tablet' ? 'bg-white text-[#800020]' : 'text-gray-500'
                    }`}
                  >
                    Tablet
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDevice('mobile')}
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded ${
                      quickDevice === 'mobile' ? 'bg-white text-[#800020]' : 'text-gray-500'
                    }`}
                  >
                    Mobile
                  </button>
                </div>
              </div>

              <div className="p-3 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
                <div
                  className={`w-full ${
                    quickDevice === 'desktop'
                      ? 'max-w-full aspect-[15/4]'
                      : quickDevice === 'tablet'
                      ? 'max-w-[480px] aspect-[21/9]'
                      : 'max-w-[260px] aspect-[16/9]'
                  } relative rounded-xl overflow-hidden border border-gray-400/40 shadow-sm bg-black`}
                >
                  <img src={quickImagePreview} alt="Preview" className="w-full h-full object-cover object-center" />
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Hero Banner"
        message={`Are you sure you want to delete hero banner slide "${deleteTarget?.title || 'Untitled'}"?`}
        confirmText="Delete Slide"
        isLoading={deleteLoading}
        variant="danger"
      />
    </div>
  );
};

export default AdminCmsBannersPage;
