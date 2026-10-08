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
import WhatsAppIcon from '../../components/ui/WhatsAppIcon';
import {
  UploadCloud,
  X,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Building2,
  Phone,
  Mail,
  Plus,
  Trash2,
} from 'lucide-react';

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
  const [uploadingBankQrIndex, setUploadingBankQrIndex] = useState(null);

  const [formData, setFormData] = useState({
    companyName: '',
    companyDescription: '',
    email: '',
    phone: '',
    whatsappNumber: '8769959424',
    whatsappMessageNote: 'Please confirm live stock availability, delivery timeline & share official GST commercial invoice.',
    phoneNumbers: [{ number: '', label: '' }],
    whatsappNumbers: [{ number: '8769959424', label: 'Primary' }],
    emails: [{ email: '', label: '' }],
    bankAccounts: [],
    bankDetailsHeading: 'Bank Details',
    showBankDetails: true,
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

      // Prepare phone numbers
      const phones = Array.isArray(data.phoneNumbers) && data.phoneNumbers.length > 0
        ? data.phoneNumbers.map((p) => ({ number: p.number || '', label: p.label || '' }))
        : (data.phone ? [{ number: data.phone, label: 'Primary' }] : [{ number: '', label: '' }]);

      // Prepare whatsapp numbers
      const whatsapps = Array.isArray(data.whatsappNumbers) && data.whatsappNumbers.length > 0
        ? data.whatsappNumbers.map((w) => ({ number: w.number || '', label: w.label || '' }))
        : (data.whatsappNumber ? [{ number: data.whatsappNumber, label: 'WhatsApp' }] : [{ number: '8769959424', label: 'Primary' }]);

      // Prepare emails
      const emailsList = Array.isArray(data.emails) && data.emails.length > 0
        ? data.emails.map((e) => ({ email: e.email || '', label: e.label || '' }))
        : (data.email ? [{ email: data.email, label: 'Primary' }] : [{ email: '', label: '' }]);

      // Prepare bank accounts
      const banks = Array.isArray(data.bankAccounts)
        ? data.bankAccounts.map((b) => ({
            accountName: b.accountName || '',
            bankName: b.bankName || '',
            accountNumber: b.accountNumber || '',
            ifscCode: b.ifscCode || '',
            branch: b.branch || '',
            accountType: b.accountType || 'Current Account',
            upiId: b.upiId || '',
            qrCodeUrl: b.qrCodeUrl || '',
          }))
        : [];

      setFormData({
        companyName: data.companyName || '',
        companyDescription: data.companyDescription || '',
        email: data.email || '',
        phone: data.phone || '',
        whatsappNumber: data.whatsappNumber || '8769959424',
        whatsappMessageNote: data.whatsappMessageNote || 'Please confirm live stock availability, delivery timeline & share official GST commercial invoice.',
        phoneNumbers: phones,
        whatsappNumbers: whatsapps,
        emails: emailsList,
        bankAccounts: banks,
        bankDetailsHeading: data.bankDetailsHeading || 'Bank Details',
        showBankDetails: data.showBankDetails !== undefined ? data.showBankDetails : true,
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

  // Phone numbers handlers
  const handlePhoneChange = (index, field, value) => {
    const updated = [...formData.phoneNumbers];
    updated[index][field] = value;
    setFormData({ ...formData, phoneNumbers: updated });
  };
  const handleAddPhone = () => {
    setFormData({
      ...formData,
      phoneNumbers: [...formData.phoneNumbers, { number: '', label: '' }],
    });
  };
  const handleRemovePhone = (index) => {
    const updated = formData.phoneNumbers.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      phoneNumbers: updated.length > 0 ? updated : [{ number: '', label: '' }],
    });
  };

  // WhatsApp numbers handlers
  const handleWhatsappChange = (index, field, value) => {
    const updated = [...formData.whatsappNumbers];
    updated[index][field] = value;
    setFormData({ ...formData, whatsappNumbers: updated });
  };
  const handleAddWhatsapp = () => {
    setFormData({
      ...formData,
      whatsappNumbers: [...formData.whatsappNumbers, { number: '', label: '' }],
    });
  };
  const handleRemoveWhatsapp = (index) => {
    const updated = formData.whatsappNumbers.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      whatsappNumbers: updated.length > 0 ? updated : [{ number: '', label: '' }],
    });
  };

  // Emails handlers
  const handleEmailChange = (index, field, value) => {
    const updated = [...formData.emails];
    updated[index][field] = value;
    setFormData({ ...formData, emails: updated });
  };
  const handleAddEmail = () => {
    setFormData({
      ...formData,
      emails: [...formData.emails, { email: '', label: '' }],
    });
  };
  const handleRemoveEmail = (index) => {
    const updated = formData.emails.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      emails: updated.length > 0 ? updated : [{ email: '', label: '' }],
    });
  };

  // Bank accounts handlers
  const handleBankAccountChange = (index, field, value) => {
    const updated = [...formData.bankAccounts];
    updated[index][field] = value;
    setFormData({ ...formData, bankAccounts: updated });
  };
  const handleAddBankAccount = () => {
    setFormData({
      ...formData,
      bankAccounts: [
        ...formData.bankAccounts,
        {
          accountName: '',
          bankName: '',
          accountNumber: '',
          ifscCode: '',
          branch: '',
          accountType: 'Current Account',
          upiId: '',
          qrCodeUrl: '',
        },
      ],
    });
  };
  const handleRemoveBankAccount = (index) => {
    setFormData({
      ...formData,
      bankAccounts: formData.bankAccounts.filter((_, i) => i !== index),
    });
  };

  // Bank QR Code upload handler
  const handleUploadBankQr = async (index, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WEBP, SVG).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('QR code file size must be less than 2MB.');
      return;
    }
    try {
      setUploadingBankQrIndex(index);
      const res = await uploadService.uploadImage(file, 'vinexus/bank-qr');
      if (res.success && res.data?.url) {
        handleBankAccountChange(index, 'qrCodeUrl', res.data.url);
        toast.success('Bank QR Code uploaded successfully!');
      } else {
        toast.error(res.message || 'Failed to upload QR code.');
      }
    } catch (err) {
      console.error('Error uploading bank QR code:', err);
      toast.error(err.response?.data?.message || 'Error uploading bank QR code.');
    } finally {
      setUploadingBankQrIndex(null);
    }
  };

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
    // Validate email inputs
    formData.emails.forEach((em, idx) => {
      if (em.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.email.trim())) {
        errors[`email_${idx}`] = `Email #${idx + 1} has an invalid format.`;
      }
    });

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

      // Clean phone numbers
      const cleanedPhoneNumbers = formData.phoneNumbers
        .filter((p) => p.number && p.number.trim())
        .map((p) => ({ number: p.number.trim(), label: (p.label || '').trim() }));

      // Clean WhatsApp numbers
      const cleanedWhatsappNumbers = formData.whatsappNumbers
        .filter((w) => w.number && w.number.trim())
        .map((w) => ({ number: w.number.trim(), label: (w.label || '').trim() }));

      // Clean emails
      const cleanedEmails = formData.emails
        .filter((e) => e.email && e.email.trim())
        .map((e) => ({ email: e.email.trim().toLowerCase(), label: (e.label || '').trim() }));

      // Clean bank accounts
      const cleanedBankAccounts = formData.bankAccounts
        .filter((b) => b.accountName?.trim() || b.bankName?.trim() || b.accountNumber?.trim() || b.ifscCode?.trim() || b.upiId?.trim() || b.qrCodeUrl?.trim())
        .map((b) => ({
          accountName: (b.accountName || '').trim(),
          bankName: (b.bankName || '').trim(),
          accountNumber: (b.accountNumber || '').trim(),
          ifscCode: (b.ifscCode || '').trim().toUpperCase(),
          branch: (b.branch || '').trim(),
          accountType: (b.accountType || 'Current Account').trim(),
          upiId: (b.upiId || '').trim(),
          qrCodeUrl: (b.qrCodeUrl || '').trim(),
        }));

      const primaryPhone = cleanedPhoneNumbers[0]?.number || (formData.phone ? formData.phone.trim() : '');
      const primaryWhatsapp = cleanedWhatsappNumbers[0]?.number || (formData.whatsappNumber ? formData.whatsappNumber.trim() : '8769959424');
      const primaryEmail = cleanedEmails[0]?.email || (formData.email ? formData.email.trim() : '');

      const payload = {
        companyName: formData.companyName.trim(),
        companyDescription: formData.companyDescription.trim(),
        email: primaryEmail,
        phone: primaryPhone,
        whatsappNumber: primaryWhatsapp,
        whatsappMessageNote: formData.whatsappMessageNote ? formData.whatsappMessageNote.trim() : '',
        phoneNumbers: cleanedPhoneNumbers,
        whatsappNumbers: cleanedWhatsappNumbers,
        emails: cleanedEmails,
        bankAccounts: cleanedBankAccounts,
        bankDetailsHeading: formData.bankDetailsHeading ? formData.bankDetailsHeading.trim() : 'Bank Details',
        showBankDetails: Boolean(formData.showBankDetails),
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
        phoneNumbers: Array.isArray(updated.phoneNumbers) && updated.phoneNumbers.length > 0
          ? updated.phoneNumbers
          : (cleanedPhoneNumbers.length > 0 ? cleanedPhoneNumbers : [{ number: '', label: '' }]),
        whatsappNumbers: Array.isArray(updated.whatsappNumbers) && updated.whatsappNumbers.length > 0
          ? updated.whatsappNumbers
          : (cleanedWhatsappNumbers.length > 0 ? cleanedWhatsappNumbers : [{ number: '8769959424', label: 'Primary' }]),
        emails: Array.isArray(updated.emails) && updated.emails.length > 0
          ? updated.emails
          : (cleanedEmails.length > 0 ? cleanedEmails : [{ email: '', label: '' }]),
        bankAccounts: Array.isArray(updated.bankAccounts) ? updated.bankAccounts : cleanedBankAccounts,
        bankDetailsHeading: updated.bankDetailsHeading || 'Bank Details',
        showBankDetails: updated.showBankDetails !== undefined ? updated.showBankDetails : true,
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
          <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                <p className="text-xs text-gray-500">Configure corporate emails, direct phone numbers, and WhatsApp channels shown in the footer.</p>
              </div>
              <div className="w-full sm:w-64">
                <FormField label="Contact Column Heading">
                  <Input
                    value={formData.contactHeading}
                    onChange={(e) => setFormData({ ...formData, contactHeading: e.target.value })}
                    placeholder="Contact Us"
                  />
                </FormField>
              </div>
            </div>

            {/* 1. Phone Numbers (Multiple) */}
            <div className="space-y-3 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-wine-600" />
                  <h4 className="text-sm font-semibold text-gray-900">Phone Numbers</h4>
                  <span className="text-xs text-gray-400">({formData.phoneNumbers.length})</span>
                </div>
                <Button type="button" variant="secondary" size="xs" onClick={handleAddPhone} className="flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Phone</span>
                </Button>
              </div>
              <p className="text-xs text-gray-500">Add phone numbers with optional department labels (e.g., Sales, Customer Support, Toll-Free).</p>

              <div className="space-y-2.5 pt-1">
                {formData.phoneNumbers.map((phoneItem, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs">
                    <span className="text-xs font-bold text-gray-400 w-5 text-center">#{idx + 1}</span>
                    <Input
                      type="text"
                      placeholder="Phone (e.g. +91 8003923316)"
                      value={phoneItem.number}
                      onChange={(e) => handlePhoneChange(idx, 'number', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="text"
                      placeholder="Label (e.g. Sales / Support)"
                      value={phoneItem.label}
                      onChange={(e) => handlePhoneChange(idx, 'label', e.target.value)}
                      className="w-44 sm:w-56"
                    />
                    {formData.phoneNumbers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhone(idx)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition cursor-pointer"
                        title="Remove phone"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 2. WhatsApp Numbers (Multiple) */}
            <div className="space-y-3 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                  <h4 className="text-sm font-semibold text-gray-900">WhatsApp Numbers</h4>
                  <span className="text-xs text-gray-400">({formData.whatsappNumbers.length})</span>
                </div>
                <Button type="button" variant="secondary" size="xs" onClick={handleAddWhatsapp} className="flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add WhatsApp</span>
                </Button>
              </div>
              <p className="text-xs text-gray-500">Add WhatsApp numbers with labels for quick click-to-chat links. The WhatsApp icon is applied automatically.</p>

              <div className="space-y-2.5 pt-1">
                {formData.whatsappNumbers.map((waItem, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs">
                    <span className="text-xs font-bold text-gray-400 w-5 text-center">#{idx + 1}</span>
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]"
                      title="WhatsApp icon is added automatically"
                    >
                      <WhatsAppIcon className="h-5 w-5" />
                    </span>
                    <Input
                      type="text"
                      placeholder="WhatsApp No. (e.g. 8769959424)"
                      value={waItem.number}
                      onChange={(e) => handleWhatsappChange(idx, 'number', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="text"
                      placeholder="Label (e.g. Sales Enquiry / Orders)"
                      value={waItem.label}
                      onChange={(e) => handleWhatsappChange(idx, 'label', e.target.value)}
                      className="w-44 sm:w-56"
                    />
                    {formData.whatsappNumbers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveWhatsapp(idx)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition cursor-pointer"
                        title="Remove WhatsApp"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <FormField
                  label="WhatsApp Enquiry Closing Note"
                  helperText="Custom closing message automatically attached at the end of pre-filled enquiry messages when customers click 'Enquire on WhatsApp' in the Shopping Cart (/cart)."
                >
                  <Textarea
                    value={formData.whatsappMessageNote}
                    onChange={(e) => setFormData({ ...formData, whatsappMessageNote: e.target.value })}
                    placeholder="Please confirm live stock availability, delivery timeline & share official GST commercial invoice."
                    rows={2}
                  />
                </FormField>
              </div>
            </div>

            {/* 3. Corporate Email Addresses (Multiple) */}
            <div className="space-y-3 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-gray-900">Corporate Email Addresses</h4>
                  <span className="text-xs text-gray-400">({formData.emails.length})</span>
                </div>
                <Button type="button" variant="secondary" size="xs" onClick={handleAddEmail} className="flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Email</span>
                </Button>
              </div>
              <p className="text-xs text-gray-500">Add corporate emails with labels (e.g., Sales & Quotations, Support, Billing).</p>

              <div className="space-y-2.5 pt-1">
                {formData.emails.map((emailItem, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs">
                      <span className="text-xs font-bold text-gray-400 w-5 text-center">#{idx + 1}</span>
                      <Input
                        type="email"
                        placeholder="Email (e.g. support@vinexus.com)"
                        value={emailItem.email}
                        onChange={(e) => handleEmailChange(idx, 'email', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="text"
                        placeholder="Label (e.g. Customer Support)"
                        value={emailItem.label}
                        onChange={(e) => handleEmailChange(idx, 'label', e.target.value)}
                        className="w-44 sm:w-56"
                      />
                      {formData.emails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(idx)}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition cursor-pointer"
                          title="Remove email"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {formErrors[`email_${idx}`] && (
                      <span className="text-xs text-red-600 pl-8">{formErrors[`email_${idx}`]}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Physical Address & Google Maps URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-gray-100">
              <FormField label="Physical Address / Headquarters">
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="100 Vineyard Way, Napa Valley, CA 94558"
                  rows={2}
                />
              </FormField>

              <FormField label="Address Google Maps URL">
                <Input
                  value={formData.mapUrl}
                  onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                  placeholder="https://maps.app.goo.gl/..."
                />
              </FormField>
            </div>
          </Card>

          {/* Bank Account Details Card */}
          <Card className="p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Bank Account Details (NEFT / RTGS / IMPS / UPI)</h3>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Display company bank accounts directly in the website footer for direct client & dealer wire transfers.
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddBankAccount} className="flex items-center gap-1.5 self-start sm:self-auto">
                <Plus className="w-4 h-4" />
                <span>Add Bank Account</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Display Bank Details in Footer">
                <label className="flex items-center space-x-2 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showBankDetails}
                    onChange={(e) => setFormData({ ...formData, showBankDetails: e.target.checked })}
                    className="h-4 w-4 text-wine-600 focus:ring-wine-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Bank Details in Website Footer</span>
                </label>
              </FormField>

              <FormField label="Bank Section Heading">
                <Input
                  value={formData.bankDetailsHeading}
                  onChange={(e) => setFormData({ ...formData, bankDetailsHeading: e.target.value })}
                  placeholder="Bank Details"
                />
              </FormField>
            </div>

            {formData.bankAccounts.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">No bank accounts configured</p>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Click &quot;Add Bank Account&quot; above to add your official company bank details (A/C No, IFSC, UPI ID, QR Code) to the footer.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={handleAddBankAccount} className="mt-3">
                  + Add First Bank Account
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.bankAccounts.map((account, idx) => (
                  <div key={idx} className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-semibold text-gray-900">
                          {account.bankName ? `${account.bankName} Account` : `Bank Account #${idx + 1}`}
                        </h4>
                      </div>
                      <Button
                        type="button"
                        variant="danger"
                        size="xs"
                        onClick={() => handleRemoveBankAccount(idx)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Account</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Beneficiary / Account Holder Name</label>
                        <Input
                          placeholder="e.g. Vinexus Technologies Pvt Ltd"
                          value={account.accountName}
                          onChange={(e) => handleBankAccountChange(idx, 'accountName', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Bank Name</label>
                        <Input
                          placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India"
                          value={account.bankName}
                          onChange={(e) => handleBankAccountChange(idx, 'bankName', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Account Number</label>
                        <Input
                          placeholder="e.g. 50200012345678"
                          value={account.accountNumber}
                          onChange={(e) => handleBankAccountChange(idx, 'accountNumber', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">IFSC Code</label>
                        <Input
                          placeholder="e.g. HDFC0001234"
                          value={account.ifscCode}
                          onChange={(e) => handleBankAccountChange(idx, 'ifscCode', e.target.value.toUpperCase())}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Account Type</label>
                        <select
                          value={account.accountType}
                          onChange={(e) => handleBankAccountChange(idx, 'accountType', e.target.value)}
                          className="w-full text-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-wine-600 focus:outline-hidden focus:ring-1 focus:ring-wine-600"
                        >
                          <option value="Current Account">Current Account</option>
                          <option value="Savings Account">Savings Account</option>
                          <option value="Cash Credit (CC)">Cash Credit (CC)</option>
                          <option value="Overdraft (OD)">Overdraft (OD)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Branch / City</label>
                        <Input
                          placeholder="e.g. Tonk Road, Jaipur"
                          value={account.branch}
                          onChange={(e) => handleBankAccountChange(idx, 'branch', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">UPI ID / VPA (Optional)</label>
                        <Input
                          placeholder="e.g. vinexus@hdfcbank"
                          value={account.upiId}
                          onChange={(e) => handleBankAccountChange(idx, 'upiId', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* QR Code Upload */}
                    <div className="pt-1 border-t border-gray-200">
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Payment / UPI QR Code Image <span className="text-gray-400 font-normal">(Optional — scan to pay directly)</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        {account.qrCodeUrl ? (
                          <div className="flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-md border border-gray-200 shadow-2xs">
                            <img
                              src={account.qrCodeUrl}
                              alt="Bank QR Code"
                              className="w-8 h-8 object-contain rounded-xs"
                            />
                            <span className="text-xs text-gray-500 max-w-[200px] truncate">{account.qrCodeUrl}</span>
                            <button
                              type="button"
                              onClick={() => handleBankAccountChange(idx, 'qrCodeUrl', '')}
                              className="text-red-500 hover:text-red-700 p-0.5 rounded cursor-pointer"
                              title="Remove QR code"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition shadow-2xs">
                              {uploadingBankQrIndex === idx ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-wine-600" />
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="w-3.5 h-3.5 text-gray-500" />
                                  <span>Upload QR Code Image</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingBankQrIndex === idx}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadBankQr(idx, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            <span className="text-xs text-gray-400">or</span>
                            <input
                              type="text"
                              placeholder="Paste QR image URL directly"
                              value={account.qrCodeUrl || ''}
                              onChange={(e) => handleBankAccountChange(idx, 'qrCodeUrl', e.target.value)}
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
