import React, { useState, useEffect } from 'react';
import adminService from '../../services/adminService';
import { uploadService } from '../../services/uploadService';
import useToast from '../../hooks/useToast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { StatusBadge } from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import FormField from '../../components/ui/FormField';
import FormError from '../../components/ui/FormError';
import { UploadCloud, X, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react';

/**
 * AdminCmsFooterPage Component
 * Route: /admin/cms/footer-content
 * Single configuration editor for corporate footer info, quick links, and legal links.
 */
const AdminCmsFooterPage = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [uploadingSocialIndex, setUploadingSocialIndex] = useState(null);

  const [formData, setFormData] = useState({
    companyName: '',
    companyDescription: '',
    email: '',
    phone: '',
    whatsappNumber: '8769959424',
    whatsappMessageNote: 'Please confirm live stock availability, delivery timeline & share official GST commercial invoice.',
    address: '',
    mapUrl: '',
    aboutHeading: 'About',
    quickLinksHeading: 'Information',
    legalLinksHeading: 'Legal',
    contactHeading: 'Contact Us',
    quickLinks: [],
    legalLinks: [],
    socialLinks: [],
    copyrightText: '© {year} {company}. All Rights Reserved.',
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState({});

  const fetchFooterContent = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage('');
      const res = await adminService.getFooterContentAdmin();
      const data = res?.data?.footer || res?.footer || res?.data || res || {};

      setFormData({
        companyName: data.companyName || '',
        companyDescription: data.companyDescription || '',
        email: data.email || '',
        phone: data.phone || '',
        whatsappNumber: data.whatsappNumber || '8769959424',
        whatsappMessageNote: data.whatsappMessageNote || 'Please confirm live stock availability, delivery timeline & share official GST commercial invoice.',
        address: data.address || '',
        mapUrl: data.mapUrl || '',
        aboutHeading: data.aboutHeading || 'About',
        quickLinksHeading: data.quickLinksHeading || 'Information',
        legalLinksHeading: data.legalLinksHeading || 'Legal',
        contactHeading: data.contactHeading || 'Contact Us',
        quickLinks: [
          ...(Array.isArray(data.quickLinks) ? data.quickLinks.map((link) => ({ label: link.label || '', url: link.url || '' })) : []),
          ...(Array.isArray(data.legalLinks) ? data.legalLinks.map((link) => ({ label: link.label || '', url: link.url || '' })) : []),
        ],
        legalLinks: [],
        socialLinks: Array.isArray(data.socialLinks)
          ? data.socialLinks.map((link) => ({
              label: link.label || '',
              url: link.url || '',
              iconUrl: link.iconUrl || '',
            }))
          : [],
        copyrightText: data.copyrightText || '© {year} {company}. All Rights Reserved.',
        isActive: data.isActive !== undefined ? data.isActive : true,
      });
    } catch (err) {
      console.error('Error fetching footer content:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load footer content.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFooterContent();
  }, []);

  // Array item handlers for Quick Links
  const handleQuickLinkChange = (index, field, value) => {
    const updated = [...formData.quickLinks];
    updated[index][field] = value;
    setFormData({ ...formData, quickLinks: updated });
  };

  const handleAddQuickLink = () => {
    setFormData({
      ...formData,
      quickLinks: [...formData.quickLinks, { label: '', url: '' }],
    });
  };

  const handleRemoveQuickLink = (index) => {
    const updated = formData.quickLinks.filter((_, i) => i !== index);
    setFormData({ ...formData, quickLinks: updated });
  };

  // (Legal links merged into quickLinks)

  const handleSocialLinkChange = (index, field, value) => {
    const updated = [...formData.socialLinks];
    updated[index][field] = value;
    setFormData({ ...formData, socialLinks: updated });
  };

  const handleAddSocialLink = () => setFormData({
    ...formData,
    socialLinks: [...formData.socialLinks, { label: '', url: '', iconUrl: '' }],
  });

  const handleRemoveSocialLink = (index) => setFormData({
    ...formData,
    socialLinks: formData.socialLinks.filter((_, i) => i !== index),
  });

  const handleUploadSocialIcon = async (index, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WEBP, SVG).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo file size must be less than 2MB.');
      return;
    }

    try {
      setUploadingSocialIndex(index);
      const res = await uploadService.uploadImage(file, 'vinexus/social');
      if (res.success && res.data?.url) {
        handleSocialLinkChange(index, 'iconUrl', res.data.url);
        toast.success('Social logo uploaded successfully!');
      } else {
        toast.error(res.message || 'Failed to upload logo.');
      }
    } catch (err) {
      console.error('Error uploading social logo:', err);
      toast.error(err.response?.data?.message || 'Error uploading social logo.');
    } finally {
      setUploadingSocialIndex(null);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    // Validate links format if provided
    const qLinkErrors = [];
    formData.quickLinks.forEach((link, idx) => {
      if ((link.label && !link.url) || (!link.label && link.url)) {
        qLinkErrors.push(`Quick link #${idx + 1} requires both a Label and a URL.`);
      }
    });
    if (qLinkErrors.length > 0) {
      errors.quickLinks = qLinkErrors.join(' ');
    }

    // legalLinks merged into quickLinks — validation handled above

    const socialErrors = [];
    formData.socialLinks.forEach((link, idx) => {
      if ((link.label && !link.url) || (!link.label && link.url)) socialErrors.push(`Social link #${idx + 1} requires both a Label and a URL.`);
    });
    if (socialErrors.length) errors.socialLinks = socialErrors.join(' ');

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    if (!validateForm()) {
      toast.error('Please resolve form errors before saving.');
      return;
    }

    try {
      setSaving(true);
      // Clean empty links before submitting
      const cleanedQuickLinks = formData.quickLinks
        .filter((l) => l.label.trim() && l.url.trim())
        .map((l, index) => ({ label: l.label.trim(), url: l.url.trim(), sortOrder: index }));

      const cleanedLegalLinks = []; // merged into quickLinks

      const cleanedSocialLinks = formData.socialLinks
        .filter((l) => l.label.trim() && l.url.trim())
        .map((l, index) => ({
          label: l.label.trim(),
          url: l.url.trim(),
          iconUrl: (l.iconUrl || '').trim(),
          sortOrder: index,
        }));

      const payload = {
        companyName: formData.companyName.trim(),
        companyDescription: formData.companyDescription.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        whatsappNumber: formData.whatsappNumber ? formData.whatsappNumber.trim() : '8769959424',
        whatsappMessageNote: formData.whatsappMessageNote ? formData.whatsappMessageNote.trim() : '',
        address: formData.address.trim(),
        mapUrl: formData.mapUrl.trim(),
        aboutHeading: formData.aboutHeading.trim(),
        quickLinksHeading: formData.quickLinksHeading.trim(),
        legalLinksHeading: formData.legalLinksHeading.trim(),
        contactHeading: formData.contactHeading.trim(),
        quickLinks: cleanedQuickLinks,
        legalLinks: cleanedLegalLinks,
        socialLinks: cleanedSocialLinks,
        copyrightText: formData.copyrightText.trim(),
        isActive: Boolean(formData.isActive),
      };

      const res = await adminService.updateFooterContentAdmin(payload);
      setSuccessMessage('Footer configuration saved successfully!');
      toast.success('Footer configuration saved successfully!');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 4500);

      // Update state with returned payload or cleaned local data
      const updated = res?.data?.footer || res?.footer || res?.data || payload;
      setFormData({
        companyName: updated.companyName || '',
        companyDescription: updated.companyDescription || '',
        email: updated.email || '',
        phone: updated.phone || '',
        whatsappNumber: updated.whatsappNumber || '8769959424',
        whatsappMessageNote: updated.whatsappMessageNote || 'Please confirm live stock availability, delivery timeline & share official GST commercial invoice.',
        address: updated.address || '',
        mapUrl: updated.mapUrl || '',
        aboutHeading: updated.aboutHeading || 'About',
        quickLinksHeading: updated.quickLinksHeading || 'Information',
        legalLinksHeading: updated.legalLinksHeading || 'Legal',
        contactHeading: updated.contactHeading || 'Contact Us',
        quickLinks: Array.isArray(updated.quickLinks) ? updated.quickLinks : cleanedQuickLinks,
        legalLinks: [],
        socialLinks: Array.isArray(updated.socialLinks)
          ? updated.socialLinks.map((s) => ({
              label: s.label || '',
              url: s.url || '',
              iconUrl: s.iconUrl || '',
            }))
          : cleanedSocialLinks,
        copyrightText: updated.copyrightText || '© {year} {company}. All Rights Reserved.',
        isActive: updated.isActive !== undefined ? updated.isActive : true,
      });
    } catch (err) {
      console.error('Error saving footer configuration:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to save footer settings.';
      setFormErrors({ submit: errMsg });
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title="Footer Content CMS"
        description="Manage company details, contact information, navigation links, and legal disclosures shown in the website footer."
      />

      {loading ? (
        <Card className="p-6 space-y-4">
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      ) : error ? (
        <ErrorState
          title="Unable to load footer settings"
          message={error}
          onRetry={fetchFooterContent}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 font-medium flex items-center justify-between">
              <span>{successMessage}</span>
              <button
                type="button"
                onClick={() => setSuccessMessage('')}
                className="text-emerald-600 hover:text-emerald-900 font-bold"
              >
                &times;
              </button>
            </div>
          )}

          {formErrors.submit && <FormError message={formErrors.submit} />}

          {/* Company Info */}
          <Card className="p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
              <StatusBadge status={formData.isActive ? 'active' : 'inactive'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Company Name">
                <Input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g. Vinexus Premium Wines & Spirits"
                />
              </FormField>

              <FormField label="Footer Status">
                <label className="flex items-center space-x-3 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-wine-600 focus:ring-wine-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Display Footer Content</span>
                </label>
              </FormField>
            </div>

            <FormField label="Company Description">
              <Textarea
                value={formData.companyDescription}
                onChange={(e) => setFormData({ ...formData, companyDescription: e.target.value })}
                placeholder="Short bio/description rendered under the logo in the footer."
                rows={3}
              />
            </FormField>

            <FormField label="About Column Heading">
              <Input value={formData.aboutHeading} onChange={(e) => setFormData({ ...formData, aboutHeading: e.target.value })} placeholder="About" />
            </FormField>
          </Card>

          {/* Contact Details */}
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">Contact Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Corporate Email" error={formErrors.email}>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="support@vinexus.com"
                />
              </FormField>

              <FormField label="Phone Number">
                <Input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 8769959424"
                />
              </FormField>

              <FormField label="WhatsApp Enquiry Number (Cart Deep Link)">
                <Input
                  type="text"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="8769959424"
                />
              </FormField>

              <FormField
                label="WhatsApp Enquiry Closing Note"
                helperText="Custom closing message automatically attached at the end of the pre-filled enquiry message when customers click 'Enquire on WhatsApp' in the Shopping Cart (/cart)."
              >
                <Textarea
                  value={formData.whatsappMessageNote}
                  onChange={(e) => setFormData({ ...formData, whatsappMessageNote: e.target.value })}
                  placeholder="Please confirm live stock availability, delivery timeline & share official GST commercial invoice."
                  rows={2}
                />
              </FormField>
            </div>

            <FormField label="Physical Address / Headquarters">
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="100 Vineyard Way, Napa Valley, CA 94558"
                rows={2}
              />
            </FormField>

            <FormField label="Address Google Maps URL">
              <Input value={formData.mapUrl} onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })} placeholder="https://maps.app.goo.gl/..." />
            </FormField>
          </Card>

          {/* Footer Information Links — Quick + Legal merged into one */}
          <Card className="p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Footer Information Links</h3>
                <p className="text-xs text-gray-500">All links shown under the &quot;Information&quot; column in the footer. Max 7 per column — extras auto-wrap to a second column.</p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddQuickLink}>
                + Add Link
              </Button>
            </div>

            <FormField label="Column Heading">
              <Input value={formData.quickLinksHeading} onChange={(e) => setFormData({ ...formData, quickLinksHeading: e.target.value })} placeholder="Information" />
            </FormField>

            {formErrors.quickLinks && <FormError message={formErrors.quickLinks} />}

            {formData.quickLinks.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No links configured yet. Click &quot;+ Add Link&quot; to add one.</p>
            ) : (
              <div className="space-y-3">
                {formData.quickLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <span className="text-xs font-bold text-gray-400 w-6">#{idx + 1}</span>
                    <Input
                      type="text"
                      placeholder="Label (e.g. About Vinexus)"
                      value={link.label}
                      onChange={(e) => handleQuickLinkChange(idx, 'label', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="text"
                      placeholder="URL (e.g. /content/pages/about-us)"
                      value={link.url}
                      onChange={(e) => handleQuickLinkChange(idx, 'url', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveQuickLink(idx)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Social links and footer strip */}
          <Card className="p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Social Links & Footer Strip</h3>
                <p className="text-xs text-gray-500">Add any social platform or external contact link.</p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddSocialLink}>+ Add Social Link</Button>
            </div>

            <FormField label="Contact Column Heading">
              <Input value={formData.contactHeading} onChange={(e) => setFormData({ ...formData, contactHeading: e.target.value })} placeholder="Contact Us" />
            </FormField>

            {formErrors.socialLinks && <FormError message={formErrors.socialLinks} />}
            {formData.socialLinks.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No social links configured. Click &quot;+ Add Social Link&quot; to add one.</p>
            ) : (
              <div className="space-y-4">
                {formData.socialLinks.map((link, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Social Platform #{idx + 1}</span>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveSocialLink(idx)}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Platform Name</label>
                        <Input
                          placeholder="e.g. Instagram, Facebook, YouTube"
                          value={link.label}
                          onChange={(e) => handleSocialLinkChange(idx, 'label', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Profile URL</label>
                        <Input
                          placeholder="https://www.instagram.com/your-brand"
                          value={link.url}
                          onChange={(e) => handleSocialLinkChange(idx, 'url', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Platform Logo / Icon Upload */}
                    <div className="pt-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Platform Logo / Icon <span className="text-gray-400 font-normal">(Optional — upload image or SVG)</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        {link.iconUrl ? (
                          <div className="flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-md border border-gray-200 shadow-2xs">
                            <img
                              src={link.iconUrl}
                              alt={link.label || 'Social icon'}
                              className="w-6 h-6 object-contain rounded-xs"
                            />
                            <span className="text-xs text-gray-500 max-w-[200px] truncate">{link.iconUrl}</span>
                            <button
                              type="button"
                              onClick={() => handleSocialLinkChange(idx, 'iconUrl', '')}
                              className="text-red-500 hover:text-red-700 p-0.5 rounded cursor-pointer"
                              title="Remove logo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition shadow-2xs">
                              {uploadingSocialIndex === idx ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-wine-600" />
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="w-3.5 h-3.5 text-gray-500" />
                                  <span>Upload Logo Image</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingSocialIndex === idx}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadSocialIcon(idx, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            <span className="text-xs text-gray-400">or</span>
                            <input
                              type="text"
                              placeholder="Paste image URL directly"
                              value={link.iconUrl || ''}
                              onChange={(e) => handleSocialLinkChange(idx, 'iconUrl', e.target.value)}
                              className="text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md w-60 focus:ring-wine-500 focus:border-wine-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <FormField label="Copyright / Bottom Text">
              <Input value={formData.copyrightText} onChange={(e) => setFormData({ ...formData, copyrightText: e.target.value })} placeholder="All rights reserved." />
            </FormField>
          </Card>

          {/* Submit bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div>
              {justSaved && (
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Footer settings saved successfully!</span>
                </div>
              )}
              {formErrors.submit && (
                <span className="text-sm font-medium text-red-600">
                  {formErrors.submit}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={fetchFooterContent}
                disabled={saving}
              >
                Reset Changes
              </Button>
              <Button type="submit" isLoading={saving} size="lg">
                Save Footer Settings
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default AdminCmsFooterPage;
