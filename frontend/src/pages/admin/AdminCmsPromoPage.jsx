import React, { useState, useEffect } from 'react';
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
import { Plus, Edit2, Trash2, Sparkles, Upload, ExternalLink, Calendar, Clock } from 'lucide-react';
import useWebsiteSettings from '../../hooks/useWebsiteSettings';

const AdminCmsPromoPage = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    link: '',
    startDate: '',
    endDate: '',
    sortOrder: 0,
    isActive: true,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Image Upload Modal State
  const [uploadPromoTarget, setUploadPromoTarget] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);

  // Popup Interval Settings State
  const { settings, refreshSettings } = useWebsiteSettings();
  const [popupInterval, setPopupInterval] = useState(15);
  const [popupEnabled, setPopupEnabled] = useState(true);
  const [savingPopupSettings, setSavingPopupSettings] = useState(false);

  useEffect(() => {
    if (settings) {
      if (settings.promoPopupIntervalMinutes !== undefined) {
        setPopupInterval(Number(settings.promoPopupIntervalMinutes) || 15);
      }
      if (settings.promoPopupEnabled !== undefined) {
        setPopupEnabled(settings.promoPopupEnabled !== false);
      }
    }
  }, [settings]);

  const handleSavePopupSettings = async () => {
    setSavingPopupSettings(true);
    try {
      const intervalVal = Math.max(1, Math.min(1440, Number(popupInterval) || 15));
      await adminService.updateWebsiteSettingsAdmin({
        promoPopupIntervalMinutes: intervalVal,
        promoPopupEnabled: popupEnabled,
      });
      await refreshSettings();
      setPopupInterval(intervalVal);
      setToast({ message: `Popup timing saved! Offer banners will show every ${intervalVal} minutes.`, type: 'success' });
    } catch (err) {
      console.error('Save popup settings error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to save popup settings', type: 'error' });
    } finally {
      setSavingPopupSettings(false);
    }
  };

  const fetchPromos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getPromoBannersAdmin();
      setPromos(res.data?.promotionalBanners || res.data || []);
    } catch (err) {
      console.error('Error fetching promo banners:', err);
      setError(err.response?.data?.message || 'Failed to load promotional banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleOpenCreate = () => {
    setEditingPromo(null);
    setFormData({
      title: '',
      link: '',
      startDate: '',
      endDate: '',
      sortOrder: 0,
      isActive: true,
    });
    setFormError('');
    setImageFile(null);
    setImagePreview('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (promo) => {
    setEditingPromo(promo);
    setFormData({
      title: promo.title || '',
      link: promo.link || '',
      startDate: promo.startDate ? new Date(promo.startDate).toISOString().substring(0, 10) : '',
      endDate: promo.endDate ? new Date(promo.endDate).toISOString().substring(0, 10) : '',
      sortOrder: promo.sortOrder || 0,
      isActive: promo.isActive !== undefined ? promo.isActive : true,
    });
    setFormError('');
    setImageFile(null);
    setImagePreview(promo.image?.url || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!editingPromo && !imageFile) {
      setFormError('Please choose a promotional banner image from your system.');
      return;
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        setFormError('End date cannot be earlier than start date');
        return;
      }
    }

    setFormSubmitting(true);
    setFormError('');
    let newlyUploadedPublicId = '';
    try {
      const payload = {
        title: formData.title.trim(),
        link: formData.link.trim() || undefined,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        sortOrder: Number(formData.sortOrder) || 0,
        isActive: formData.isActive,
      };

      if (editingPromo) {
        await adminService.updatePromoBannerAdmin(editingPromo._id, payload);
        if (imageFile) await adminService.uploadPromoBannerImageAdmin(editingPromo._id, imageFile);
        setToast({ message: 'Promotional banner updated!', type: 'success' });
      } else {
        const upload = await adminService.uploadCmsImage(imageFile, 'vinexus/promotional-banners');
        payload.image = { url: upload.data.url, publicId: upload.data.publicId };
        newlyUploadedPublicId = upload.data.publicId;
        await adminService.createPromoBannerAdmin(payload);
        setToast({ message: 'Promotional banner created!', type: 'success' });
      }

      setIsModalOpen(false);
      setImageFile(null);
      setImagePreview('');
      fetchPromos();
    } catch (err) {
      if (!editingPromo && newlyUploadedPublicId) {
        await adminService.deleteStoredImage(newlyUploadedPublicId).catch(() => {});
      }
      console.error('Save promo banner error:', err);
      setFormError(err.response?.data?.message || 'Failed to save promotional banner');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleImageUploadSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile || !uploadPromoTarget) return;

    if (imageFile.size > 5 * 1024 * 1024) {
      setToast({ message: 'File size exceeds 5MB limit', type: 'error' });
      return;
    }

    setImageUploading(true);
    try {
      await adminService.uploadPromoBannerImageAdmin(uploadPromoTarget._id, imageFile);
      setToast({ message: 'Promo banner image uploaded!', type: 'success' });
      setUploadPromoTarget(null);
      setImageFile(null);
      fetchPromos();
    } catch (err) {
      console.error('Upload promo image error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to upload image', type: 'error' });
    } finally {
      setImageUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminService.deletePromoBannerAdmin(deleteTarget._id);
      setToast({ message: 'Promotional banner deleted!', type: 'success' });
      setDeleteTarget(null);
      fetchPromos();
    } catch (err) {
      console.error('Delete promo error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to delete promo banner', type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <AdminPageHeader
        title="CMS — Promotional Banner Cards"
        subtitle="Manage seasonal offer cards, promo strips, countdown banners & active campaign dates"
        badge={`${promos.length} Promo Cards`}
        action={
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Promo Banner
          </Button>
        }
      />

      {/* Homepage Offer Popup Interval Settings Card */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Homepage Offer Banner Popup
              </h3>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                popupEnabled ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
              }`}>
                {popupEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When visitors open the homepage, active promotional offer cards popup directly in the center with a blurred background. Configure how frequently the popup recurs for each visitor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none bg-muted/40 hover:bg-muted/70 px-3 py-2 rounded-xl border border-border transition-colors">
              <input
                type="checkbox"
                checked={popupEnabled}
                onChange={(e) => setPopupEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary accent-[#800020] cursor-pointer"
              />
              <span>Enable Popup</span>
            </label>

            <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3.5 py-1.5">
              <label htmlFor="popupIntervalInput" className="text-xs font-semibold text-foreground whitespace-nowrap">
                Repeat Every:
              </label>
              <input
                id="popupIntervalInput"
                type="number"
                min="1"
                max="1440"
                value={popupInterval}
                disabled={!popupEnabled}
                onChange={(e) => setPopupInterval(e.target.value)}
                className="w-16 h-8 text-center text-xs font-bold bg-background border border-border rounded-lg focus:border-primary focus:outline-none disabled:opacity-50"
              />
              <span className="text-xs text-muted-foreground font-medium">Minutes</span>
            </div>

            <Button
              variant="primary"
              size="sm"
              disabled={savingPopupSettings}
              onClick={handleSavePopupSettings}
              className="shrink-0"
            >
              {savingPopupSettings ? 'Saving...' : 'Save Timing'}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => <Skeleton key={n} className="h-20 rounded-lg bg-muted" />)}
        </div>
      ) : error ? (
        <ErrorState title="Failed to load promo banners" message={error} onRetry={fetchPromos} />
      ) : promos.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No promotional banners configured"
          description="Create offer banners to highlight seasonal deals across the storefront."
          action={
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-1.5" /> Create Promo Card
            </Button>
          }
        />
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>Order</Table.Head>
              <Table.Head>Preview</Table.Head>
              <Table.Head>Title</Table.Head>
              <Table.Head>Target Link</Table.Head>
              <Table.Head>Campaign Duration</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head className="text-right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {promos.map((p) => {
              const startStr = p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : 'Immediate';
              const endStr = p.endDate ? new Date(p.endDate).toLocaleDateString('en-IN') : 'No Expiry';

              return (
                <Table.Row key={p._id}>
                  <Table.Cell className="font-mono text-xs text-muted-foreground font-bold">#{p.sortOrder || 0}</Table.Cell>
                  <Table.Cell>
                    <div className="w-20 h-10 rounded-lg border border-border bg-card overflow-hidden">
                      {p.image?.url
                        ? <img src={p.image.url} alt={p.title} className="w-full h-full object-cover" />
                        : <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No image</span>}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-xs font-bold text-foreground">{p.title}</Table.Cell>
                  <Table.Cell className="font-mono text-[11px] text-muted-foreground">
                    {p.link ? (
                      <a href={p.link} target="_blank" rel="noopener noreferrer" className="hover:text-primary inline-flex items-center gap-1">
                        {p.link} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : 'N/A'}
                  </Table.Cell>
                  <Table.Cell className="text-xs text-muted-foreground">
                    {startStr} &rarr; {endStr}
                  </Table.Cell>
                  <Table.Cell><StatusBadge status={p.isActive ? 'active' : 'inactive'} /></Table.Cell>
                  <Table.Cell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onClick={() => setUploadPromoTarget(p)}
                        title="Upload Image"
                        className="bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-600 text-blue-700 dark:text-blue-300 hover:text-white border border-blue-200 dark:border-blue-800/60 transition-all shadow-xs"
                      >
                        <Upload className="w-4 h-4 shrink-0" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onClick={() => handleOpenEdit(p)}
                        title="Edit Promo"
                        className="bg-muted/80 hover:bg-primary/20 text-foreground hover:text-primary border border-border hover:border-primary/40 transition-all shadow-xs"
                      >
                        <Edit2 className="w-4 h-4 shrink-0" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onClick={() => setDeleteTarget(p)}
                        title="Delete Promo"
                        className="bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 dark:hover:bg-rose-600 text-rose-700 dark:text-rose-300 hover:text-white dark:hover:text-white border border-rose-200 dark:border-rose-800/60 transition-all shadow-xs"
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
      )}

      {/* Add / Edit Promo Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPromo ? 'Edit Promo Banner' : 'Create Promo Banner'}>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <FormError message={formError} />

          <FormField label="Campaign Title" required>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Festival Wholesale Discount Offer"
              required
            />
          </FormField>

          <FormField label={editingPromo ? 'Replace Promo Image (Optional)' : 'Promo Image'} required={!editingPromo} hint="Choose JPEG, PNG or WebP; max 5MB">
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setImageFile(file);
                setImagePreview(file ? URL.createObjectURL(file) : (editingPromo?.image?.url || ''));
              }}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-muted file:text-foreground"
              required={!editingPromo}
            />
            {imagePreview && <img src={imagePreview} alt="Promotional banner preview" className="mt-3 h-28 w-full rounded-lg border border-border object-cover" />}
          </FormField>

          <FormField label="Target URL Link">
            <Input
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              placeholder="e.g. /security/cctv/nvrs"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Campaign Start Date">
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </FormField>

            <FormField label="Campaign End Date">
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Sort Position Order">
              <Input
                type="number"
                min="0"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
              />
            </FormField>

            <FormField label="Status">
              <Select
                value={formData.isActive ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                options={[
                  { value: 'true', label: 'Active Card' },
                  { value: 'false', label: 'Hidden / Inactive' },
                ]}
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={formSubmitting}>
              {editingPromo ? 'Save Changes' : 'Create Banner'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Image Upload Modal */}
      <Modal isOpen={!!uploadPromoTarget} onClose={() => setUploadPromoTarget(null)} title="Upload Promo Banner Image">
        <form onSubmit={handleImageUploadSubmit} className="space-y-4">
          <FormField label="Select Image File (JPEG, PNG, WebP)" required hint="Recommended 600x200px resolution, max 5MB">
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-muted file:text-foreground hover:file:bg-[#ebd5da] cursor-pointer"
              required
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setUploadPromoTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={imageUploading} disabled={!imageFile}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Image
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Promotional Banner"
        message={`Are you sure you want to delete promo banner "${deleteTarget?.title || ''}"?`}
        confirmText="Delete Banner"
        isLoading={deleteLoading}
        variant="danger"
      />
    </div>
  );
};

export default AdminCmsPromoPage;
