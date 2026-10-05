import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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
import StatusBadge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import { Plus, Edit2, Trash2, FileText, ExternalLink, Eye, Code } from 'lucide-react';

const legalPathForSlug = (slug) => {
  const s = (slug || '').toLowerCase().trim();
  if (s === 'privacy-policy' || s === 'privacy') return '/privacy';
  if (s === 'terms-and-conditions' || s === 'terms') return '/terms';
  return null;
};

const PRIVACY_DEFAULT_HTML = `<h2>Who we are and what this covers</h2>
<p>Vinexus - Lead Generation &amp; Product Catalog Platform operates this online product catalogue, customer accounts, dealer registration and product enquiry service. This notice explains how we handle personal information you give us or that is generated while using the website. For privacy questions or requests, contact us through our official email and phone numbers.</p>

<h2>Information we collect and why</h2>
<ul>
  <li><strong>Account and verification:</strong> name, email address, mobile number, date of birth if you provide it, and OTP verification status to create an account, verify access, send order updates and prevent misuse.</li>
  <li><strong>Dealer verification:</strong> business or company name, organisation type, GSTIN, PAN, MSME number, mobile &amp; WhatsApp numbers, business address, and uploaded verification documents to review dealer eligibility and manage wholesale pricing.</li>
  <li><strong>Shopping and enquiries:</strong> cart items, saved delivery addresses, product enquiries, and requested quotations to answer customer questions and fulfil confirmed orders.</li>
  <li><strong>Technical and security records:</strong> IP address, device/browser information, and secure authentication tokens to keep customer accounts safe and troubleshoot technical issues.</li>
</ul>

<h2>Browser storage and cookies</h2>
<p>Authentication tokens, session expiry, cart contents, and storage preferences are saved in your browser so requested features work smoothly. We do not use third-party advertising tracking cookies.</p>

<h2>Your choices and data protection</h2>
<p>You can update your account information in your profile, change cookie preferences, or contact our support team to request correction or removal of your personal information.</p>`;

const TERMS_DEFAULT_HTML = `<h2>Using Vinexus</h2>
<p>These terms apply to your use of the Vinexus website, product catalogue, user accounts, dealer registration, shopping carts, and enquiry submissions. By using our website, you agree to these terms.</p>

<h2>Accounts and dealer applications</h2>
<p>Please keep your account access credentials confidential. Dealer verification and trade pricing require valid business documentation (GSTIN, PAN, trade license). We reserve the right to review and reject unverified dealer applications.</p>

<h2>Products, prices and enquiries</h2>
<p>Product descriptions, specifications, availability, and prices are provided for shopping and enquiry purposes and may change. Adding an item to a cart or submitting an enquiry connects you with our sales team to finalize exact stock allocation, GST invoices, and delivery timeline.</p>

<h2>Delivery, warranty and returns</h2>
<p>Delivery timeframes and manufacturer warranties depend on the confirmed invoice and product specifications. Please verify product compatibility before finalizing purchases.</p>

<h2>Customer Support</h2>
<p>For questions or assistance regarding your orders or account, reach out to our team via our official email, phone, or WhatsApp helpline.</p>`;

const LEGAL_PAGE_DEFAULTS = [
  {
    _id: null,
    _isPlaceholder: true,
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    content: PRIVACY_DEFAULT_HTML,
    isPublished: true,
  },
  {
    _id: null,
    _isPlaceholder: true,
    slug: 'terms-and-conditions',
    title: 'Terms & Conditions',
    content: TERMS_DEFAULT_HTML,
    isPublished: true,
  },
];

