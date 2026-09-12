import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Table from '../../components/ui/Table';
import Drawer from '../../components/ui/Drawer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import FormField from '../../components/ui/FormField';
import FormError from '../../components/ui/FormError';
import StatusBadge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import { Plus, Edit2, Trash2, FileText, ExternalLink, ShieldCheck } from 'lucide-react';

const AdminCmsPagesPage = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    content: '',
    isPublished: true,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);

  const fetchPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getCmsPagesAdmin();
      setPages(res.data?.pages || res.data || []);
    } catch (err) {
      console.error('Error fetching static CMS pages:', err);
      setError(err.response?.data?.message || 'Failed to load static pages list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleOpenCreate = () => {
    setEditingPage(null);
    setFormData({
      slug: '',
      title: '',
      content: '',
      isPublished: true,
    });
    setFormError('');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (page) => {
    setEditingPage(page);
    setFormData({
      slug: page.slug || '',
      title: page.title || '',
      content: page.content || '',
      isPublished: page.isPublished !== undefined ? page.isPublished : true,
    });
    setFormError('');
    setIsDrawerOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.slug.trim() || !formData.title.trim() || !formData.content.trim()) {
      setFormError('Slug, Title, and Page Content are required');
      return;
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(formData.slug.trim().toLowerCase())) {
      setFormError('Slug can only contain lowercase alphanumeric characters and hyphens');
      return;
    }

    // Client-side XSS validation preview check
    const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    const inlineJsRegex = /on\w+\s*=/gi;
    if (scriptRegex.test(formData.content) || inlineJsRegex.test(formData.content)) {
      setFormError('Page content contains unsafe script tags or inline JavaScript event handlers');
      return;
    }

    setFormSubmitting(true);
    setFormError('');
    try {
      const payload = {
        slug: formData.slug.trim().toLowerCase(),
        title: formData.title.trim(),
        content: formData.content.trim(),
        isPublished: formData.isPublished,
      };

      if (editingPage) {
        await adminService.updateCmsPageAdmin(editingPage._id, payload);
        setToast({ message: 'Static page updated successfully!', type: 'success' });
      } else {
        await adminService.createCmsPageAdmin(payload);
        setToast({ message: 'Static page created successfully!', type: 'success' });
      }

      setIsDrawerOpen(false);
      fetchPages();
    } catch (err) {
      console.error('Save page error:', err);
      setFormError(err.response?.data?.message || 'Failed to save static page');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminService.deleteCmsPageAdmin(deleteTarget._id);
      setToast({ message: 'Static CMS page deleted!', type: 'success' });
      setDeleteTarget(null);
      fetchPages();
    } catch (err) {
      console.error('Delete page error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to delete page', type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <AdminPageHeader
        title="CMS — Static Pages Content Editor"
        subtitle="Manage dynamic website pages, terms & conditions, privacy policies, and about us content"
        badge={`${pages.length} Pages`}
        action={
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create New Page
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => <Skeleton key={n} className="h-16 rounded-lg" />)}
        </div>
      ) : error ? (
        <ErrorState title="Failed to load static pages" message={error} onRetry={fetchPages} />
      ) : pages.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No static pages created"
          description="Create your first static content page (e.g. Terms of Service, Privacy Policy, About Us)."
          action={
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-1.5" /> Create Page
            </Button>
          }
        />
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>URL Slug</Table.Head>
              <Table.Head>Page Title</Table.Head>
              <Table.Head>Published Status</Table.Head>
              <Table.Head>Last Updated</Table.Head>
              <Table.Head className="text-right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {pages.map((p) => (
              <Table.Row key={p._id}>
                <Table.Cell className="font-mono text-xs text-rose-400 font-bold">
                  /content/pages/{p.slug}
                </Table.Cell>
                <Table.Cell className="text-xs font-bold text-foreground">
                  {p.title}
                </Table.Cell>
                <Table.Cell>
                  <StatusBadge status={p.isPublished ? 'active' : 'inactive'} />
                </Table.Cell>
                <Table.Cell className="text-xs text-muted-foreground">
                  {new Date(p.updatedAt || p.createdAt).toLocaleDateString('en-IN')}
                </Table.Cell>
                <Table.Cell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/content/pages/${p.slug}`} target="_blank">
                      <Button variant="secondary" size="sm" className="text-xs" title="Preview Public Page">
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Preview
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => handleOpenEdit(p)}
                      title="Edit Page"
                      className="bg-muted/80 hover:bg-primary/20 text-foreground hover:text-primary border border-border hover:border-primary/40 transition-all shadow-xs"
                    >
                      <Edit2 className="w-4 h-4 shrink-0" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => setDeleteTarget(p)}
                      title="Delete Page"
                      className="bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 dark:hover:bg-rose-600 text-rose-700 dark:text-rose-300 hover:text-white dark:hover:text-white border border-rose-200 dark:border-rose-800/60 transition-all shadow-xs"
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

      {/* Create / Edit Page Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingPage ? `Edit Static Page: /${editingPage.slug}` : 'Create New Static Page'}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <FormError message={formError} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="URL Slug" required hint="Lowercase letters, numbers, and hyphens only">
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                placeholder="e.g. terms-and-conditions"
                required
              />
            </FormField>

            <FormField label="Page Title" required>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Terms & Conditions"
                required
              />
            </FormField>
          </div>

          <FormField label="Page Content (Markdown / HTML)" required hint="Unsafe script tags are strictly prohibited">
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter page content paragraphs, headings, policy clauses..."
              rows={12}
              required
              className="font-mono text-xs"
            />
          </FormField>

          <FormField label="Publish Status">
            <Select
              value={formData.isPublished ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, isPublished: e.target.value === 'true' })}
              options={[
                { value: 'true', label: 'Published (Publicly Visible)' },
                { value: 'false', label: 'Draft / Unpublished' },
              ]}
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={formSubmitting}>
              {editingPage ? 'Update Page' : 'Publish Page'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Static Page"
        message={`Are you sure you want to delete static CMS page "${deleteTarget?.title}" (/content/pages/${deleteTarget?.slug})?`}
        confirmText="Delete Page"
        isLoading={deleteLoading}
        variant="danger"
      />
    </div>
  );
};

export default AdminCmsPagesPage;
