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
import StatusBadge, { Badge } from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import Image from '../../components/ui/Image';
import { Plus, Edit2, Trash2, Image as ImageIcon, Upload, ExternalLink } from 'lucide-react';

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
    buttonText: '',
    isActive: true,
    sortOrder: 0,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Image Upload Modal State
  const [uploadBannerTarget, setUploadBannerTarget] = useState(null);
  const [imageFile, setImageFile] = useState(null);
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
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');
    try {
      const payload = {
        title: formData.title.trim() || undefined,
        subtitle: formData.subtitle.trim() || undefined,
        link: formData.link.trim() || undefined,
        buttonText: formData.buttonText.trim() || undefined,
        isActive: formData.isActive,
        sortOrder: Number(formData.sortOrder) || 0,
      };

      if (!editingBanner) {
        payload.image = { url: 'https://via.placeholder.com/1200x400?text=Vinexus+Banner' };
      }

      if (editingBanner) {
        await adminService.updateBannerAdmin(editingBanner._id, payload);
        setToast({ message: 'Hero banner updated successfully!', type: 'success' });
      } else {
        await adminService.createBannerAdmin(payload);
        setToast({ message: 'Hero banner created successfully!', type: 'success' });
      }

      setIsModalOpen(false);
      fetchBanners();
    } catch (err) {
      console.error('Save banner error:', err);
      setFormError(err.response?.data?.message || 'Failed to save hero banner');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleImageUploadSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile || !uploadBannerTarget) return;

    if (imageFile.size > 5 * 1024 * 1024) {
      setToast({ message: 'File size exceeds 5MB limit', type: 'error' });
      return;
    }

    setImageUploading(true);
    try {
      await adminService.uploadBannerImageAdmin(uploadBannerTarget._id, imageFile);
      setToast({ message: 'Banner image uploaded successfully!', type: 'success' });
      setUploadBannerTarget(null);
      setImageFile(null);
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
              <Table.Head>Title & Subtitle</Table.Head>
              <Table.Head>Target Link</Table.Head>
              <Table.Head>Button Text</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head className="text-right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {banners.map((b) => (
              <Table.Row key={b._id}>
                <Table.Cell className="font-mono text-xs text-muted-foreground font-bold">#{b.sortOrder || 0}</Table.Cell>
                <Table.Cell>
                  <div className="w-24 h-12 rounded-lg border border-border bg-card overflow-hidden">
                    <img src={b.image?.url || 'https://via.placeholder.com/300x150'} alt={b.title || 'Banner'} className="w-full h-full object-cover" />
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
                  ) : 'N/A'}
                </Table.Cell>
                <Table.Cell className="text-xs font-semibold text-foreground">{b.buttonText || 'Explore'}</Table.Cell>
                <Table.Cell><StatusBadge status={b.isActive ? 'active' : 'inactive'} /></Table.Cell>
                <Table.Cell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadBannerTarget(b)}
                      title="Upload Image"
                      className="h-8 w-8 p-0 text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(b)}
                      title="Edit Banner"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(b)}
                      title="Delete Banner"
                      className="h-8 w-8 p-0 text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {/* Add / Edit Banner Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingBanner ? 'Edit Hero Banner' : 'Create Hero Banner'}>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <FormError message={formError} />

          <FormField label="Slide Title">
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Next-Gen TrueView CCTV Cameras"
            />
          </FormField>

          <FormField label="Subtitle / Tagline">
            <Input
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder="e.g. High resolution 4MP night vision surveillance..."
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Target URL Link">
              <Input
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="e.g. /products?category=cctv"
              />
            </FormField>

            <FormField label="Button Text">
              <Input
                value={formData.buttonText}
                onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                placeholder="e.g. Explore Range"
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
                  { value: 'true', label: 'Active Slide' },
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
              {editingBanner ? 'Save Changes' : 'Create Banner'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Image Upload Modal */}
      <Modal isOpen={!!uploadBannerTarget} onClose={() => setUploadBannerTarget(null)} title="Upload Banner Slide Image">
        <form onSubmit={handleImageUploadSubmit} className="space-y-4">
          <FormField label="Select Banner Image (JPEG, PNG, WebP)" required hint="Recommended 1200x400px resolution, max 5MB">
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-muted file:text-foreground hover:file:bg-[#ebd5da] cursor-pointer"
              required
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setUploadBannerTarget(null)}>
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