const AdminCmsPagesPage = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' | 'preview'
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    content: '',
    isPublished: true,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const titleInputRef = useRef(null);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);

  const fetchPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getCmsPagesAdmin({ limit: 100 });
      const loadedPages = res.data?.pages || res.data || [];
      const missingLegalPages = LEGAL_PAGE_DEFAULTS.filter(
        (legalPage) =>
          !loadedPages.some(
            (page) =>
              page.slug === legalPage.slug ||
              (legalPage.slug === 'privacy-policy' && page.slug === 'privacy') ||
              (legalPage.slug === 'terms-and-conditions' && page.slug === 'terms')
          )
      );
      setPages([...loadedPages, ...missingLegalPages]);
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
    setActiveTab('edit');
    setFormData({
      slug: '',
      title: '',
      content: '',
      isPublished: true,
    });
    setFormError('');
    setIsModalOpen(true);
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 120);
  };

  const handleOpenEdit = (page) => {
    setEditingPage(page);
    setActiveTab('edit');
    setFormData({
      slug: page.slug || '',
      title: page.title || '',
      content: page.content || (page.slug === 'privacy-policy' ? PRIVACY_DEFAULT_HTML : page.slug === 'terms-and-conditions' ? TERMS_DEFAULT_HTML : ''),
      isPublished: page.isPublished !== undefined ? page.isPublished : true,
    });
    setFormError('');
    setIsModalOpen(true);
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 120);
  };

  const handleFormSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Page Title is required');
      setToast({ message: 'Page Title is required', type: 'error' });
      setActiveTab('edit');
      return;
    }
    if (!formData.slug.trim()) {
      setFormError('URL Slug is required');
      setToast({ message: 'URL Slug is required', type: 'error' });
      setActiveTab('edit');
      return;
    }
    if (!formData.content.trim()) {
      setFormError('Page Content is required');
      setToast({ message: 'Page Content is required', type: 'error' });
      setActiveTab('edit');
      return;
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(formData.slug.trim().toLowerCase())) {
      setFormError('Slug can only contain lowercase alphanumeric characters and hyphens (e.g. privacy-policy)');
      setActiveTab('edit');
      return;
    }

    // Client-side XSS check
    const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    const inlineJsRegex = /on\w+\s*=/gi;
    if (scriptRegex.test(formData.content) || inlineJsRegex.test(formData.content)) {
      setFormError('Page content contains unsafe script tags or inline JavaScript event handlers');
      setActiveTab('edit');
      return;
    }

    setFormSubmitting(true);
    setFormError('');
    try {
      const payload = {
        slug: formData.slug.trim().toLowerCase(),
        title: formData.title.trim(),
        content: formData.content.trim(),
        isPublished: Boolean(formData.isPublished),
      };

      if (editingPage?._id) {
        await adminService.updateCmsPageAdmin(editingPage._id, payload);
        setToast({ message: `"${payload.title}" updated and published successfully!`, type: 'success' });
      } else {
        await adminService.createCmsPageAdmin(payload);
        setToast({ message: `"${payload.title}" created and published successfully!`, type: 'success' });
      }

      setIsModalOpen(false);
      fetchPages();
    } catch (err) {
      console.error('Save page error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save static page';
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
        subtitle="Manage website pages, including the public Privacy Policy and Terms & Conditions."
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
          description="Create your first static content page, such as About Us."
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
              <Table.Head>URL Slug / Path</Table.Head>
              <Table.Head>Page Title</Table.Head>
              <Table.Head>Published Status</Table.Head>
              <Table.Head>Last Updated</Table.Head>
              <Table.Head className="text-right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {pages.map((p) => {
              const livePath = legalPathForSlug(p.slug) || `/content/pages/${p.slug}`;
              return (
                <Table.Row key={p._id || p.slug}>
                  <Table.Cell className="font-mono text-xs text-[#800020] font-bold">
                    {livePath}
                  </Table.Cell>
                  <Table.Cell className="text-xs font-bold text-foreground">
                    {p.title}
                  </Table.Cell>
                  <Table.Cell>
                    {p._isPlaceholder ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                        Default Template (Click Edit to Publish)
                      </span>
                    ) : (
                      <StatusBadge status={p.isPublished ? 'active' : 'inactive'} />
                    )}
                  </Table.Cell>
                  <Table.Cell className="text-xs text-muted-foreground">
                    {p.updatedAt || p.createdAt ? new Date(p.updatedAt || p.createdAt).toLocaleDateString('en-IN') : 'Default'}
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={livePath} target="_blank">
                        <Button variant="secondary" size="sm" className="text-xs" title="Preview Public Page">
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> View Live
                        </Button>
                      </Link>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenEdit(p)}
                        title="Edit Page"
                        className="text-xs font-semibold"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        {p._isPlaceholder ? 'Configure & Publish' : 'Edit'}
                      </Button>
                      {!legalPathForSlug(p.slug) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          onClick={() => setDeleteTarget(p)}
                          title="Delete Page"
                          className="bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 transition-all shadow-xs"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      )}

      {/* Create / Edit Page Modal Dialog */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPage?._id ? `Edit Static Page: /${formData.slug}` : (editingPage?._isPlaceholder ? `Configure & Publish: ${formData.title}` : 'Create New Static Page')}
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
              {editingPage?._id ? 'Update & Save Changes' : 'Publish Page to Website'}
            </Button>
          </div>
        }
      >
        <form noValidate onSubmit={handleFormSubmit} className="space-y-4 pt-1">
          <FormError message={formError} />

          {editingPage?._isPlaceholder && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              <strong>Professional Template Loaded:</strong> The standard legal document for <strong>{formData.title}</strong> is pre-filled below. You can review or customize any clauses, then click <strong>&quot;Publish Page to Website&quot;</strong> to make it live instantly.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Page Title" required helperText="The primary heading shown at the top of the page.">
              <input
                ref={titleInputRef}
                type="text"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (formError) setFormError('');
                }}
                placeholder="e.g. Privacy Policy, Terms & Conditions, About Us"
                className="w-full bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground/70 transition-all"
                required
              />
            </FormField>

            <FormField
              label="URL Web Address (Slug)"
              required
              helperText="The web link path (e.g. privacy-policy, terms-and-conditions)."
            >
              <Input
                value={formData.slug}
                onChange={(e) => {
                  setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') });
                  if (formError) setFormError('');
                }}
                placeholder="e.g. privacy-policy, terms-and-conditions"
                required
              />
            </FormField>
          </div>

          {/* Edit vs Preview Tab Toggle */}
          <div className="flex items-center justify-between border-b border-border pb-2 pt-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Page Content &amp; Formatting
            </label>
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/30">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'edit'
                    ? 'bg-white text-[#800020] shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Edit HTML / Text</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white text-[#800020] shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Page Preview</span>
              </button>
            </div>
          </div>

          {activeTab === 'edit' ? (
            <FormField
              label="Content Body"
              helperText="Use HTML headings (<h2>, <h3>), paragraphs (<p>), and lists (<ul>, <li>) for clean formatting."
            >
              <Textarea
                value={formData.content}
                onChange={(e) => {
                  setFormData({ ...formData, content: e.target.value });
                  if (formError) setFormError('');
                }}
                placeholder="Enter page paragraphs, clauses, and sections..."
                rows={14}
                required
                className="font-mono text-xs leading-relaxed"
              />
            </FormField>
          ) : (
            <div className="border border-border rounded-xl p-5 bg-white min-h-[300px] max-h-[460px] overflow-y-auto">
              <article
                className="prose max-w-none space-y-4 text-sm leading-7 text-gray-700 sm:text-base [&>h2]:text-xl [&>h2]:font-bold [&>h2]:text-[#800020] [&>h3]:text-lg [&>h3]:font-semibold [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 [&_a]:text-[#800020] [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.content || '<p class="text-gray-400 italic">No content entered yet.</p>') }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <FormField
              label="Website Visibility"
              helperText="Published pages can be viewed by customers. Draft pages are hidden."
            >
              <Select
                value={formData.isPublished ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.value === 'true' })}
                options={[
                  { value: 'true', label: 'Published (Publicly Visible on Website)' },
                  { value: 'false', label: 'Draft (Hidden from Public)' },
                ]}
              />
            </FormField>
          </div>
        </form>
      </Modal>

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
