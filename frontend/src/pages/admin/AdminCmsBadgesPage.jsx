import React, { useState, useEffect } from 'react';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { StatusBadge } from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import FormField from '../../components/ui/FormField';
import FormError from '../../components/ui/FormError';

/**
 * AdminCmsBadgesPage Component
 * Route: /admin/cms/trust-badges
 * Manages trust badges (icons, title, description, display order, active status).
 */
const AdminCmsBadgesPage = () => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State for Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sortOrder: 0,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Modal State for Image Upload
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedBadgeForUpload, setSelectedBadgeForUpload] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Confirm Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBadge, setDeletingBadge] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getTrustBadgesAdmin();
      const items = res?.data || res || [];
      setBadges(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Error fetching trust badges:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load trust badges.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingBadge(null);
    setFormData({
      title: '',
      description: '',
      sortOrder: badges.length > 0 ? badges.length + 1 : 1,
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (badge) => {
    setEditingBadge(badge);
    setFormData({
      title: badge.title || '',
      description: badge.description || '',
      sortOrder: badge.sortOrder !== undefined ? badge.sortOrder : 0,
      isActive: badge.isActive !== undefined ? badge.isActive : true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Title is required.';
    }
    if (formData.sortOrder === '' || isNaN(Number(formData.sortOrder))) {
      errors.sortOrder = 'Sort order must be a valid number.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveBadge = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        sortOrder: Number(formData.sortOrder),
        isActive: Boolean(formData.isActive),
      };

      if (editingBadge) {
        await adminService.updateTrustBadgeAdmin(editingBadge._id, payload);
      } else {
        await adminService.createTrustBadgeAdmin(payload);
      }
      setIsModalOpen(false);
      fetchBadges();
    } catch (err) {
      console.error('Error saving trust badge:', err);
      setFormErrors({ submit: err.response?.data?.message || err.message || 'Failed to save trust badge.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Image Upload Handlers
  const handleOpenUploadModal = (badge) => {
    setSelectedBadgeForUpload(badge);
    setSelectedFile(null);
    setUploadError('');
    setUploadModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit.');
      setSelectedFile(null);
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid image type. Please select JPEG, PNG, WEBP, or SVG.');
      setSelectedFile(null);
      return;
    }

    setUploadError('');
    setSelectedFile(file);
  };

  const handleUploadIcon = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedBadgeForUpload) return;

    try {
      setUploading(true);
      setUploadError('');
      await adminService.uploadTrustBadgeIconAdmin(selectedBadgeForUpload._id, selectedFile);
      setUploadModalOpen(false);
      fetchBadges();
    } catch (err) {
      console.error('Error uploading icon:', err);
      setUploadError(err.response?.data?.message || err.message || 'Failed to upload icon.');
    } finally {
      setUploading(false);
    }
  };

  // Delete Handlers
  const handleOpenDeleteDialog = (badge) => {
    setDeletingBadge(badge);
    setDeleteDialogOpen(true);
  };

  const handleDeleteBadge = async () => {
    if (!deletingBadge) return;
    try {
      setDeleting(true);
      await adminService.deleteTrustBadgeAdmin(deletingBadge._id);
      setDeleteDialogOpen(false);
      fetchBadges();
    } catch (err) {
      console.error('Error deleting badge:', err);
      alert(err.response?.data?.message || 'Failed to delete trust badge.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Trust Badges CMS"
        description="Manage home page trust features, assurances, icon images, and display priority."
        actionLabel="Add Trust Badge"
        onAction={handleOpenCreateModal}
      />

      {loading ? (
        <Card className="p-6">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-16 w-full mb-2" />
          <Skeleton className="h-16 w-full mb-2" />
          <Skeleton className="h-16 w-full" />
        </Card>
      ) : error ? (
        <ErrorState
          title="Unable to load trust badges"
          message={error}
          onRetry={fetchBadges}
        />
      ) : badges.length === 0 ? (
        <EmptyState
          title="No trust badges found"
          description="Create your first trust badge to highlight key benefits and guarantee icons."
          actionText="Add Trust Badge"
          onAction={handleOpenCreateModal}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Icon</th>
                  <th className="py-3 px-4">Title & Description</th>
                  <th className="py-3 px-4">Sort Order</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {badges.map((badge) => {
                  const iconUrl = badge.iconUrl || badge.icon || badge.imageUrl || badge.image;
                  return (
                    <tr key={badge._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden relative group">
                          {iconUrl ? (
                            <img
                              src={iconUrl}
                              alt={badge.title}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">No Icon</span>
                          )}
                          <button
                            onClick={() => handleOpenUploadModal(badge)}
                            className="absolute inset-0 bg-black/60 text-white text-[10px] font-semibold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Upload/Change Icon"
                          >
                            Upload
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{badge.title}</div>
                        {badge.description && (
                          <div className="text-xs text-gray-500 line-clamp-1 max-w-xs">{badge.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          #{badge.sortOrder !== undefined ? badge.sortOrder : 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={badge.isActive ? 'active' : 'inactive'} />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenUploadModal(badge)}
                        >
                          Icon
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEditModal(badge)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleOpenDeleteDialog(badge)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingBadge ? 'Edit Trust Badge' : 'Add Trust Badge'}
      >
        <form onSubmit={handleSaveBadge} className="space-y-4">
          {formErrors.submit && <FormError message={formErrors.submit} />}

          <FormField label="Title *" error={formErrors.title}>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Free Fast Shipping"
            />
          </FormField>

          <FormField label="Description">
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. On all wholesale bulk orders above $500"
              rows={2}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Sort Order *" error={formErrors.sortOrder}>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                placeholder="1"
              />
            </FormField>

            <FormField label="Status">
              <label className="flex items-center space-x-3 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-wine-600 focus:ring-wine-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Active / Published</span>
              </label>
            </FormField>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingBadge ? 'Update Badge' : 'Create Badge'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Icon Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => !uploading && setUploadModalOpen(false)}
        title={`Upload Icon for "${selectedBadgeForUpload?.title || ''}"`}
      >
        <form onSubmit={handleUploadIcon} className="space-y-4">
          {uploadError && <FormError message={uploadError} />}

          <FormField label="Select Icon Image (Max 5MB: JPEG, PNG, WEBP, SVG)">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-wine-50 file:text-wine-700 hover:file:bg-wine-100"
            />
          </FormField>

          {selectedFile && (
            <div className="p-3 bg-gray-50 rounded border border-gray-200 text-xs text-gray-600">
              <span className="font-semibold">Selected:</span> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadModalOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={uploading}
              disabled={!selectedFile || uploading}
            >
              Upload Icon
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteBadge}
        title="Delete Trust Badge"
        message={`Are you sure you want to delete "${deletingBadge?.title || ''}"? This action cannot be undone.`}
        confirmText="Delete Badge"
        cancelText="Cancel"
        loading={deleting}
      />
    </div>
  );
};

export default AdminCmsBadgesPage;
